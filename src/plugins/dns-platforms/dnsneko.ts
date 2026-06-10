import type {
  DNSPlatformAdapter,
  DnsnekoCredentials,
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

const DNSNEKO_BASE_URL = 'https://www.dnsneko.com/api/v1/dns';
const RATE_LIMIT_ACCOUNT = 30; // requests per 60s per account

// Simple in-memory rate limiter (conservative: use account-level limit)
class RateLimiter {
  private timestamps: number[] = [];

  async acquire(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length >= RATE_LIMIT_ACCOUNT) {
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

// DNSNEKO API response types
interface DnsnekoApiResponse<T = unknown> {
  code: number;
  errorCode: string | null;
  message: string;
  data: T;
}

// Matches the DNSNEKO API domain object (both list and detail responses)
interface DnsnekoDomain {
  id: string;
  domain?: string;
  rootDomain?: string;
  status?: number;
  expired?: boolean;
  expireTime?: string;
  recordCount?: number | string | null;
  // Detail-only fields
  userRemark?: string | null;
  notice?: string;
  rootStatus?: number;
  rootNotice?: string;
  allowOperation?: number;
  createTime?: string;
  expiredNotice?: string | null;
  registerDuration?: number;
  renewDays?: number;
}

// Response data for domain list: GET /api/v1/dns/domains
interface DnsnekoDomainListData {
  domains?: DnsnekoDomain[];
  total?: string | number;
  size?: string | number;
  current?: string | number;
  pages?: string | number;
}

// Response data for domain detail: GET /api/v1/dns/domains/{domainId}
interface DnsnekoDomainDetailData {
  domain: DnsnekoDomain;
}

// Matches the DNSNEKO API DNS record object
interface DnsnekoRecord {
  id: string;
  domainId?: string | null;
  name: string;
  type: string;
  value: string;
  line?: string;
  ttl: number;
  priority?: number | null;
  status?: number;
  remark?: string;
  updateTime?: string | null;
}

// Response data for record list: GET /api/v1/dns/records
interface DnsnekoRecordListData {
  domainId?: string;
  domain?: string;
  records?: DnsnekoRecord[];
  total?: string | number;
  size?: string | number;
  current?: string | number;
  pages?: string | number;
}

function assertDnsnekoCredentials(credentials: PlatformCredentials): asserts credentials is DnsnekoCredentials {
  if (!('username' in credentials) || !('apiKey' in credentials)) {
    throw new Error('Invalid credentials: DNSNEKO requires username and apiKey');
  }
}

function mapDomainToUnifiedDomain(domain: DnsnekoDomain, accountId: string): UnifiedDomain {
  return {
    id: domain.id,
    accountId,
    platform: 'dnsneko',
    domain: domain.domain || '',
    rootDomain: domain.rootDomain,
    status: domain.status === 1 ? 'active' : domain.status === 0 ? 'suspended' : domain.status ?? 'active',
    statusText: domain.status === 1 ? 'active' : domain.status === 0 ? 'suspended' : undefined,
    createdAt: domain.createTime,
    expireTime: domain.expireTime,
    expired: domain.expired,
    recordCount: domain.recordCount,
    domainId: domain.id,
    userRemark: domain.userRemark ?? undefined,
    notice: domain.notice,
    allowOperation: domain.allowOperation,
    registerDuration: domain.registerDuration,
    renewDays: domain.renewDays,
  };
}

function mapRecordToUnifiedRecord(rec: DnsnekoRecord, accountId: string): UnifiedRecord {
  return {
    id: rec.id,
    domainId: rec.domainId || '',
    accountId,
    platform: 'dnsneko',
    name: rec.name,
    type: rec.type,
    value: rec.value,
    line: rec.line,
    ttl: rec.ttl,
    priority: rec.priority,
    status: rec.status === 1 ? 'active' : rec.status === 0 ? 'paused' : rec.status ?? 'active',
    remark: rec.remark,
    updatedAt: rec.updateTime ?? undefined,
    nekoRecordId: rec.id,
  };
}

export class DnsnekoAdapter implements DNSPlatformAdapter {
  readonly platform = 'dnsneko' as const;

  private async request<T = unknown>(
    credentials: DnsnekoCredentials,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, unknown>,
  ): Promise<DnsnekoApiResponse<T>> {
    await rateLimiter.acquire();

    const url = `${DNSNEKO_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'X-DNSNEKO-USERNAME': credentials.username,
      'X-DNSNEKO-API-KEY': credentials.apiKey,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`DNSNEKO API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as DnsnekoApiResponse<T>;

    if (data.code !== 0 && data.code !== 200) {
      throw new Error(`DNSNEKO API error [${data.errorCode || data.code}]: ${data.message}`);
    }

    return data;
  }

  async listDomains(
    credentials: PlatformCredentials,
    page = 1,
    pageSize = 20,
  ): Promise<DomainListResult> {
    assertDnsnekoCredentials(credentials);

    const result = await this.request<DnsnekoDomainListData>(
      credentials,
      `/domains?page=${page}&size=${pageSize}`,
    );

    const domainData = result.data;
    // API returns "domains" array, not "list"
    const domains = domainData?.domains ?? [];
    // API returns total/size/current as strings
    const total = Number(domainData?.total ?? 0);
    const currentPage = Number(domainData?.current ?? page);
    const currentPageSize = Number(domainData?.size ?? pageSize);

    return {
      domains: domains.map((d) => mapDomainToUnifiedDomain(d, '')),
      total,
      page: currentPage,
      pageSize: currentPageSize,
      hasMore: currentPage * currentPageSize < total,
    };
  }

  async getDomainDetail(credentials: PlatformCredentials, domainId: string): Promise<UnifiedDomain> {
    assertDnsnekoCredentials(credentials);

    // API returns { data: { domain: {...} } } — the domain is nested under "domain" key
    const result = await this.request<DnsnekoDomainDetailData>(
      credentials,
      `/domains/${domainId}`,
    );

    return mapDomainToUnifiedDomain(result.data.domain, '');
  }

  async listRecords(credentials: PlatformCredentials, domainId: string): Promise<RecordListResult> {
    assertDnsnekoCredentials(credentials);

    const result = await this.request<DnsnekoRecordListData>(
      credentials,
      `/records?domainId=${domainId}&page=1&size=20`,
    );

    const recordData = result.data;
    // API returns "records" array, not "list"
    const records = recordData?.records ?? [];
    // API returns total/size/current as strings
    const total = Number(recordData?.total ?? records.length);
    const currentPage = Number(recordData?.current ?? 1);
    const currentPageSize = Number(recordData?.size ?? 20);

    return {
      records: records.map((rec) => mapRecordToUnifiedRecord(rec, '')),
      total,
      page: currentPage,
      pageSize: currentPageSize,
      hasMore: currentPage * currentPageSize < total,
    };
  }

  async createRecord(
    credentials: PlatformCredentials,
    domainId: string,
    input: CreateRecordInput,
  ): Promise<UnifiedRecord> {
    assertDnsnekoCredentials(credentials);

    const body: Record<string, unknown> = {
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
      if (input.caaFlag != null) body.caaFlag = input.caaFlag;
      if (input.caaTag) body.caaTag = input.caaTag;
      if (input.caaValue) body.caaValue = input.caaValue;
    }

    const result = await this.request<DnsnekoRecord>(
      credentials,
      `/records/${domainId}`,
      'POST',
      body,
    );

    return mapRecordToUnifiedRecord(result.data, '');
  }

  async updateRecord(
    credentials: PlatformCredentials,
    domainId: string,
    recordId: string,
    input: UpdateRecordInput,
  ): Promise<UnifiedRecord> {
    assertDnsnekoCredentials(credentials);

    const body: Record<string, unknown> = {};

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
      if (input.caaFlag != null) body.caaFlag = input.caaFlag;
      if (input.caaTag) body.caaTag = input.caaTag;
      if (input.caaValue) body.caaValue = input.caaValue;
    }

    const result = await this.request<DnsnekoRecord>(
      credentials,
      `/records/${domainId}/${recordId}`,
      'PUT',
      body,
    );

    return mapRecordToUnifiedRecord(result.data, '');
  }

  async deleteRecord(
    credentials: PlatformCredentials,
    domainId: string,
    recordId: string,
  ): Promise<void> {
    assertDnsnekoCredentials(credentials);

    await this.request(
      credentials,
      `/records/${domainId}/${recordId}`,
      'DELETE',
    );
  }

  async toggleRecordStatus(
    credentials: PlatformCredentials,
    recordId: string,
    enabled: boolean,
  ): Promise<void> {
    assertDnsnekoCredentials(credentials);

    await this.request(
      credentials,
      `/records/${recordId}/status`,
      'POST',
      { status: enabled ? 1 : 0 },
    );
  }

  async batchOperation(
    credentials: PlatformCredentials,
    input: BatchOperationInput,
  ): Promise<void> {
    assertDnsnekoCredentials(credentials);

    const { operation, recordIds, domainId } = input;

    const batchEndpoints: Record<string, string> = {
      status: '/records/batch/status',
      delete: '/records/batch/delete',
      ttl: '/records/batch/ttl',
      line: '/records/batch/line',
    };

    const endpoint = batchEndpoints[operation];
    if (!endpoint) {
      throw new Error(`DNSNEKO batch operation not supported: ${operation}`);
    }

    // API uses "ids" not "recordIds"
    const body: Record<string, unknown> = {
      domainId,
      ids: recordIds,
    };

    if (operation === 'status' && input.status != null) {
      body.status = input.status;
    }
    if (operation === 'ttl' && input.ttl != null) {
      body.ttl = input.ttl;
    }
    if (operation === 'line' && input.line != null) {
      body.line = input.line;
    }

    await this.request(credentials, endpoint, 'POST', body);
  }

  async testConnection(credentials: PlatformCredentials): Promise<ConnectionTestResult> {
    assertDnsnekoCredentials(credentials);

    try {
      const result = await this.request<DnsnekoDomainListData>(
        credentials,
        '/domains?page=1&size=1',
      );

      const firstDomain = result.data?.domains?.[0];

      return {
        success: true,
        message: 'DNSNEKO connection successful',
        platform: 'dnsneko',
        accountName: firstDomain?.domain,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'DNSNEKO connection failed',
        platform: 'dnsneko',
      };
    }
  }
}
