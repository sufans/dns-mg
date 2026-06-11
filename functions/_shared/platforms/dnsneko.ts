import { fetchJsonWithRetry, UpstreamError } from '../fetcher';
import type { AdapterCredentials, AdapterListOptions, DNSPlatformAdapter, DnsRecordInput, UnifiedDomain, UnifiedRecord } from '../types';

const BASE = 'https://www.dnsneko.com/api/v1/dns';

interface NekoResponse<T> {
  code: number | string;
  errorCode: string | null;
  message: string;
  data: T | null;
}

interface NekoDomainList {
  domains: NekoDomain[];
  total: string;
  size: string;
  current: string;
  pages: string;
}

interface NekoDomainDetail {
  domain: NekoDomain & {
    rootDomain?: string;
    userRemark?: string | null;
    notice?: string;
    rootStatus?: number;
    rootNotice?: string;
    allowOperation?: number;
    createTime?: string;
    expiredNotice?: string | null;
    registerDuration?: number;
    renewDays?: number;
  };
}

interface NekoDomain {
  id: string;
  domain: string;
  status: number;
  expired: boolean;
  expireTime?: string;
  recordCount?: string | null;
  createTime?: string;
}

interface NekoRecords {
  domainId: string;
  domain: string;
  records: NekoRecord[];
  total: string;
  size: string;
  current: string;
  pages: string;
}

interface NekoRecord {
  id: string;
  domainId: string | null;
  name: string;
  type: string;
  value: string;
  line: string;
  ttl: number;
  priority: number | null;
  remark: string;
  status: number;
  updateTime: string | null;
}

function headers(credentials: AdapterCredentials, json = false): HeadersInit {
  const username = credentials.config.username;
  const apiKey = credentials.config.apiKey;
  if (!username || !apiKey) throw new Error('DNSNEKO Username/API Key 未配置');
  return {
    'X-DNSNEKO-USERNAME': username,
    'X-DNSNEKO-API-KEY': apiKey,
    ...(json ? { 'Content-Type': 'application/json' } : {})
  };
}

function assertOk<T>(payload: NekoResponse<T>): T {
  if (String(payload.code) !== '200') {
    throw new UpstreamError(payload.message || 'DNSNEKO API 调用失败', Number(payload.code) || 502, payload.errorCode ?? undefined);
  }
  if (payload.data === null) return null as T;
  return payload.data;
}

function remainingDays(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}

function mapDomain(item: NekoDomain, account: { id: number; name: string; groupId: number | null; groupName: string | null; groupColor: string | null }): UnifiedDomain {
  const remaining = remainingDays(item.expireTime);
  return {
    id: String(item.id),
    name: item.domain,
    platform: 'dnsneko',
    accountId: account.id,
    accountName: account.name,
    groupId: account.groupId,
    groupName: account.groupName,
    groupColor: account.groupColor,
    status: String(item.status),
    dnsStatus: item.status === 0 || item.status === 1 ? '正常' : `状态 ${item.status}`,
    createdAt: item.createTime ?? null,
    expiresAt: item.expireTime ?? null,
    expired: Boolean(item.expired),
    remainingDays: remaining,
    renewStatus: item.expired ? '已过期' : remaining !== null && remaining <= 30 ? '待续期' : '正常',
    recordCount: item.recordCount ? Number(item.recordCount) : null,
    raw: item
  };
}

function mapRecord(item: NekoRecord, domainId: string): UnifiedRecord {
  return {
    id: item.id,
    providerRecordId: item.id,
    domainId,
    name: item.name,
    type: item.type,
    value: item.value,
    line: item.line,
    ttl: item.ttl,
    priority: item.priority,
    remark: item.remark,
    status: item.status === 1 ? 'active' : 'paused',
    updatedAt: item.updateTime,
    raw: item
  };
}

async function request<T>(credentials: AdapterCredentials, url: string, init: RequestInit = {}): Promise<T> {
  const payload = await fetchJsonWithRetry<NekoResponse<T>>(url, init);
  return assertOk(payload);
}

export function createDnsNekoAdapter(accountMeta: { id: number; name: string; groupId: number | null; groupName: string | null; groupColor: string | null }): DNSPlatformAdapter {
  return {
    platform: 'dnsneko',
    rateLimit: { accountWindowLimit: 28, ipWindowLimit: 58, windowSeconds: 60 },
    async listDomains(credentials, options: AdapterListOptions = {}) {
      const url = new URL(`${BASE}/domains`);
      url.searchParams.set('page', String(options.page ?? 1));
      url.searchParams.set('size', String(options.size ?? 50));
      const data = await request<NekoDomainList>(credentials, url.toString(), { method: 'GET', headers: headers(credentials) });
      return (data.domains ?? []).map((domain) => mapDomain(domain, accountMeta));
    },
    async getDomain(credentials, domainId) {
      const data = await request<NekoDomainDetail>(credentials, `${BASE}/domains/${encodeURIComponent(domainId)}`, {
        method: 'GET',
        headers: headers(credentials)
      });
      return mapDomain(data.domain, accountMeta);
    },
    async listRecords(credentials, domainId, options = {}) {
      const url = new URL(`${BASE}/records`);
      url.searchParams.set('domainId', domainId);
      url.searchParams.set('page', String(options.page ?? 1));
      url.searchParams.set('size', String(options.size ?? 100));
      if (options.type) url.searchParams.set('type', options.type);
      if (options.line) url.searchParams.set('line', options.line);
      if (options.keyword) url.searchParams.set('keyword', options.keyword);
      if (options.status) url.searchParams.set('status', options.status);
      const data = await request<NekoRecords>(credentials, url.toString(), { method: 'GET', headers: headers(credentials) });
      return (data.records ?? []).map((record) => mapRecord(record, domainId));
    },
    async createRecord(credentials, domainId, input: DnsRecordInput) {
      await request<null>(credentials, `${BASE}/records/${encodeURIComponent(domainId)}`, {
        method: 'POST',
        headers: headers(credentials, true),
        body: JSON.stringify({
          name: input.name,
          type: input.type,
          value: input.value,
          line: input.line ?? 'default',
          ttl: input.ttl,
          priority: input.priority ?? undefined,
          remark: input.remark ?? undefined
        })
      });
      return null;
    },
    async updateRecord(credentials, domainId, recordId, input) {
      await request<null>(credentials, `${BASE}/records/${encodeURIComponent(domainId)}/${encodeURIComponent(recordId)}`, {
        method: 'PUT',
        headers: headers(credentials, true),
        body: JSON.stringify({
          name: input.name,
          type: input.type,
          value: input.value,
          line: input.line ?? 'default',
          ttl: input.ttl,
          priority: input.priority ?? undefined,
          remark: input.remark ?? undefined
        })
      });
      return null;
    },
    async deleteRecord(credentials, domainId, recordId) {
      await request<null>(credentials, `${BASE}/records/${encodeURIComponent(domainId)}/${encodeURIComponent(recordId)}`, {
        method: 'DELETE',
        headers: headers(credentials)
      });
    },
    async setRecordStatus(credentials, _domainId, recordId, enabled) {
      await request<null>(credentials, `${BASE}/records/${encodeURIComponent(recordId)}/status`, {
        method: 'POST',
        headers: headers(credentials, true),
        body: JSON.stringify({ status: enabled ? 1 : 0 })
      });
    },
    async batchOperation(credentials, domainId, operation, ids, value) {
      const path = operation === 'delete' ? 'delete' : operation;
      const body: Record<string, unknown> = { domainId: Number(domainId), ids: ids.map((id) => Number(id)) };
      if (operation === 'status') body.status = value === true || value === 1 ? 1 : 0;
      if (operation === 'ttl') body.ttl = Number(value);
      if (operation === 'line') body.line = String(value ?? 'default');
      await request<null>(credentials, `${BASE}/records/batch/${path}`, {
        method: 'POST',
        headers: headers(credentials, true),
        body: JSON.stringify(body)
      });
    }
  };
}
