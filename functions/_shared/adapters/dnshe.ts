import type {
  DNSPlatformAdapter,
  DnsheCredentials,
  PlatformCredentials,
  UnifiedDomain,
  UnifiedRecord,
  DomainListResult,
  RecordListResult,
  CreateRecordInput,
  UpdateRecordInput,
  BatchOperationInput,
  ConnectionTestResult,
} from './types';

const DNSHE_BASE_URL = 'https://api005.dnshe.com/index.php';
const RATE_LIMIT_PER_MINUTE = 60;

// Simple in-memory rate limiter
class RateLimiter {
  private timestamps: number[] = [];

  async acquire(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length >= RATE_LIMIT_PER_MINUTE) {
      const oldestInWindow = this.timestamps[0];
      const waitMs = oldestInWindow + 60_000 - now + 1;
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.timestamps = this.timestamps.filter((t) => t > Date.now() - 60_000);
    }

    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter();

// DNSHE API response types
// The DNSHE API returns data at the top level, not inside a "data" wrapper.
// e.g. { success: true, subdomains: [...], pagination: {...} }
interface DnsheApiResponse {
  success: boolean;
  message?: string;
  error_code?: string;
  error?: string;
  [key: string]: unknown;
}

// Matches the DNSHE API subdomain object structure
interface DnsheSubdomain {
  id: number;
  subdomain: string;
  rootdomain?: string;
  full_domain?: string;
  status?: string | number; // API returns string like "active", "suspended", "expired"
  created_at?: string;
  updated_at?: string;
  expire_time?: string;
  expired?: boolean;
  record_count?: number | string;
}

// Matches the DNSHE API DNS record object structure
interface DnsheRecord {
  id: number | string;
  subdomain_id?: number;
  record_id?: string;
  name: string;
  type: string;
  content: string; // API uses "content", not "value"
  line?: string | null;
  ttl: number;
  priority?: number | null;
  status?: string | number; // API returns string like "active"
  remark?: string;
  proxied?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Pagination object returned by DNSHE list endpoints
interface DnshePagination {
  page: number;
  per_page: number;
  has_more: boolean;
  next_page?: number;
  prev_page?: number;
  total: number;
}

function assertDnsheCredentials(credentials: PlatformCredentials): asserts credentials is DnsheCredentials {
  if (!('apiKey' in credentials) || !('apiSecret' in credentials)) {
    throw new Error('Invalid credentials: DNSHE requires apiKey and apiSecret');
  }
}

function buildUrl(endpoint: string, action: string, params?: Record<string, string>): string {
  const url = new URL(DNSHE_BASE_URL);
  url.searchParams.set('m', 'domain_hub');
  url.searchParams.set('endpoint', endpoint);
  url.searchParams.set('action', action);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function mapSubdomainToUnifiedDomain(sub: DnsheSubdomain, accountId: string): UnifiedDomain {
  // Prefer full_domain from API; fall back to constructing from subdomain + rootdomain
  const domainName = sub.full_domain
    || (sub.subdomain && sub.rootdomain ? `${sub.subdomain}.${sub.rootdomain}`.replace(/^\./, '') : sub.subdomain || '');

  // API returns status as string ("active", "suspended", "expired") or number
  let mappedStatus: UnifiedDomain['status'];
  if (sub.status === 'active' || sub.status === 'suspended' || sub.status === 'expired') {
    mappedStatus = sub.status;
  } else if (typeof sub.status === 'number') {
    mappedStatus = sub.status === 1 ? 'active' : sub.status;
  } else {
    mappedStatus = 'active';
  }

  return {
    id: String(sub.id),
    accountId,
    platform: 'dnshe',
    domain: domainName,
    rootDomain: sub.rootdomain,
    status: mappedStatus,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
    expireTime: sub.expire_time,
    expired: sub.expired,
    recordCount: sub.record_count,
    subdomainId: sub.id,
    subdomain: sub.subdomain,
  };
}

function mapRecordToUnifiedRecord(rec: DnsheRecord, accountId: string): UnifiedRecord {
  // API returns status as string ("active") or number
  let mappedStatus: UnifiedRecord['status'];
  if (rec.status === 'active' || rec.status === 'paused') {
    mappedStatus = rec.status;
  } else if (typeof rec.status === 'number') {
    mappedStatus = rec.status === 1 ? 'active' : rec.status === 0 ? 'paused' : rec.status;
  } else {
    mappedStatus = 'active';
  }

  return {
    id: String(rec.id),
    domainId: rec.subdomain_id ? String(rec.subdomain_id) : '',
    accountId,
    platform: 'dnshe',
    name: rec.name,
    type: rec.type,
    value: rec.content, // Map API "content" to unified "value"
    line: rec.line ?? undefined,
    ttl: rec.ttl,
    priority: rec.priority,
    status: mappedStatus,
    remark: rec.remark,
    updatedAt: rec.updated_at,
    recordId: rec.record_id,
    proxied: rec.proxied,
  };
}

export class DnsheAdapter implements DNSPlatformAdapter {
  readonly platform = 'dnshe' as const;

  private async request(
    credentials: DnsheCredentials,
    endpoint: string,
    action: string,
    params?: Record<string, string>,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>,
  ): Promise<DnsheApiResponse> {
    await rateLimiter.acquire();

    const url = buildUrl(endpoint, action, method === 'GET' ? params : undefined);
    const headers: Record<string, string> = {
      'X-API-Key': credentials.apiKey,
      'X-API-Secret': credentials.apiSecret,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST' && body) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`DNSHE API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as DnsheApiResponse;

    if (!data.success) {
      const errorCode = data.error_code ? `[${data.error_code}] ` : '';
      throw new Error(`DNSHE API error: ${errorCode}${data.message || data.error || 'Unknown error'}`);
    }

    return data;
  }

  async listDomains(
    credentials: PlatformCredentials,
    page = 1,
    pageSize = 20,
  ): Promise<DomainListResult> {
    assertDnsheCredentials(credentials);

    const result = await this.request(credentials, 'subdomains', 'list', {
      page: String(page),
      per_page: String(pageSize),
      include_total: '1',
    });

    // API returns subdomains at top level, not inside "data"
    const subdomains = (result.subdomains as DnsheSubdomain[] | undefined) ?? [];
    const pagination = result.pagination as DnshePagination | undefined;
    const count = (result.count as number | undefined) ?? 0;
    const total = pagination?.total ?? count;
    const currentPage = pagination?.page ?? page;
    const currentPageSize = pagination?.per_page ?? pageSize;

    return {
      domains: subdomains.map((sub) => mapSubdomainToUnifiedDomain(sub, '')),
      total,
      page: currentPage,
      pageSize: currentPageSize,
      hasMore: pagination?.has_more ?? (currentPage * currentPageSize < total),
    };
  }

  async getDomainDetail(credentials: PlatformCredentials, domainId: string): Promise<UnifiedDomain> {
    assertDnsheCredentials(credentials);

    const result = await this.request(credentials, 'subdomains', 'get', {
      subdomain_id: domainId,
    });

    // API returns subdomain object at top level under "subdomain" key
    const sub = result.subdomain as DnsheSubdomain;
    return mapSubdomainToUnifiedDomain(sub, '');
  }

  async listRecords(credentials: PlatformCredentials, domainId: string): Promise<RecordListResult> {
    assertDnsheCredentials(credentials);

    const result = await this.request(credentials, 'dns_records', 'list', {
      subdomain_id: domainId,
    });

    // API returns records at top level under "records" key
    const records = (result.records as DnsheRecord[] | undefined) ?? [];
    const count = (result.count as number | undefined) ?? records.length;

    return {
      records: records.map((rec) => mapRecordToUnifiedRecord(rec, '')),
      total: count,
      page: 1,
      pageSize: count,
    };
  }

  async createRecord(
    credentials: PlatformCredentials,
    domainId: string,
    input: CreateRecordInput,
  ): Promise<UnifiedRecord> {
    assertDnsheCredentials(credentials);

    // DNSHE API uses "content" for record value, not "value"
    const body: Record<string, unknown> = {
      subdomain_id: input.subdomainId ?? Number(domainId),
      name: input.name,
      type: input.type,
      content: input.value,
      ttl: input.ttl,
    };

    if (input.line) body.line = input.line;
    if (input.priority != null) body.priority = input.priority;
    if (input.remark) body.remark = input.remark;

    // SRV-specific fields
    if (input.type === 'SRV') {
      if (input.weight != null) body.weight = input.weight;
      if (input.port != null) body.port = input.port;
      if (input.target) body.target = input.target;
    }

    // CAA-specific fields
    if (input.type === 'CAA') {
      if (input.caaFlag != null) body.caa_flag = input.caaFlag;
      if (input.caaTag) body.caa_tag = input.caaTag;
      if (input.caaValue) body.caa_value = input.caaValue;
    }

    const result = await this.request(credentials, 'dns_records', 'create', undefined, 'POST', body);

    // API returns { success, message, id, record_id } — construct record from input + response
    const createdRecord: DnsheRecord = {
      id: (result.id as number) ?? 0,
      subdomain_id: Number(domainId),
      record_id: result.record_id as string | undefined,
      name: input.name,
      type: input.type,
      content: input.value,
      ttl: input.ttl,
      line: input.line ?? null,
      priority: input.priority ?? null,
      status: 'active',
      remark: input.remark,
    };

    return mapRecordToUnifiedRecord(createdRecord, '');
  }

  async updateRecord(
    credentials: PlatformCredentials,
    domainId: string,
    recordId: string,
    input: UpdateRecordInput,
  ): Promise<UnifiedRecord> {
    assertDnsheCredentials(credentials);

    // DNSHE API recommends using "id" (module internal ID) for record identification
    const body: Record<string, unknown> = {
      id: Number(recordId),
      subdomain_id: Number(domainId),
    };

    if (input.name != null) body.name = input.name;
    if (input.type != null) body.type = input.type;
    if (input.value != null) body.content = input.value; // API uses "content"
    if (input.ttl != null) body.ttl = input.ttl;
    if (input.line != null) body.line = input.line;
    if (input.priority != null) body.priority = input.priority;
    if (input.remark != null) body.remark = input.remark;

    if (input.type === 'SRV') {
      if (input.weight != null) body.weight = input.weight;
      if (input.port != null) body.port = input.port;
      if (input.target) body.target = input.target;
    }

    if (input.type === 'CAA') {
      if (input.caaFlag != null) body.caa_flag = input.caaFlag;
      if (input.caaTag) body.caa_tag = input.caaTag;
      if (input.caaValue) body.caa_value = input.caaValue;
    }

    const result = await this.request(credentials, 'dns_records', 'update', undefined, 'POST', body);

    // API returns { success, message, id, record_id } — construct record from input + response
    const updatedRecord: DnsheRecord = {
      id: (result.id as number | string) ?? recordId,
      subdomain_id: Number(domainId),
      record_id: result.record_id as string | undefined,
      name: input.name ?? '',
      type: input.type ?? '',
      content: input.value ?? '',
      ttl: input.ttl ?? 600,
      line: input.line ?? null,
      priority: input.priority ?? null,
      status: 'active',
      remark: input.remark,
    };

    return mapRecordToUnifiedRecord(updatedRecord, '');
  }

  async deleteRecord(
    credentials: PlatformCredentials,
    _domainId: string,
    recordId: string,
  ): Promise<void> {
    assertDnsheCredentials(credentials);

    // DNSHE delete API takes "id" (recommended) or "record_id", not "subdomain_id"
    await this.request(credentials, 'dns_records', 'delete', undefined, 'POST', {
      id: Number(recordId),
    });
  }

  async toggleRecordStatus(
    _credentials: PlatformCredentials,
    _recordId: string,
    _enabled: boolean,
  ): Promise<void> {
    throw new Error('DNSHE platform does not support toggling record status');
  }

  async batchOperation(
    _credentials: PlatformCredentials,
    _input: BatchOperationInput,
  ): Promise<void> {
    throw new Error('DNSHE platform does not support batch operations');
  }

  async testConnection(credentials: PlatformCredentials): Promise<ConnectionTestResult> {
    assertDnsheCredentials(credentials);

    try {
      const result = await this.request(credentials, 'subdomains', 'list', {
        per_page: '1',
      });

      const subdomains = (result.subdomains as DnsheSubdomain[] | undefined) ?? [];
      const firstDomain = subdomains[0];

      return {
        success: true,
        message: 'DNSHE connection successful',
        platform: 'dnshe',
        accountName: firstDomain?.full_domain || firstDomain?.subdomain,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'DNSHE connection failed',
        platform: 'dnshe',
      };
    }
  }
}
