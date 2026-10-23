import type { Env } from './types';

const LOCK_SECONDS = 15 * 60;
const MAX_FAILS = 5;

export function clientIp(request: Request): string {
  // CF-Connecting-IP is set by Cloudflare and cannot be spoofed by clients.
  // X-Forwarded-For is only a local-development fallback and must not be trusted in production.
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp.trim();
  const forwarded = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();
  return forwarded || '0.0.0.0';
}

/**
 * Builds the login-attempt key. Combining IP and username means an attacker
 * rotating source IPs can no longer reset the failure counter for a target
 * account, and one account's failures cannot lock out others.
 * The value is stored in the existing `login_attempts.ip` column, so no
 * schema migration is required.
 */
export function loginKey(ip: string, username: string): string {
  return `${ip}|${username.trim().toLowerCase()}`;
}

export class LoginLockedError extends Error {
  constructor(public readonly minutes: number) {
    super(`登录失败次数过多，请 ${minutes} 分钟后再试`);
    this.name = 'LoginLockedError';
  }
}

export async function assertLoginAllowed(env: Env, ip: string, username: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT fail_count, locked_until FROM login_attempts WHERE ip = ?')
    .bind(loginKey(ip, username))
    .first<{ fail_count: number; locked_until: number }>();
  if (row && row.locked_until > now) {
    throw new LoginLockedError(Math.ceil((row.locked_until - now) / 60));
  }
}

export async function recordLoginSuccess(env: Env, ip: string, username: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(loginKey(ip, username)).run();
}

export async function recordLoginFailure(env: Env, ip: string, username: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const key = loginKey(ip, username);
  const lockUntil = now + LOCK_SECONDS;
  // Single atomic upsert: concurrent failures can no longer race past MAX_FAILS.
  await env.DB.prepare(
    `INSERT INTO login_attempts (ip, fail_count, locked_until, last_attempt_at)
     VALUES (?, 1, 0, ?)
     ON CONFLICT(ip) DO UPDATE SET
       fail_count = login_attempts.fail_count + 1,
       locked_until = CASE WHEN login_attempts.fail_count + 1 >= ? THEN ? ELSE login_attempts.locked_until END,
       last_attempt_at = excluded.last_attempt_at`
  )
    .bind(key, now, MAX_FAILS, lockUntil)
    .run();
}

export async function reservePlatformRequest(env: Env, accountId: number, limit: number, windowSeconds: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `${Math.floor(now / windowSeconds)}`;
  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
  // Atomic conditional upsert: the increment only happens while the counter is
  // still below the limit, so concurrent requests cannot overshoot. A `null`
  // result means the update was skipped because the bucket is exhausted.
  const row = await env.DB.prepare(
    `INSERT INTO api_rate_limits (account_id, bucket_key, request_count, reset_at, updated_at)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(account_id, bucket_key) DO UPDATE SET
       request_count = api_rate_limits.request_count + 1,
       updated_at = excluded.updated_at
     WHERE api_rate_limits.request_count < ?
     RETURNING request_count`
  )
    .bind(accountId, bucket, resetAt, now, limit)
    .first<{ request_count: number }>();
  if (!row) {
    throw new Error(`平台账号限流中，请在 ${Math.max(resetAt - now, 1)} 秒后重试`);
  }
}

export async function cleanupRateLimits(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('DELETE FROM api_rate_limits WHERE reset_at < ?').bind(now - 60).run();
}
