import { requireAuth } from '../../_shared/auth';
import { jsonResponse } from '../../_shared/response';
import type { Env } from '../../_shared/types';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  return jsonResponse({ username: auth.username, csrf: auth.csrf, exp: auth.exp });
};
