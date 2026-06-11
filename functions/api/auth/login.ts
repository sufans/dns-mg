import { loginSchema } from '../../_shared/validators';
import { errorResponse, jsonResponse } from '../../_shared/response';
import { CSRF_COOKIE, SESSION_COOKIE, serializeCookie } from '../../_shared/cookies';
import { randomToken, signJwt } from '../../_shared/jwt';
import { assertLoginAllowed, clientIp, recordLoginFailure, recordLoginSuccess } from '../../_shared/rate-limit';
import { logOperation } from '../../_shared/logger';
import { verifyAdminPassword } from '../../_shared/auth';
import type { Env } from '../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request);
  try {
    await assertLoginAllowed(env, ip);
    const input = loginSchema.parse(await request.json());
    if (input.username !== env.ADMIN_USERNAME || !(await verifyAdminPassword(input.password, env))) {
      await recordLoginFailure(env, ip);
      await logOperation(env, request, null, { action: 'auth.login.failed', success: false, errorMessage: 'invalid credentials' });
      return errorResponse('用户名或密码错误', 401, 'invalid_credentials');
    }
    const csrf = randomToken(32);
    const token = await signJwt({ username: input.username, csrf }, env.JWT_SECRET, 24 * 60 * 60);
    await recordLoginSuccess(env, ip);
    await logOperation(env, request, { username: input.username, csrf, iat: 0, exp: 0 }, { action: 'auth.login.success', success: true });
    const headers = new Headers();
    headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, token, { httpOnly: true, maxAge: 86400 }));
    headers.append('Set-Cookie', serializeCookie(CSRF_COOKIE, csrf, { httpOnly: false, maxAge: 86400 }));
    return jsonResponse({ username: input.username, csrf, expiresIn: 86400 }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败';
    return errorResponse(message, 429, 'login_locked');
  }
};
