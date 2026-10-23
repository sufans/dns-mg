import { requireAuth } from '../../_shared/auth';
import { decryptAccountConfig, listAccountRows } from '../../_shared/db';
import { readDomainCache, writeDomainCache } from '../../_shared/domain-cache';
import { listAllDomains } from '../../_shared/list-all';
import { logOperation } from '../../_shared/logger';
import { adapterForAccount } from '../../_shared/platforms/factory';
import { cleanupRateLimits, reservePlatformRequest } from '../../_shared/rate-limit';
import { jsonResponse } from '../../_shared/response';
import type { ApiAccountRow, Env, UnifiedDomain } from '../../_shared/types';

const MAX_CONCURRENCY = 2;

/** Runs `worker` over items with a bounded number of in-flight tasks. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

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
  const cacheKey = 'domain-list';

  const perAccount = await mapWithConcurrency<ApiAccountRow, { domains: UnifiedDomain[]; error?: { accountId: number; accountName: string; error: string } }>(
    accounts,
    MAX_CONCURRENCY,
    async (row) => {
      try {
        const cached = refresh ? null : await readDomainCache(env, row.id, cacheKey);
        if (cached) return { domains: cached };

        const adapter = adapterForAccount(row);
        const config = await decryptAccountConfig(env, row);
        const credentials = { platform: row.platform, config } as const;
        const reserve = () => reservePlatformRequest(env, row.id, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
        // One retry keeps transient upstream failures from blanking the account.
        let domains: UnifiedDomain[];
        try {
          domains = await listAllDomains(adapter, credentials, reserve);
        } catch {
          domains = await listAllDomains(adapter, credentials, reserve);
        }
        await writeDomainCache(env, row.id, cacheKey, domains, 5 * 60);
        return { domains };
      } catch (error) {
        return {
          domains: [],
          error: { accountId: row.id, accountName: row.name, error: error instanceof Error ? error.message : '未知错误' }
        };
      }
    }
  );

  const results: UnifiedDomain[] = [];
  const errors: Array<{ accountId: number; accountName: string; error: string }> = [];
  for (const entry of perAccount) {
    if (entry.error) errors.push(entry.error);
    results.push(...entry.domains.filter((domain) => matchesFilters(domain, url.searchParams)));
  }

  const sorted = results.sort((a, b) => (a.remainingDays ?? 999999) - (b.remainingDays ?? 999999));
  await logOperation(env, request, auth, { action: 'domain.list', targetType: 'domain', detail: { count: sorted.length, errors }, success: errors.length === 0 });
  return jsonResponse({ domains: sorted, errors });
};
