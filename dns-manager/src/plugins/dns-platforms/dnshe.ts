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
interface DnsheApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

interface DnsheSubdomain {
  id: number;
  subdomain: string;
  domain?: string;
  root_domain?: string;
  status?: number;
  status_text?: string;
  created_at?: string;
  updated_at?: string;
  expire_time?: string;
  expired?: boolean;
  record_count?: number | string;
}

interface DnsheRecord {
  id: string;
  subdomain_id?: number;
  record_id?: string;
  name: string;
  type: string;
  value: string;
  line?: string;
  ttl: number;
  priority?: number | null;
  status?: number;
  remark?: string;
  proxied?: boolean;
  updated_at?: string;
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
  return {
    id: String(sub.id),
    accountId,
    platform: 'dnshe',
    domain: sub.subdomain && sub.root_domain ? `${sub.subdomain}.${sub.root_domain}`.replace(/^\./, '') : sub.subdomain || '',
    rootDomain: sub.root_domain,
    status: sub.status === 1 ? 'active' : sub.status ?? 'active',
    statusText: sub.status_text,
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
  return {
    id: rec.id,
    domainId: rec.subdomain_id ? String(rec.subdomain_id) : '',
    accountId,
    platform: 'dnshe',
    name: rec.name,
    type: rec.type,
    value: rec.value,
    line: rec.line,
    ttl: rec.ttl,
    priority: rec.priority,
    status: rec.status === 1 ? 'active' : rec.status === 0 ? 'paused' : rec.status ?? 'active',
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
      throw new Error(`DNSHE API error: ${data.message || 'Unknown error'}`);
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
    });

    const rawData = result.data as { list?: DnsheSubdomain[]; total?: number; page?: number; per_page?: number } | undefined;
    const list = rawData?.list ?? [];
    const total = rawData?.total ?? 0;
    const currentPage = rawData?.page ?? page;
    const currentPageSize = rawData?.per_page ?? pageSize;

    return {
      domains: list.map((sub) => mapSubdomainToUnifiedDomain(sub, '')),
      total,
      page: currentPage,
      pageSize: currentPageSize,
      hasMore: currentPage * currentPageSize < total,
    };
  }

  async getDomainDetail(credentials: PlatformCredentials, domainId: string): Promise<UnifiedDomain> {
    assertDnsheCredentials(credentials);

    const result = await this.request(credentials, 'subdomains', 'get', {
      subdomain_id: domainId,
    });

    const sub = result.data as DnsheSubdomain;
    return mapSubdomainToUnifiedDomain(sub, '');
  }

  async listRecords(credentials: PlatformCredentials, domainId: string): Promise<RecordListResult> {
    assertDnsheCredentials(credentials);

    const result = await this.request(credentials, 'dns_records', 'list', {
      subdomain_id: domainId,
    });

    const rawData = result.data as { list?: DnsheRecord[]; total?: number } | undefined;
    const list = rawData?.list ?? [];
    const total = rawData?.total ?? list.length;

    return {
      records: list.map((rec) => mapRecordToUnifiedRecord(rec, '')),
      total,
      page: 1,
      pageSize: total,
    };
  }

  async createRecord(
    credentials: PlatformCredentials,
    domainId: string,
    input: CreateRecordInput,
  ): Promise<UnifiedRecord> {
    assertDnsheCredentials(credentials);

    const body: Record<string, unknown> = {
      subdomain_id: input.subdomainId ?? Number(domainId),
      name: input.name,
      type: input.type,
      value: input.value,
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

    const rec = result.data as DnsheRecord;
    return mapRecordToUnifiedRecord(rec, '');
  }

  async updateRecord(
    credentials: PlatformCredentials,
    domainId: string,
    recordId: string,
    input: UpdateRecordInput,
  ): Promise<UnifiedRecord> {
    assertDnsheCredentials(credentials);

    const body: Record<string, unknown> = {
      subdomain_id: input.subdomainId ?? Number(domainId),
      record_id: recordId,
    };

    if (input.name != null) body.name = input.name;
    if (input.type != null) body.type = input.type;
    if (input.value != null) body.value = input.value;
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

    const rec = result.data as DnsheRecord;
    return mapRecordToUnifiedRecord(rec, '');
  }

  async deleteRecord(
    credentials: PlatformCredentials,
    domainId: string,
    recordId: string,
  ): Promise<void> {
    assertDnsheCredentials(credentials);

    await this.request(credentials, 'dns_records', 'delete', undefined, 'POST', {
      subdomain_id: Number(domainId),
      record_id: recordId,
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

      const rawData = result.data as { list?: DnsheSubdomain[] } | undefined;
      const firstDomain = rawData?.list?.[0];

      return {
        success: true,
        message: 'DNSHE connection successful',
        platform: 'dnshe',
        accountName: firstDomain?.subdomain,
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
