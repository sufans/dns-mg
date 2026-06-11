import bcrypt from 'bcryptjs';
import { CSRF_COOKIE, SESSION_COOKIE, parseCookies } from './cookies';
import { errorResponse } from './response';
import { verifyJwt } from './jwt';
import type { AuthContext, Env } from './types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function getAuthContext(request: Request, env: Env): Promise<AuthContext | null> {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verifyJwt(token, env.JWT_SECRET);
}

function sameOrigin(request: Request, origin: string | undefined): boolean {
  if (!origin) return true;
  const actualOrigin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  if (actualOrigin && actualOrigin !== origin) return false;
  if (!actualOrigin && referer && !referer.startsWith(origin)) return false;
  return true;
}

export async function requireAuth(request: Request, env: Env): Promise<AuthContext | Response> {
  const auth = await getAuthContext(request, env);
  if (!auth) return errorResponse('登录状态已失效', 401, 'unauthorized');

  if (!SAFE_METHODS.has(request.method)) {
    if (!sameOrigin(request, env.APP_ORIGIN)) return errorResponse('CSRF 来源校验失败', 403, 'csrf_origin_failed');
    const cookies = parseCookies(request);
    const csrfHeader = request.headers.get('X-CSRF-Token');
    if (!csrfHeader || csrfHeader !== cookies[CSRF_COOKIE] || csrfHeader !== auth.csrf) {
      return errorResponse('CSRF Token 无效', 403, 'csrf_failed');
    }
  }
  return auth;
}

export async function verifyAdminPassword(password: string, env: Env): Promise<boolean> {
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_PASSWORD_HASH.startsWith('$2')) return false;
  return bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
}

export async function requireSecondVerification(password: string | undefined, env: Env): Promise<Response | null> {
  if (!password) return errorResponse('敏感操作需要二次验证管理员密码', 403, 'second_verification_required');
  const valid = await verifyAdminPassword(password, env);
  if (!valid) return errorResponse('二次验证失败', 403, 'second_verification_failed');
  return null;
}
