import { fetchJsonWithRetry, UpstreamError } from '../fetcher';
import type { AdapterCredentials, AdapterListOptions, DNSPlatformAdapter, DnsRecordInput, UnifiedDomain, UnifiedRecord } from '../types';

const BASE = 'https://api.gleam.com';

// -- Gleam API response types (flexible, since API doc is sparse) --

interface GleamBaseResponse {
  code?: number;
  message?: string;
  error?: string;
}

interface GleamSubdomain {
  id: number | string;
  domain?: string;
  subdomain?: string;
  full_domain?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  remaining_days?: number;
  never_expires?: number;
  record_count?: number;
  dns_count?: number;
}

interface GleamRecord {
  id?: number | string;
  record_id?: string;
  name?: string;
  type?: string;
  content?: string;
  value?: string;
  ttl?: number;
  priority?: number | null;
  line?: string | null;
  status?: string;
  remark?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface GleamListResponse extends GleamBaseResponse {
  data?: GleamSubdomain[];
  total?: number;
}

interface GleamDetailResponse extends GleamBaseResponse {
  data?: GleamSubdomain;
}

interface GleamRecordsResponse extends GleamBaseResponse {
  data?: GleamRecord[];
  total?: number;
}

interface GleamRecordResponse extends GleamBaseResponse {
  data?: GleamRecord;
}

// -- HMAC-SHA256 signature --

export async function generateSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  apiSecret: string
): Promise<string> {
  const message = timestamp + method + path + body;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// -- Headers with HMAC signature --

async function buildHeaders(
  credentials: AdapterCredentials,
  method: string,
  path: string,
  body: string
): Promise<HeadersInit> {
  const apiKey = credentials.config.apiKey;
  const apiSecret = credentials.config.apiSecret;
  if (!apiKey || !apiSecret) throw new Error('Gleam API Key/Secret 未配置');

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await generateSignature(timestamp, method, path, body, apiSecret);

  const h: Record<string, string> = {
    'X-Api-Key': apiKey,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
  };
  if (body) {
    h['Content-Type'] = 'application/json';
  }
  return h;
}

// -- Response validation --

function assertSuccess<T extends GleamBaseResponse>(payload: T): T {
  if (payload.code !== undefined && payload.code !== 0 && payload.code !== 200) {
    throw new UpstreamError(
      payload.message ?? payload.error ?? 'Gleam API 调用失败',
      502
    );
  }
  return payload;
}

// -- Generic request wrapper --

async function request<T extends GleamBaseResponse>(
  credentials: AdapterCredentials,
  method: string,
  url: string,
  body?: unknown
): Promise<T> {
  const urlObj = new URL(url);
  const path = urlObj.pathname + urlObj.search;
  const bodyStr = body ? JSON.stringify(body) : '';
  const h = await buildHeaders(credentials, method, path, bodyStr);
  const init: RequestInit = { method, headers: h };
  if (body) {
    init.body = bodyStr;
  }
  const payload = await fetchJsonWithRetry<T>(url, init);
  return assertSuccess(payload);
}

// -- Mapping helpers --

function toRemainingDays(expiresAt?: string, remaining?: number): number | null {
  if (typeof remaining === 'number') return remaining;
  if (!expiresAt) return null;
  const time = new Date(expiresAt.replace(' ', 'T')).getTime();
  if (Number.isNaN(time)) return null;
  return Math.ceil((time - Date.now()) / 86400000);
}

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
  const name = item.full_domain ?? item.domain ?? item.subdomain ?? '';
  const remaining = toRemainingDays(item.expires_at, item.remaining_days);
  const expired = item.status === 'expired' || (remaining !== null && remaining < 0);
  return {
    id: String(item.id),
    name,
    platform: 'gleam',
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
    renewStatus: item.never_expires
      ? '永久'
      : expired
        ? '已过期'
        : remaining !== null && remaining <= 30
          ? '待续期'
          : '正常',
    recordCount:
      typeof item.record_count === 'number'
        ? item.record_count
        : typeof item.dns_count === 'number'
          ? item.dns_count
          : null,
    raw: item,
  };
}

function mapRecord(record: GleamRecord, domainId: string): UnifiedRecord {
  return {
    id: String(record.id ?? record.record_id ?? ''),
    providerRecordId: record.record_id ?? null,
    domainId,
    name: record.name ?? '@',
    type: record.type ?? 'A',
    value: record.content ?? record.value ?? '',
    line: record.line ?? null,
    ttl: Number(record.ttl ?? 600),
    priority: record.priority ?? null,
    remark: record.remark ?? null,
    status:
      record.status === 'suspended' || record.status === 'paused'
        ? 'paused'
        : 'active',
    updatedAt: record.updated_at ?? record.created_at ?? null,
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
      const url = new URL(`${BASE}/api/open/subdomains`);
      url.searchParams.set('page', String(options.page ?? 1));
      url.searchParams.set('size', String(options.size ?? 100));
      if (options.search) url.searchParams.set('search', options.search);
      if (options.status) url.searchParams.set('status', options.status);
      const payload = await request<GleamListResponse>(credentials, 'GET', url.toString());
      return (payload.data ?? []).map((item) => mapDomain(item, accountMeta));
    },

    async getDomain(credentials, domainId) {
      const payload = await request<GleamDetailResponse>(
        credentials,
        'GET',
        `${BASE}/api/open/subdomains/${encodeURIComponent(domainId)}`
      );
      if (!payload.data) throw new UpstreamError('Gleam 子域名不存在', 404, 'not_found');
      return mapDomain(payload.data, accountMeta);
    },

    async listRecords(credentials, domainId, options = {}) {
      const url = new URL(
        `${BASE}/api/open/subdomains/${encodeURIComponent(domainId)}/records`
      );
      url.searchParams.set('page', String(options.page ?? 1));
      url.searchParams.set('size', String(options.size ?? 100));
      if (options.type) url.searchParams.set('type', options.type);
      if (options.line) url.searchParams.set('line', options.line);
      if (options.keyword) url.searchParams.set('keyword', options.keyword);
      const payload = await request<GleamRecordsResponse>(credentials, 'GET', url.toString());
      return (payload.data ?? []).map((record) => mapRecord(record, domainId));
    },

    async createRecord(credentials, domainId, input: DnsRecordInput) {
      const body: Record<string, unknown> = {
        name: input.name === '@' ? '' : input.name,
        type: input.type,
        content: input.value,
        ttl: input.ttl,
        priority: input.priority ?? undefined,
        line: input.line ?? undefined,
      };
      const payload = await request<GleamRecordResponse>(
        credentials,
        'POST',
        `${BASE}/api/open/subdomains/${encodeURIComponent(domainId)}/records`,
        body
      );
      if (payload.data) {
        return mapRecord(payload.data, domainId);
      }
      return null;
    },

    async updateRecord(credentials, _domainId, recordId, input) {
      const body: Record<string, unknown> = {
        name: input.name === '@' ? '' : input.name,
        type: input.type,
        content: input.value,
        ttl: input.ttl,
        priority: input.priority ?? undefined,
        line: input.line ?? undefined,
      };
      const payload = await request<GleamRecordResponse>(
        credentials,
        'PUT',
        `${BASE}/api/open/dns-records/${encodeURIComponent(recordId)}`,
        body
      );
      if (payload.data) {
        return mapRecord(payload.data, _domainId);
      }
      return null;
    },

    async deleteRecord(credentials, _domainId, recordId) {
      await request<GleamBaseResponse>(
        credentials,
        'DELETE',
        `${BASE}/api/open/dns-records/${encodeURIComponent(recordId)}`
      );
    },
  };
}