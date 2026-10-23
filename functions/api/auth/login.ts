import { loginSchema } from '../../_shared/validators';
import { errorResponse, jsonResponse } from '../../_shared/response';
import { CSRF_COOKIE, serializeCookie, sessionCookieName } from '../../_shared/cookies';
import { randomToken, signJwt } from '../../_shared/jwt';
import { assertLoginAllowed, clientIp, LoginLockedError, recordLoginFailure, recordLoginSuccess } from '../../_shared/rate-limit';
import { logOperation } from '../../_shared/logger';
import { verifyAdminPassword } from '../../_shared/auth';
import { ZodError } from 'zod';
import type { Env } from '../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request);
  try {
    const input = loginSchema.parse(await request.json());
    await assertLoginAllowed(env, ip, input.username);
    if (input.username !== env.ADMIN_USERNAME || !(await verifyAdminPassword(input.password, env))) {
      await recordLoginFailure(env, ip, input.username);
      await logOperation(env, request, null, { action: 'auth.login.failed', success: false, errorMessage: 'invalid credentials' });
      return errorResponse('用户名或密码错误', 401, 'invalid_credentials');
    }
    const csrf = randomToken(32);
    const token = await signJwt({ username: input.username, csrf }, env.JWT_SECRET, 24 * 60 * 60);
    await recordLoginSuccess(env, ip, input.username);
    await logOperation(env, request, { username: input.username, csrf, iat: 0, exp: 0 }, { action: 'auth.login.success', success: true });
    const headers = new Headers();
    const secure = new URL(request.url).protocol === 'https:';
    headers.append('Set-Cookie', serializeCookie(sessionCookieName(request), token, { httpOnly: true, maxAge: 86400, secure }));
    headers.append('Set-Cookie', serializeCookie(CSRF_COOKIE, csrf, { httpOnly: false, maxAge: 86400, secure }));
    return jsonResponse({ username: input.username, csrf, expiresIn: 86400 }, { headers });
  } catch (error) {
    if (error instanceof LoginLockedError) {
      return errorResponse(error.message, 429, 'login_locked');
    }
    if (error instanceof ZodError) {
      return errorResponse(`请求参数校验失败: ${error.issues.map((i) => i.message).join('; ')}`, 400, 'validation_error');
    }
    await logOperation(env, request, null, { action: 'auth.login.error', success: false, errorMessage: error instanceof Error ? error.message : 'unknown' });
    return errorResponse('服务器内部错误', 500, 'internal_error');
  }
};
