import { requireAuth } from '../../_shared/auth';
import { clearDomainCache } from '../../_shared/domain-cache';
import { logOperation } from '../../_shared/logger';
import { jsonResponse } from '../../_shared/response';
import type { Env } from '../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const body = (await request.json().catch(() => ({}))) as { accountId?: number };
  await clearDomainCache(env, body.accountId);
  await logOperation(env, request, auth, { action: 'domain.cache.clear', targetType: 'domain_cache', targetId: body.accountId ? String(body.accountId) : 'all', success: true });
  return jsonResponse({ refreshed: true });
};
