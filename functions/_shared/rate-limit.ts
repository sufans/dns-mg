import type { Env } from './types';

const LOCK_SECONDS = 15 * 60;
const MAX_FAILS = 5;

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? '0.0.0.0';
}

export async function assertLoginAllowed(env: Env, ip: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT fail_count, locked_until FROM login_attempts WHERE ip = ?').bind(ip).first<{
    fail_count: number;
    locked_until: number;
  }>();
  if (row && row.locked_until > now) {
    const minutes = Math.ceil((row.locked_until - now) / 60);
    throw new Error(`登录失败次数过多，请 ${minutes} 分钟后再试`);
  }
}

export async function recordLoginSuccess(env: Env, ip: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
}

export async function recordLoginFailure(env: Env, ip: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT fail_count FROM login_attempts WHERE ip = ?').bind(ip).first<{ fail_count: number }>();
  const fails = (row?.fail_count ?? 0) + 1;
  const lockedUntil = fails >= MAX_FAILS ? now + LOCK_SECONDS : 0;
  await env.DB.prepare(
    `INSERT INTO login_attempts (ip, fail_count, locked_until, last_attempt_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(ip) DO UPDATE SET fail_count = excluded.fail_count, locked_until = excluded.locked_until, last_attempt_at = excluded.last_attempt_at`
  )
    .bind(ip, fails, lockedUntil, now)
    .run();
}

export async function reservePlatformRequest(env: Env, accountId: number, limit: number, windowSeconds: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `${Math.floor(now / windowSeconds)}`;
  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
  const row = await env.DB.prepare('SELECT request_count FROM api_rate_limits WHERE account_id = ? AND bucket_key = ?')
    .bind(accountId, bucket)
    .first<{ request_count: number }>();
  if ((row?.request_count ?? 0) >= limit) {
    throw new Error(`平台账号限流中，请在 ${Math.max(resetAt - now, 1)} 秒后重试`);
  }
  await env.DB.prepare(
    `INSERT INTO api_rate_limits (account_id, bucket_key, request_count, reset_at, updated_at)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(account_id, bucket_key) DO UPDATE SET request_count = request_count + 1, updated_at = excluded.updated_at`
  )
    .bind(accountId, bucket, resetAt, now)
    .run();
}

export async function cleanupRateLimits(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('DELETE FROM api_rate_limits WHERE reset_at < ?').bind(now - 60).run();
}
