import { requireAuth } from '../../_shared/auth';
import { clearCookie, CSRF_COOKIE, SESSION_COOKIE } from '../../_shared/cookies';
import { jsonResponse } from '../../_shared/response';
import { logOperation } from '../../_shared/logger';
import type { Env } from '../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  const user = auth instanceof Response ? null : auth;
  if (!(auth instanceof Response)) await logOperation(env, request, user, { action: 'auth.logout', success: true });
  const headers = new Headers();
  headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
  headers.append('Set-Cookie', clearCookie(CSRF_COOKIE));
  return jsonResponse({ ok: true }, { headers });
};
