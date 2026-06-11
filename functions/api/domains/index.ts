import { requireAuth } from '../../_shared/auth';
import { decryptAccountConfig, listAccountRows } from '../../_shared/db';
import { readDomainCache, writeDomainCache } from '../../_shared/domain-cache';
import { logOperation } from '../../_shared/logger';
import { adapterForAccount } from '../../_shared/platforms/factory';
import { cleanupRateLimits, reservePlatformRequest } from '../../_shared/rate-limit';
import { jsonResponse } from '../../_shared/response';
import type { Env, UnifiedDomain } from '../../_shared/types';

function matchesFilters(domain: UnifiedDomain, params: URLSearchParams): boolean {
  const platform = params.get('platform');
  const groupId = params.get('groupId');
  const keyword = params.get('keyword')?.toLowerCase();
  const status = params.get('status');
  const expiresFrom = params.get('expiresFrom');
  const expiresTo = params.get('expiresTo');
  if (platform && domain.platform !== platform) return false;
  if (groupId && String(domain.groupId ?? '') !== groupId) return false;
  if (keyword && !domain.name.toLowerCase().includes(keyword)) return false;
  if (status === 'expired' && !domain.expired) return false;
  if (status === 'active' && domain.expired) return false;
  if (expiresFrom && (!domain.expiresAt || new Date(domain.expiresAt).getTime() < new Date(expiresFrom).getTime())) return false;
  if (expiresTo && (!domain.expiresAt || new Date(domain.expiresAt).getTime() > new Date(expiresTo).getTime())) return false;
  return true;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  await cleanupRateLimits(env);
  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === '1';
  const accounts = await listAccountRows(env, true);
  const results: UnifiedDomain[] = [];
  const errors: Array<{ accountId: number; accountName: string; error: string }> = [];

  for (const row of accounts) {
    try {
      const cacheKey = 'domain-list';
      let domains = refresh ? null : await readDomainCache(env, row.id, cacheKey);
      if (!domains) {
        const adapter = adapterForAccount(row);
        await reservePlatformRequest(env, row.id, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
        const config = await decryptAccountConfig(env, row);
        domains = await adapter.listDomains({ platform: row.platform, config }, { page: 1, size: 100 });
        await writeDomainCache(env, row.id, cacheKey, domains, 5 * 60);
      }
      results.push(...domains.filter((domain) => matchesFilters(domain, url.searchParams)));
    } catch (error) {
      errors.push({ accountId: row.id, accountName: row.name, error: error instanceof Error ? error.message : '未知错误' });
    }
  }
  const sorted = results.sort((a, b) => (a.remainingDays ?? 999999) - (b.remainingDays ?? 999999));
  await logOperation(env, request, auth, { action: 'domain.list', targetType: 'domain', detail: { count: sorted.length, errors }, success: errors.length === 0 });
  return jsonResponse({ domains: sorted, errors });
};
