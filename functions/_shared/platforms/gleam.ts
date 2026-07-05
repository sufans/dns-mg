import { fetchJsonWithRetry, UpstreamError } from '../fetcher';
import type { AdapterCredentials, AdapterListOptions, DNSPlatformAdapter, DnsRecordInput, UnifiedDomain, UnifiedRecord } from '../types';

const BASE = 'https://sld.0n.pub/api/v1/open';

// -- Gleam API response types --

interface GleamBaseResponse {
  code: number;
  message: string;
}

interface GleamSubdomain {
  id: number;
  domain_id: number;
  user_id: number;
  name: string;
  fqdn: string;
  claim_cost: number;
  status: string;
  suspended_reason?: string;
  suspended_at?: string | null;
  dns_records?: GleamRecord[];
  created_at: string;
  updated_at: string;
}

interface GleamRecord {
  id: number;
  subdomain_id: number;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  provider_record_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface GleamSubdomainsResponse extends GleamBaseResponse {
  data: GleamSubdomain[];
}

interface GleamSubdomainDetailResponse extends GleamBaseResponse {
  data: GleamSubdomain;
}

interface GleamRecordsResponse extends GleamBaseResponse {
  data: GleamRecord[];
}

interface GleamRecordResponse extends GleamBaseResponse {
  data: GleamRecord;
}

interface GleamDeleteResponse extends GleamBaseResponse {
  data: { message: string };
}

// -- Headers --

function headers(credentials: AdapterCredentials, json = false, idempotent = false): HeadersInit {
  const apiKey = credentials.config.apiKey;
  if (!apiKey) throw new Error('Gleam API Key 未配置');

  const h: Record<string, string> = {
    'X-API-Key': apiKey,
  };
  if (json) {
    h['Content-Type'] = 'application/json';
  }
  if (idempotent) {
    h['X-Idempotency-Key'] = crypto.randomUUID();
  }
  return h;
}

// -- Response validation --

function assertSuccess<T extends GleamBaseResponse>(payload: T): T {
  if (payload.code !== 0) {
    throw new UpstreamError(
      payload.message || 'Gleam API 调用失败',
      502
    );
  }
  return payload;
}

// -- Generic request wrapper --

async function request<T extends GleamBaseResponse>(
  credentials: AdapterCredentials,
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const payload = await fetchJsonWithRetry<T>(url, init);
  return assertSuccess(payload);
}

// -- Mapping helpers --

function mapDomain(
  item: GleamSubdomain,
  account: {
    id: number;
    name: string;
    groupId: number | null;
    groupName: string | null;
    groupColor: string | null;
  }
): UnifiedDomain {
  return {
    id: String(item.id),
    name: item.fqdn,
    platform: 'gleam',
    accountId: account.id,
    accountName: account.name,
    groupId: account.groupId,
    groupName: account.groupName,
    groupColor: account.groupColor,
    status: item.status,
    dnsStatus: item.status === 'active' ? '正常' : item.status,
    createdAt: item.created_at,
    expiresAt: null,
    expired: false,
    remainingDays: null,
    renewStatus: '正常',
    recordCount: Array.isArray(item.dns_records) ? item.dns_records.length : null,
    raw: item,
  };
}

function mapRecord(record: GleamRecord, domainId: string): UnifiedRecord {
  return {
    id: String(record.id),
    providerRecordId: record.provider_record_id || null,
    domainId,
    name: record.name,
    type: record.type,
    value: record.content,
    line: null,
    ttl: record.ttl,
    priority: null,
    remark: null,
    status: record.status === 'active' ? 'active' : 'paused',
    updatedAt: record.updated_at,
    raw: record,
  };
}

// -- Factory --

export function createGleamAdapter(accountMeta: {
  id: number;
  name: string;
  groupId: number | null;
  groupName: string | null;
  groupColor: string | null;
}): DNSPlatformAdapter {
  return {
    platform: 'gleam',
    rateLimit: { accountWindowLimit: 55, windowSeconds: 60 },

    async listDomains(credentials, options: AdapterListOptions = {}) {
      const url = new URL(`${BASE}/subdomains`);
      if (options.page) url.searchParams.set('page', String(options.page));
      if (options.size) url.searchParams.set('size', String(options.size));
      const payload = await request<GleamSubdomainsResponse>(credentials, url.toString(), {
        method: 'GET',
        headers: headers(credentials),
      });
      return (payload.data ?? []).map((item) => mapDomain(item, accountMeta));
    },

    async getDomain(credentials, domainId) {
      const payload = await request<GleamSubdomainDetailResponse>(
        credentials,
        `${BASE}/subdomains/${encodeURIComponent(domainId)}`,
        { method: 'GET', headers: headers(credentials) }
      );
      if (!payload.data) throw new UpstreamError('Gleam 子域名不存在', 404, 'not_found');
      return mapDomain(payload.data, accountMeta);
    },

    async listRecords(credentials, domainId) {
      const payload = await request<GleamRecordsResponse>(
        credentials,
        `${BASE}/dns-records/${encodeURIComponent(domainId)}`,
        { method: 'GET', headers: headers(credentials) }
      );
      return (payload.data ?? []).map((record) => mapRecord(record, domainId));
    },

    async createRecord(credentials, domainId, input: DnsRecordInput) {
      const body: Record<string, unknown> = {
        type: input.type,
        content: input.value,
      };
      if (input.ttl !== undefined && input.ttl !== 600) body.ttl = input.ttl;
      const payload = await request<GleamRecordResponse>(
        credentials,
        `${BASE}/dns-records/${encodeURIComponent(domainId)}`,
        {
          method: 'POST',
          headers: headers(credentials, true, true),
          body: JSON.stringify(body),
        }
      );
      if (payload.data) {
        return mapRecord(payload.data, domainId);
      }
      return null;
    },

    async updateRecord(credentials, domainId, recordId, input) {
      const body: Record<string, unknown> = {
        content: input.value,
      };
      const payload = await request<GleamRecordResponse>(
        credentials,
        `${BASE}/dns-records/${encodeURIComponent(domainId)}/${encodeURIComponent(recordId)}`,
        {
          method: 'PUT',
          headers: headers(credentials, true, true),
          body: JSON.stringify(body),
        }
      );
      if (payload.data) {
        return mapRecord(payload.data, domainId);
      }
      return null;
    },

    async deleteRecord(credentials, domainId, recordId) {
      await request<GleamDeleteResponse>(
        credentials,
        `${BASE}/dns-records/${encodeURIComponent(domainId)}/${encodeURIComponent(recordId)}`,
        {
          method: 'DELETE',
          headers: headers(credentials, false, true),
        }
      );
    },
  };
}