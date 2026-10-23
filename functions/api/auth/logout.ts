import { requireAuth } from '../../_shared/auth';
import { clearCookie, CSRF_COOKIE, sessionCookieName } from '../../_shared/cookies';
import { jsonResponse } from '../../_shared/response';
import { logOperation } from '../../_shared/logger';
import type { Env } from '../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  const user = auth instanceof Response ? null : auth;
  if (!(auth instanceof Response)) await logOperation(env, request, user, { action: 'auth.logout', success: true });
  const headers = new Headers();
  // Clear both possible session cookie names so logout works regardless of which
  // name was set (HTTPS `__Host-` or local HTTP fallback).
  const secure = new URL(request.url).protocol === 'https:';
  headers.append('Set-Cookie', clearCookie(sessionCookieName(request), secure));
  headers.append('Set-Cookie', clearCookie(CSRF_COOKIE, secure));
  return jsonResponse({ ok: true }, { headers });
};
