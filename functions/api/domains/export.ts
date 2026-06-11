import { requireAuth } from '../../_shared/auth';
import { decryptAccountConfig, listAccountRows } from '../../_shared/db';
import { adapterForAccount } from '../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../_shared/rate-limit';
import { secureHeaders } from '../../_shared/response';
import type { Env, UnifiedDomain } from '../../_shared/types';

const csvEscape = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accounts = await listAccountRows(env, true);
  const domains: UnifiedDomain[] = [];
  for (const row of accounts) {
    const adapter = adapterForAccount(row);
    await reservePlatformRequest(env, row.id, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
    const config = await decryptAccountConfig(env, row);
    domains.push(...(await adapter.listDomains({ platform: row.platform, config }, { page: 1, size: 500 })));
  }
  const header = ['域名', '平台', 'API账号', '分组', '状态', '创建时间', '到期时间', '剩余天数', '续费状态', '解析数量'];
  const rows = domains.map((d) => [d.name, d.platform, d.accountName, d.groupName, d.status, d.createdAt, d.expiresAt, d.remainingDays, d.renewStatus, d.recordCount]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const headers = new Headers(secureHeaders());
  headers.set('Content-Type', 'text/csv; charset=utf-8');
  headers.set('Content-Disposition', `attachment; filename="domains-${new Date().toISOString().slice(0, 10)}.csv"`);
  return new Response(`\ufeff${csv}`, { headers });
};
