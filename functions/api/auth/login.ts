import { z } from 'zod';
import type { PagesFunction } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import {
  signJWT,
  verifyPassword,
  getFailedLoginAttempts,
  recordFailedLogin,
  clearFailedLogins,
  isAccountLocked,
  getRemainingAttempts,
  getUnlockTime,
} from '../../_shared/auth';

const LOCKOUT_MINUTES = 15;

const LoginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const onRequestPost: PagesFunction = withCors(async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return createResponse(null, 400, '请求体格式错误');
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return createResponse(null, 400, firstError?.message ?? '输入验证失败');
  }

  const { username, password } = parsed.data;
  const ip = getClientIP(context.request);
  const userAgent = context.request.headers.get('User-Agent');

  // Check if account is locked due to too many failed attempts
  const { count: failedCount, lastAttemptAt } = await getFailedLoginAttempts(context.env.DB, ip);
  if (isAccountLocked(failedCount)) {
    const unlockTime = getUnlockTime(lastAttemptAt);
    return createResponse(
      { unlockTime, remainingMinutes: LOCKOUT_MINUTES },
      429,
      '登录尝试次数过多，请稍后再试',
    );
  }

  // Verify credentials
  const usernameMatch = username === context.env.ADMIN_USERNAME;
  const passwordMatch = usernameMatch && verifyPassword(password, context.env.ADMIN_PASSWORD_HASH);

  if (!usernameMatch || !passwordMatch) {
    await recordFailedLogin(context.env.DB, ip, userAgent);
    const newFailedCount = failedCount + 1;
    const remaining = getRemainingAttempts(newFailedCount);

    if (isAccountLocked(newFailedCount)) {
      const unlockTime = getUnlockTime(new Date().toISOString());
      return createResponse(
        { unlockTime, remainingMinutes: LOCKOUT_MINUTES },
        429,
        '登录尝试次数过多，账号已锁定',
      );
    }

    return createResponse({ remainingAttempts: remaining }, 401, '用户名或密码错误');
  }

  // Clear failed login attempts on successful login
  await clearFailedLogins(context.env.DB, ip);

  // Sign JWT
  const token = await signJWT({ sub: 'admin' }, context.env.JWT_SECRET, '24h');

  // Log successful login
  await context.env.DB
    .prepare(
      `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
       VALUES ('login', 'system', NULL, '管理员登录成功', ?, ?, 'success', datetime('now'))`,
    )
    .bind(ip, userAgent)
    .run();

  return createResponse({ token, expiresIn: 86400 }, 200, '登录成功');
});
