import type {
  UnifiedDomain,
  UnifiedDnsRecord,
  DomainListParams,
  DnsRecordListParams,
  CreateDnsRecordParams,
  UpdateDnsRecordParams,
  Pagination,
  DnsheQuota,
  DnsheApiKey,
  DnsheCredential,
} from '../types';
import type { DomainProvider } from './types';
import { apiClient } from '../lib/api';

// --- Raw DNSHE API response types ---

interface DnsheSubdomainRaw {
  id: number;
  subdomain: string;
  rootdomain: string;
  full_domain: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

interface DnsheSubdomainListResponse {
  success: boolean;
  count: number;
  subdomains: DnsheSubdomainRaw[];
  pagination?: {
    page: number;
    per_page: number;
    has_more: boolean;
    next_page: number | null;
    prev_page: number | null;
    total: number;
  };
  message?: string;
  error?: string;
  error_code?: string;
}

interface DnsheSubdomainDetailResponse {
  success: boolean;
  subdomain: DnsheSubdomainRaw & { expires_at?: string };
  dns_records: DnsheDnsRecordRaw[];
  dns_count: number;
  message?: string;
  error?: string;
  error_code?: string;
}

interface DnsheDnsRecordRaw {
  id: number;
  record_id?: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  priority: number | null;
  line: string | null;
  proxied: boolean;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface DnsheDnsRecordListResponse {
  success: boolean;
  count: number;
  records: DnsheDnsRecordRaw[];
  message?: string;
  error?: string;
  error_code?: string;
}

interface DnsheDnsRecordMutationResponse {
  success: boolean;
  message?: string;
  id?: number;
  record_id?: string;
  error?: string;
  error_code?: string;
}

interface DnsheSubdomainRegisterResponse {
  success: boolean;
  message?: string;
  subdomain_id?: number;
  full_domain?: string;
  error?: string;
  error_code?: string;
}

interface DnsheSubdomainDeleteResponse {
  success: boolean;
  message?: string;
  subdomain_id?: number;
  full_domain?: string;
  dns_records_deleted?: number;
  error?: string;
  error_code?: string;
}

interface DnsheSubdomainRenewResponse {
  success: boolean;
  message?: string;
  subdomain_id?: number;
  subdomain?: string;
  previous_expires_at?: string;
  new_expires_at?: string;
  renewed_at?: string;
  never_expires?: number;
  status?: string;
  remaining_days?: number;
  charged_amount?: number;
  error?: string;
  error_code?: string;
}

interface DnsheQuotaResponse {
  success: boolean;
  quota: {
    used: number;
    base: number;
    invite_bonus: number;
    total: number;
    available: number;
  };
  message?: string;
  error?: string;
  error_code?: string;
}

interface DnsheApiKeyRaw {
  id: number;
  key_name: string;
  api_key: string;
  status: string;
  request_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface DnsheApiKeyListResponse {
  success: boolean;
  count: number;
  keys: DnsheApiKeyRaw[];
  message?: string;
  error?: string;
  error_code?: string;
}

interface DnsheApiKeyCreateResponse {
  success: boolean;
  message?: string;
  api_key?: string;
  api_secret?: string;
  warning?: string;
  error?: string;
  error_code?: string;
}

interface DnsheApiKeyDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
}

interface DnsheApiKeyRegenerateResponse {
  success: boolean;
  message?: string;
  api_key?: string;
  api_secret?: string;
  warning?: string;
  error?: string;
  error_code?: string;
}

interface DnsheWhoisResponse {
  success: boolean;
  domain?: string;
  status?: string;
  registered?: boolean;
  registered_at?: string;
  expires_at?: string;
  registrant_email?: string;
  nameservers?: string[];
  message?: string;
  error?: string;
  error_code?: string;
}

// --- Constants ---

const BASE_URL = 'https://api005.dnshe.com/index.php';

// --- Provider implementation ---

export class DnsheProvider implements DomainProvider {
  readonly type = 'dnshe';
  readonly name = 'DNSHE';
  readonly description = 'DNSHE 免费域名服务';

  private apiKey: string | null = null;
  private apiSecret: string | null = null;

  setCredentials(credentials: DnsheCredential): void {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    if (this.apiSecret) headers['X-API-Secret'] = this.apiSecret;
    return headers;
  }

  private buildUrl(endpoint: string, action?: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(BASE_URL);
    url.searchParams.set('m', 'domain_hub');
    url.searchParams.set('endpoint', endpoint);
    if (action) url.searchParams.set('action', action);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private ensureCredentials(): void {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('DNSHE API credentials not configured. Call setCredentials() first.');
    }
  }

  private throwIfFailed<T extends { success?: boolean; message?: string; error?: string; error_code?: string }>(raw: T, label: string): void {
    if (raw.success === false) {
      throw new Error(raw.message || raw.error || `${label} failed`);
    }
  }

  private mapSubdomainStatus(status: string): UnifiedDomain['status'] {
    switch (status) {
      case 'active': return 'active';
      case 'suspended': return 'suspended';
      case 'expired': return 'expired';
      default: return 'unknown';
    }
  }

  private mapRecordStatus(status: string): UnifiedDnsRecord['status'] {
    switch (status) {
      case 'active': return 'active';
      case 'paused': return 'paused';
      default: return 'unknown';
    }
  }

  private mapSubdomainToDomain(sub: DnsheSubdomainRaw, recordCount = 0): UnifiedDomain {
    return {
      id: String(sub.id),
      name: sub.full_domain,
      provider: 'dnshe',
      status: this.mapSubdomainStatus(sub.status),
      expireTime: sub.expires_at ?? null,
      recordCount,
      createdAt: sub.created_at ?? null,
      rootDomain: sub.rootdomain,
      subdomainId: sub.id,
    };
  }

  private mapRecordToUnified(rec: DnsheDnsRecordRaw, domainId: string): UnifiedDnsRecord {
    return {
      id: String(rec.id),
      domainId,
      name: rec.name,
      type: rec.type,
      value: rec.content,
      line: rec.line || 'default',
      ttl: rec.ttl,
      priority: rec.priority,
      status: this.mapRecordStatus(rec.status),
      remark: '',
      updatedAt: rec.updated_at ?? rec.created_at ?? null,
      provider: 'dnshe',
      recordId: rec.record_id,
      proxied: rec.proxied,
    };
  }

  // --- Domain operations ---

  async listDomains(params: DomainListParams): Promise<{ domains: UnifiedDomain[]; pagination: Pagination }> {
    this.ensureCredentials();

    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (params.page) queryParams.page = params.page;
    if (params.size) queryParams.per_page = params.size;
    if (params.search) queryParams.search = params.search;
    if (params.status) queryParams.status = params.status;
    if (params.sortBy) queryParams.sort_by = params.sortBy;
    if (params.sortDir) queryParams.sort_dir = params.sortDir;
    if (params.rootdomain) queryParams.rootdomain = params.rootdomain;
    if (params.createdFrom) queryParams.created_from = params.createdFrom;
    if (params.createdTo) queryParams.created_to = params.createdTo;
    queryParams.include_total = true;

    const url = this.buildUrl('subdomains', 'list', queryParams);
    const result = await apiClient.request<DnsheSubdomainListResponse>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to list domains');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'List domains');

    const domains = (raw.subdomains ?? []).map(s => this.mapSubdomainToDomain(s));

    let pagination: Pagination;
    if (raw.pagination) {
      pagination = {
        page: raw.pagination.page,
        size: raw.pagination.per_page,
        total: raw.pagination.total,
        pages: Math.ceil(raw.pagination.total / raw.pagination.per_page) || 1,
      };
    } else {
      pagination = {
        page: params.page ?? 1,
        size: params.size ?? 20,
        total: raw.count,
        pages: Math.ceil(raw.count / (params.size ?? 20)) || 1,
      };
    }

    return { domains, pagination };
  }

  async getDomainDetail(domainId: string): Promise<UnifiedDomain> {
    this.ensureCredentials();

    const subdomainId = Number(domainId);
    if (isNaN(subdomainId)) {
      throw new Error(`Invalid DNSHE domain ID: ${domainId}`);
    }

    const url = this.buildUrl('subdomains', 'get', { subdomain_id: subdomainId });
    const result = await apiClient.request<DnsheSubdomainDetailResponse>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get domain detail');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Get domain detail');

    return this.mapSubdomainToDomain(raw.subdomain, raw.dns_count);
  }

  // --- DNS record operations ---

  async listDnsRecords(params: DnsRecordListParams): Promise<{ records: UnifiedDnsRecord[]; pagination: Pagination }> {
    this.ensureCredentials();

    const subdomainId = Number(params.domainId);
    if (isNaN(subdomainId)) {
      throw new Error(`Invalid DNSHE domain ID: ${params.domainId}`);
    }

    const url = this.buildUrl('dns_records', 'list', { subdomain_id: subdomainId });
    const result = await apiClient.request<DnsheDnsRecordListResponse>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to list DNS records');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'List DNS records');

    const domainId = params.domainId;
    const records = (raw.records ?? []).map(r => this.mapRecordToUnified(r, domainId));

    const pagination: Pagination = {
      page: params.page ?? 1,
      size: params.size ?? raw.count,
      total: raw.count,
      pages: 1,
    };

    return { records, pagination };
  }

  async createDnsRecord(params: CreateDnsRecordParams): Promise<UnifiedDnsRecord> {
    this.ensureCredentials();

    const subdomainId = Number(params.domainId);
    if (isNaN(subdomainId)) {
      throw new Error(`Invalid DNSHE domain ID: ${params.domainId}`);
    }

    const url = this.buildUrl('dns_records', 'create');
    const body: Record<string, unknown> = {
      subdomain_id: subdomainId,
      type: params.type,
      content: params.value,
    };
    if (params.name) body.name = params.name;
    if (params.ttl !== undefined) body.ttl = params.ttl;
    if (params.priority !== undefined && params.priority !== null) body.priority = params.priority;
    if (params.line) body.line = params.line;

    const result = await apiClient.request<DnsheDnsRecordMutationResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create DNS record');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Create DNS record');

    return {
      id: String(raw.id ?? ''),
      domainId: params.domainId,
      name: params.name || '',
      type: params.type,
      value: params.value,
      line: params.line || 'default',
      ttl: params.ttl ?? 600,
      priority: params.priority ?? null,
      status: 'active' as const,
      remark: params.remark ?? '',
      updatedAt: new Date().toISOString(),
      provider: 'dnshe' as const,
      recordId: raw.record_id,
      proxied: false,
    };
  }

  async updateDnsRecord(params: UpdateDnsRecordParams): Promise<UnifiedDnsRecord> {
    this.ensureCredentials();

    const recordIdNum = Number(params.recordId);
    if (isNaN(recordIdNum)) {
      throw new Error(`Invalid DNSHE record ID: ${params.recordId}`);
    }

    const url = this.buildUrl('dns_records', 'update');
    const body: Record<string, unknown> = {
      id: recordIdNum,
    };
    if (params.type) body.type = params.type;
    if (params.name) body.name = params.name;
    if (params.value) body.content = params.value;
    if (params.ttl !== undefined) body.ttl = params.ttl;
    if (params.priority !== undefined && params.priority !== null) body.priority = params.priority;
    if (params.line) body.line = params.line;

    const result = await apiClient.request<DnsheDnsRecordMutationResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update DNS record');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Update DNS record');

    return {
      id: String(raw.id ?? params.recordId),
      domainId: params.domainId,
      name: params.name ?? '',
      type: params.type ?? '',
      value: params.value ?? '',
      line: params.line ?? 'default',
      ttl: params.ttl ?? 600,
      priority: params.priority ?? null,
      status: 'active' as const,
      remark: params.remark ?? '',
      updatedAt: new Date().toISOString(),
      provider: 'dnshe' as const,
      recordId: raw.record_id,
      proxied: false,
    };
  }

  async deleteDnsRecord(domainId: string, recordId: string): Promise<void> {
    this.ensureCredentials();

    // domainId is kept for interface consistency but DNSHE delete uses record id
    void domainId;

    const recordIdNum = Number(recordId);
    if (isNaN(recordIdNum)) {
      throw new Error(`Invalid DNSHE record ID: ${recordId}`);
    }

    const url = this.buildUrl('dns_records', 'delete');
    const result = await apiClient.request<DnsheDnsRecordMutationResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id: recordIdNum }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete DNS record');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Delete DNS record');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async toggleDnsRecordStatus(_recordId: string, _enabled: boolean): Promise<void> {
    throw new Error('DNSHE provider does not support toggling DNS record status. This operation is not available for DNSHE domains.');
  }

  // --- Connection test ---

  async testConnection(): Promise<boolean> {
    if (!this.apiKey || !this.apiSecret) return false;
    try {
      const url = this.buildUrl('quota');
      const result = await apiClient.request<DnsheQuotaResponse>(url, {
        headers: this.getAuthHeaders(),
      });
      if (!result.success) return false;
      return result.data?.success === true;
    } catch {
      return false;
    }
  }

  // --- Provider-specific: Quota ---

  async getQuota(): Promise<DnsheQuota> {
    this.ensureCredentials();

    const url = this.buildUrl('quota');
    const result = await apiClient.request<DnsheQuotaResponse>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get quota');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Get quota');

    return {
      used: raw.quota.used,
      base: raw.quota.base,
      inviteBonus: raw.quota.invite_bonus,
      total: raw.quota.total,
      available: raw.quota.available,
    };
  }

  // --- Provider-specific: API Keys ---

  async listApiKeys(): Promise<DnsheApiKey[]> {
    this.ensureCredentials();

    const url = this.buildUrl('keys', 'list');
    const result = await apiClient.request<DnsheApiKeyListResponse>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to list API keys');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'List API keys');

    return (raw.keys ?? []).map(k => ({
      id: k.id,
      keyName: k.key_name,
      apiKey: k.api_key.length > 8
        ? k.api_key.slice(0, 4) + '****' + k.api_key.slice(-4)
        : '****',
      status: k.status,
      requestCount: k.request_count,
      lastUsedAt: k.last_used_at,
      createdAt: k.created_at,
    }));
  }

  async createApiKey(keyName: string, ipWhitelist?: string): Promise<{ apiKey: string; apiSecret: string }> {
    this.ensureCredentials();

    const url = this.buildUrl('keys', 'create');
    const body: Record<string, unknown> = { key_name: keyName };
    if (ipWhitelist) body.ip_whitelist = ipWhitelist;

    const result = await apiClient.request<DnsheApiKeyCreateResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create API key');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Create API key');

    return {
      apiKey: raw.api_key ?? '',
      apiSecret: raw.api_secret ?? '',
    };
  }

  async deleteApiKey(keyId: number): Promise<void> {
    this.ensureCredentials();

    const url = this.buildUrl('keys', 'delete');
    const result = await apiClient.request<DnsheApiKeyDeleteResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ key_id: keyId }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete API key');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Delete API key');
  }

  async regenerateApiKey(keyId: number): Promise<{ apiKey: string; apiSecret: string }> {
    this.ensureCredentials();

    const url = this.buildUrl('keys', 'regenerate');
    const result = await apiClient.request<DnsheApiKeyRegenerateResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ key_id: keyId }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to regenerate API key');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Regenerate API key');

    return {
      apiKey: raw.api_key ?? '',
      apiSecret: raw.api_secret ?? '',
    };
  }

  // --- Provider-specific: Subdomain operations ---

  async registerSubdomain(subdomain: string, rootdomain: string): Promise<{ subdomainId: number; fullDomain: string }> {
    this.ensureCredentials();

    const url = this.buildUrl('subdomains', 'register');
    const result = await apiClient.request<DnsheSubdomainRegisterResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ subdomain, rootdomain }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to register subdomain');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Register subdomain');

    return {
      subdomainId: raw.subdomain_id ?? 0,
      fullDomain: raw.full_domain ?? '',
    };
  }

  async deleteSubdomain(subdomainId: number): Promise<{ dnsRecordsDeleted: number }> {
    this.ensureCredentials();

    const url = this.buildUrl('subdomains', 'delete');
    const result = await apiClient.request<DnsheSubdomainDeleteResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ subdomain_id: subdomainId }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete subdomain');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Delete subdomain');

    return { dnsRecordsDeleted: raw.dns_records_deleted ?? 0 };
  }

  async renewSubdomain(subdomainId: number): Promise<{
    previousExpiresAt: string;
    newExpiresAt: string;
    renewedAt: string;
    remainingDays: number;
    chargedAmount: number;
  }> {
    this.ensureCredentials();

    const url = this.buildUrl('subdomains', 'renew');
    const result = await apiClient.request<DnsheSubdomainRenewResponse>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ subdomain_id: subdomainId }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to renew subdomain');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.throwIfFailed(raw, 'Renew subdomain');

    return {
      previousExpiresAt: raw.previous_expires_at ?? '',
      newExpiresAt: raw.new_expires_at ?? '',
      renewedAt: raw.renewed_at ?? '',
      remainingDays: raw.remaining_days ?? 0,
      chargedAmount: raw.charged_amount ?? 0,
    };
  }

  // --- Provider-specific: WHOIS ---

  async whois(domain: string): Promise<{
    registered: boolean;
    status?: string;
    registeredAt?: string;
    expiresAt?: string;
    registrantEmail?: string;
    nameservers?: string[];
  }> {
    const url = this.buildUrl('whois', undefined, { domain });
    const headers = this.getAuthHeaders();
    const result = await apiClient.request<DnsheWhoisResponse>(url, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to query WHOIS');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');

    if (raw.registered === false) {
      return { registered: false, status: raw.status };
    }

    return {
      registered: true,
      status: raw.status,
      registeredAt: raw.registered_at,
      expiresAt: raw.expires_at,
      registrantEmail: raw.registrant_email,
      nameservers: raw.nameservers,
    };
  }
}
