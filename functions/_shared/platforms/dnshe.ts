import { fetchJsonWithRetry, UpstreamError } from '../fetcher';
import type { AdapterCredentials, AdapterListOptions, DNSPlatformAdapter, DnsRecordInput, UnifiedDomain, UnifiedRecord } from '../types';

const BASE = 'https://api005.dnshe.com/index.php?m=domain_hub';

interface DnsheBaseResponse {
  success?: boolean;
  message?: string;
  error?: string;
  error_code?: string;
}

interface DnsheSubdomain {
  id: number | string;
  subdomain?: string;
  rootdomain?: string;
  full_domain?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  remaining_days?: number;
  never_expires?: number;
  dns_count?: number;
}

interface DnsheRecord {
  id?: number | string;
  record_id?: string;
  name?: string;
  type?: string;
  content?: string;
  ttl?: number;
  priority?: number | null;
  line?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface DnsheListResponse extends DnsheBaseResponse {
  count?: number;
  subdomains?: DnsheSubdomain[];
}

interface DnsheDetailResponse extends DnsheBaseResponse {
  subdomain?: DnsheSubdomain;
  dns_records?: DnsheRecord[];
  dns_count?: number;
}

interface DnsheRecordsResponse extends DnsheBaseResponse {
  count?: number;
  records?: DnsheRecord[];
}

function endpoint(endpointName: string, action?: string, params: Record<string, string | number | boolean | undefined> = {}): string {
  const url = new URL(BASE);
  url.searchParams.set('endpoint', endpointName);
  if (action) url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function headers(credentials: AdapterCredentials, json = false): HeadersInit {
  const apiKey = credentials.config.apiKey;
  const apiSecret = credentials.config.apiSecret;
  if (!apiKey || !apiSecret) throw new Error('DNSHE API Key/Secret 未配置');
  return {
    'X-API-Key': apiKey,
    'X-API-Secret': apiSecret,
    ...(json ? { 'Content-Type': 'application/json' } : {})
  };
}

function assertSuccess<T extends DnsheBaseResponse>(payload: T): T {
  if (payload.success === false) {
    throw new UpstreamError(payload.message ?? payload.error ?? 'DNSHE API 调用失败', 502, payload.error_code);
  }
  return payload;
}

function toRemainingDays(expiresAt?: string, remaining?: number): number | null {
  if (typeof remaining === 'number') return remaining;
  if (!expiresAt) return null;
  const time = new Date(expiresAt.replace(' ', 'T')).getTime();
  if (Number.isNaN(time)) return null;
  return Math.ceil((time - Date.now()) / 86400000);
}

function mapDomain(item: DnsheSubdomain, account: { id: number; name: string; groupId: number | null; groupName: string | null; groupColor: string | null }): UnifiedDomain {
  const name = item.full_domain ?? [item.subdomain, item.rootdomain].filter(Boolean).join('.');
  const remaining = toRemainingDays(item.expires_at, item.remaining_days);
  const expired = item.status === 'expired' || (remaining !== null && remaining < 0);
  return {
    id: String(item.id),
    name,
    platform: 'dnshe',
    accountId: account.id,
    accountName: account.name,
    groupId: account.groupId,
    groupName: account.groupName,
    groupColor: account.groupColor,
    status: item.status ?? 'unknown',
    dnsStatus: item.status === 'active' ? '正常' : item.status ?? 'unknown',
    createdAt: item.created_at ?? null,
    expiresAt: item.expires_at ?? null,
    expired,
    remainingDays: remaining,
    renewStatus: item.never_expires ? '永久' : expired ? '已过期' : remaining !== null && remaining <= 30 ? '待续期' : '正常',
    recordCount: typeof item.dns_count === 'number' ? item.dns_count : null,
    raw: item
  };
}

function mapRecord(record: DnsheRecord, domainId: string): UnifiedRecord {
  return {
    id: String(record.id ?? record.record_id ?? ''),
    providerRecordId: record.record_id ?? null,
    domainId,
    name: record.name ?? '@',
    type: record.type ?? 'A',
    value: record.content ?? '',
    line: record.line ?? null,
    ttl: Number(record.ttl ?? 600),
    priority: record.priority ?? null,
    remark: null,
    status: record.status === 'suspended' || record.status === 'paused' ? 'paused' : 'active',
    updatedAt: record.updated_at ?? record.created_at ?? null,
    raw: record
  };
}

async function request<T extends DnsheBaseResponse>(credentials: AdapterCredentials, url: string, init: RequestInit = {}): Promise<T> {
  const payload = await fetchJsonWithRetry<T>(url, init);
  return assertSuccess(payload);
}

export function createDnsheAdapter(accountMeta: { id: number; name: string; groupId: number | null; groupName: string | null; groupColor: string | null }): DNSPlatformAdapter {
  return {
    platform: 'dnshe',
    rateLimit: { accountWindowLimit: 55, windowSeconds: 60 },
    async listDomains(credentials, options: AdapterListOptions = {}) {
      const payload = await request<DnsheListResponse>(
        credentials,
        endpoint('subdomains', 'list', {
          page: options.page ?? 1,
          per_page: options.size ?? 100,
          search: options.search,
          status: options.status,
          include_total: 0
        }),
        { method: 'GET', headers: headers(credentials) }
      );
      return (payload.subdomains ?? []).map((item) => mapDomain(item, accountMeta));
    },
    async getDomain(credentials, domainId) {
      const payload = await request<DnsheDetailResponse>(credentials, endpoint('subdomains', 'get', { subdomain_id: domainId }), {
        method: 'GET',
        headers: headers(credentials)
      });
      if (!payload.subdomain) throw new UpstreamError('DNSHE 子域名不存在', 404, 'not_found');
      return mapDomain({ ...payload.subdomain, dns_count: payload.dns_count }, accountMeta);
    },
    async listRecords(credentials, domainId) {
      const payload = await request<DnsheRecordsResponse>(credentials, endpoint('dns_records', 'list', { subdomain_id: domainId }), {
        method: 'GET',
        headers: headers(credentials)
      });
      return (payload.records ?? []).map((record) => mapRecord(record, domainId));
    },
    async createRecord(credentials, domainId, input: DnsRecordInput) {
      const body: Record<string, unknown> = {
        subdomain_id: Number(domainId),
        type: input.type,
        name: input.name === '@' ? '' : input.name,
        content: input.value,
        ttl: input.ttl,
        priority: input.priority ?? undefined,
        line: input.line ?? undefined
      };
      await request<DnsheBaseResponse>(credentials, endpoint('dns_records', 'create'), {
        method: 'POST',
        headers: headers(credentials, true),
        body: JSON.stringify(body)
      });
      return null;
    },
    async updateRecord(credentials, _domainId, recordId, input) {
      const body: Record<string, unknown> = {
        id: Number.isNaN(Number(recordId)) ? undefined : Number(recordId),
        record_id: Number.isNaN(Number(recordId)) ? recordId : undefined,
        type: input.type,
        name: input.name === '@' ? '' : input.name,
        content: input.value,
        ttl: input.ttl,
        priority: input.priority ?? undefined,
        line: input.line ?? undefined
      };
      await request<DnsheBaseResponse>(credentials, endpoint('dns_records', 'update'), {
        method: 'POST',
        headers: headers(credentials, true),
        body: JSON.stringify(body)
      });
      return null;
    },
    async deleteRecord(credentials, _domainId, recordId) {
      const body = Number.isNaN(Number(recordId)) ? { record_id: recordId } : { id: Number(recordId) };
      await request<DnsheBaseResponse>(credentials, endpoint('dns_records', 'delete'), {
        method: 'POST',
        headers: headers(credentials, true),
        body: JSON.stringify(body)
      });
    }
  };
}
