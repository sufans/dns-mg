import { requireAuth } from '../../_shared/auth';
import { jsonResponse } from '../../_shared/response';
import { CSRF_COOKIE, SESSION_COOKIE, serializeCookie } from '../../_shared/cookies';
import { randomToken, signJwt } from '../../_shared/jwt';
import type { Env } from '../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const csrf = randomToken(32);
  const token = await signJwt({ username: auth.username, csrf }, env.JWT_SECRET, 24 * 60 * 60);
  const headers = new Headers();
  headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, token, { httpOnly: true, maxAge: 86400 }));
  headers.append('Set-Cookie', serializeCookie(CSRF_COOKIE, csrf, { httpOnly: false, maxAge: 86400 }));
  return jsonResponse({ username: auth.username, csrf, expiresIn: 86400 }, { headers });
};
