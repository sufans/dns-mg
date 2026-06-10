import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import bcrypt from 'bcryptjs';
import type { Env, PagesFunction, EventContext, AuthenticatedEventContext } from './types';
import { createResponse } from './utils';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function signJWT(
  payload: { sub: string },
  secret: string,
  expiresIn: string = '24h',
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<{ sub: string; iat: number; exp: number }> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['HS256'],
  });
  return payload as { sub: string; iat: number; exp: number };
}

export async function verifyJWTWithGrace(
  token: string,
  secret: string,
  graceSeconds: number = 300,
): Promise<{ sub: string; iat: number; exp: number } | null> {
  try {
    return await verifyJWT(token, secret);
  } catch (err: unknown) {
    if (err instanceof joseErrors.JWTExpired) {
      try {
        const key = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['HS256'],
          clockTolerance: graceSeconds,
        });
        return payload as { sub: string; iat: number; exp: number };
      } catch {
        // Token expired beyond grace period
        return null;
      }
    }
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function getFailedLoginAttempts(
  db: D1Database,
  ip: string,
): Promise<{ count: number; lastAttemptAt: string | null }> {
  const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count, MAX(created_at) as last_attempt_at
       FROM operation_logs
       WHERE action = 'login_failed'
         AND ip_address = ?
         AND created_at > ?`,
    )
    .bind(ip, cutoff)
    .first<{ count: number; last_attempt_at: string | null }>();

  return {
    count: result?.count ?? 0,
    lastAttemptAt: result?.last_attempt_at ?? null,
  };
}

export async function recordFailedLogin(
  db: D1Database,
  ip: string,
  userAgent: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, error_message, created_at)
       VALUES ('login_failed', 'system', NULL, 'Login attempt failed', ?, ?, 'failed', 'Invalid credentials', datetime('now'))`,
    )
    .bind(ip, userAgent)
    .run();
}

export async function clearFailedLogins(
  db: D1Database,
  ip: string,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM operation_logs
       WHERE action = 'login_failed'
         AND ip_address = ?`,
    )
    .bind(ip)
    .run();
}

export function isAccountLocked(failedCount: number): boolean {
  return failedCount >= MAX_FAILED_ATTEMPTS;
}

export function getRemainingAttempts(failedCount: number): number {
  return Math.max(0, MAX_FAILED_ATTEMPTS - failedCount);
}

export function getUnlockTime(lastAttemptAt: string | null): string | null {
  if (!lastAttemptAt) return null;
  const last = new Date(lastAttemptAt);
  const unlock = new Date(last.getTime() + LOCKOUT_MINUTES * 60 * 1000);
  return unlock.toISOString();
}

type AuthenticatedHandler = (
  context: AuthenticatedEventContext,
) => Response | Promise<Response>;

export function requireAuth(handler: AuthenticatedHandler): PagesFunction {
  return async (context: EventContext<Env, string, Record<string, unknown>>) => {
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createResponse(null, 401, '缺少认证令牌');
    }

    const token = authHeader.slice(7);
    if (!token) {
      return createResponse(null, 401, '认证令牌为空');
    }

    try {
      const payload = await verifyJWT(token, context.env.JWT_SECRET);
      const authenticatedContext = Object.assign({}, context, {
        data: { user: { sub: payload.sub } },
      }) as AuthenticatedEventContext;
      return handler(authenticatedContext);
    } catch {
      return createResponse(null, 401, '认证令牌无效或已过期');
    }
  };
}
