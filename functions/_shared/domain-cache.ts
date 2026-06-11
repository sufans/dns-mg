import type { Env, UnifiedDomain } from './types';

export async function readDomainCache(env: Env, accountId: number, cacheKey: string): Promise<UnifiedDomain[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT payload_json FROM domain_cache WHERE account_id = ? AND cache_key = ? AND expires_at > ?')
    .bind(accountId, cacheKey, now)
    .first<{ payload_json: string }>();
  if (!row) return null;
  return JSON.parse(row.payload_json) as UnifiedDomain[];
}

export async function writeDomainCache(env: Env, accountId: number, cacheKey: string, domains: UnifiedDomain[], ttlSeconds: number): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  await env.DB.prepare(
    `INSERT INTO domain_cache (account_id, cache_key, payload_json, expires_at, cached_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(account_id, cache_key) DO UPDATE SET payload_json = excluded.payload_json, expires_at = excluded.expires_at, cached_at = excluded.cached_at`
  )
    .bind(accountId, cacheKey, JSON.stringify(domains), expiresAt, new Date().toISOString())
    .run();
}

export async function clearDomainCache(env: Env, accountId?: number): Promise<void> {
  if (accountId) await env.DB.prepare('DELETE FROM domain_cache WHERE account_id = ?').bind(accountId).run();
  else await env.DB.prepare('DELETE FROM domain_cache').run();
}
