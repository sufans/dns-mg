import type {
  UnifiedDomain,
  UnifiedDnsRecord,
  DomainListParams,
  DnsRecordListParams,
  CreateDnsRecordParams,
  UpdateDnsRecordParams,
  BatchOperationParams,
  Pagination,
  DnsnekoCredential,
} from '../types';
import type { DomainProvider } from './types';
import { apiClient } from '../lib/api';

// --- Raw DNSNeko API response types ---

interface DnsnekoDomainRaw {
  id: string;
  domain: string;
  status: number;
  expired: boolean;
  expireTime: string;
  recordCount: string;
}

interface DnsnekoDomainDetailRaw {
  id: string;
  domain: string;
  rootDomain: string;
  status: number;
  userRemark: string | null;
  notice: string;
  rootStatus: number;
  rootNotice: string;
  allowOperation: number;
  createTime: string;
  expireTime: string;
  expired: boolean;
  expiredNotice: string | null;
  registerDuration: number;
  renewDays: number;
  recordCount: string | null;
}

interface DnsnekoDomainListData {
  domains: DnsnekoDomainRaw[];
  total: string;
  size: string;
  current: string;
  pages: string;
}

interface DnsnekoDomainDetailData {
  domain: DnsnekoDomainDetailRaw;
}

interface DnsnekoResponse<T> {
  code: number;
  errorCode: string | null;
  message: string;
  data: T | null;
}

interface DnsnekoDnsRecordRaw {
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

interface DnsnekoDnsRecordListData {
  domainId: string;
  domain: string;
  records: DnsnekoDnsRecordRaw[];
  total: string;
  size: string;
  current: string;
  pages: string;
}

// --- Constants ---

const BASE_URL = 'https://www.dnsneko.com/api/v1/dns';

// --- Provider implementation ---

export class DnsnekoProvider implements DomainProvider {
  readonly type = 'dnsneko';
  readonly name = 'DNSNeko';
  readonly description = 'DNSNeko 域名解析服务';

  private username: string | null = null;
  private apiKey: string | null = null;

  setCredentials(credentials: DnsnekoCredential): void {
    this.username = credentials.username;
    this.apiKey = credentials.apiKey;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.username) headers['X-DNSNEKO-USERNAME'] = this.username;
    if (this.apiKey) headers['X-DNSNEKO-API-KEY'] = this.apiKey;
    return headers;
  }

  private ensureCredentials(): void {
    if (!this.username || !this.apiKey) {
      throw new Error('DNSNeko API credentials not configured. Call setCredentials() first.');
    }
  }

  private checkDnsnekoResponse<T>(response: DnsnekoResponse<T>, label: string): T {
    if (response.code !== 200) {
      throw new Error(response.message || `${label} failed (code: ${response.code})`);
    }
    if (response.data === null || response.data === undefined) {
      throw new Error(response.message || `${label} returned no data`);
    }
    return response.data;
  }

  private mapDomainStatus(status: number, expired: boolean): UnifiedDomain['status'] {
    if (expired) return 'expired';
    switch (status) {
      case 0: return 'active';
      case 1: return 'active';
      default: return 'unknown';
    }
  }

  private mapRecordStatus(status: number): UnifiedDnsRecord['status'] {
    switch (status) {
      case 1: return 'active';
      case 0: return 'paused';
      default: return 'unknown';
    }
  }

  private mapDomainToUnified(domain: DnsnekoDomainRaw): UnifiedDomain {
    return {
      id: domain.id,
      name: domain.domain,
      provider: 'dnsneko',
      status: this.mapDomainStatus(domain.status, domain.expired),
      expireTime: domain.expireTime ?? null,
      recordCount: parseInt(domain.recordCount) || 0,
      createdAt: null,
      domainId: domain.id,
    };
  }

  private mapDomainDetailToUnified(domain: DnsnekoDomainDetailRaw): UnifiedDomain {
    return {
      id: domain.id,
      name: domain.domain,
      provider: 'dnsneko',
      status: this.mapDomainStatus(domain.status, domain.expired),
      expireTime: domain.expireTime ?? null,
      recordCount: domain.recordCount ? parseInt(domain.recordCount) : 0,
      createdAt: domain.createTime ?? null,
      rootDomain: domain.rootDomain,
      domainId: domain.id,
      userRemark: domain.userRemark,
      notice: domain.notice,
      allowOperation: domain.allowOperation === 1,
      registerDuration: domain.registerDuration,
      renewDays: domain.renewDays,
    };
  }

  private mapRecordToUnified(record: DnsnekoDnsRecordRaw, domainId: string): UnifiedDnsRecord {
    return {
      id: record.id,
      domainId,
      name: record.name,
      type: record.type,
      value: record.value,
      line: record.line,
      ttl: record.ttl,
      priority: record.priority,
      status: this.mapRecordStatus(record.status),
      remark: record.remark ?? '',
      updatedAt: record.updateTime ?? null,
      provider: 'dnsneko',
    };
  }

  // --- Domain operations ---

  async listDomains(params: DomainListParams): Promise<{ domains: UnifiedDomain[]; pagination: Pagination }> {
    this.ensureCredentials();

    const queryParams = new URLSearchParams();
    queryParams.set('page', String(params.page ?? 1));
    queryParams.set('size', String(params.size ?? 20));

    const url = `${BASE_URL}/domains?${queryParams.toString()}`;
    const result = await apiClient.request<DnsnekoResponse<DnsnekoDomainListData>>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to list domains');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');

    const data = this.checkDnsnekoResponse(raw, 'List domains');

    const domains = (data.domains ?? []).map(d => this.mapDomainToUnified(d));

    const pagination: Pagination = {
      page: parseInt(data.current) || 1,
      size: parseInt(data.size) || 20,
      total: parseInt(data.total) || 0,
      pages: parseInt(data.pages) || 1,
    };

    return { domains, pagination };
  }

  async getDomainDetail(domainId: string): Promise<UnifiedDomain> {
    this.ensureCredentials();

    const url = `${BASE_URL}/domains/${encodeURIComponent(domainId)}`;
    const result = await apiClient.request<DnsnekoResponse<DnsnekoDomainDetailData>>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get domain detail');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');

    const data = this.checkDnsnekoResponse(raw, 'Get domain detail');

    return this.mapDomainDetailToUnified(data.domain);
  }

  // --- DNS record operations ---

  async listDnsRecords(params: DnsRecordListParams): Promise<{ records: UnifiedDnsRecord[]; pagination: Pagination }> {
    this.ensureCredentials();

    const queryParams = new URLSearchParams();
    queryParams.set('domainId', params.domainId);
    queryParams.set('page', String(params.page ?? 1));
    queryParams.set('size', String(params.size ?? 20));
    if (params.type) queryParams.set('type', params.type);
    if (params.line) queryParams.set('line', params.line);
    if (params.status !== undefined) queryParams.set('status', String(params.status));
    if (params.keyword) queryParams.set('keyword', params.keyword);

    const url = `${BASE_URL}/records?${queryParams.toString()}`;
    const result = await apiClient.request<DnsnekoResponse<DnsnekoDnsRecordListData>>(url, {
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to list DNS records');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');

    const data = this.checkDnsnekoResponse(raw, 'List DNS records');

    const domainId = params.domainId;
    const records = (data.records ?? []).map(r => this.mapRecordToUnified(r, domainId));

    const pagination: Pagination = {
      page: parseInt(data.current) || 1,
      size: parseInt(data.size) || 20,
      total: parseInt(data.total) || 0,
      pages: parseInt(data.pages) || 1,
    };

    return { records, pagination };
  }

  async createDnsRecord(params: CreateDnsRecordParams): Promise<UnifiedDnsRecord> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/${encodeURIComponent(params.domainId)}`;
    const body: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      value: params.value,
      line: params.line || 'default',
      ttl: params.ttl ?? 600,
    };
    if (params.remark) body.remark = params.remark;

    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create DNS record');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Create DNS record');

    return {
      id: '',
      domainId: params.domainId,
      name: params.name,
      type: params.type,
      value: params.value,
      line: params.line || 'default',
      ttl: params.ttl ?? 600,
      priority: params.priority ?? null,
      status: 'active',
      remark: params.remark ?? '',
      updatedAt: null,
      provider: 'dnsneko',
    };
  }

  async updateDnsRecord(params: UpdateDnsRecordParams): Promise<UnifiedDnsRecord> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/${encodeURIComponent(params.domainId)}/${encodeURIComponent(params.recordId)}`;
    const body: Record<string, unknown> = {
      name: params.name ?? '',
      type: params.type ?? '',
      value: params.value ?? '',
      line: params.line ?? 'default',
      ttl: params.ttl ?? 600,
    };
    if (params.remark !== undefined) body.remark = params.remark;

    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update DNS record');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Update DNS record');

    return {
      id: params.recordId,
      domainId: params.domainId,
      name: params.name ?? '',
      type: params.type ?? '',
      value: params.value ?? '',
      line: params.line ?? 'default',
      ttl: params.ttl ?? 600,
      priority: params.priority ?? null,
      status: 'active',
      remark: params.remark ?? '',
      updatedAt: null,
      provider: 'dnsneko',
    };
  }

  async deleteDnsRecord(domainId: string, recordId: string): Promise<void> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/${encodeURIComponent(domainId)}/${encodeURIComponent(recordId)}`;
    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete DNS record');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Delete DNS record');
  }

  async toggleDnsRecordStatus(recordId: string, enabled: boolean): Promise<void> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/${encodeURIComponent(recordId)}/status`;
    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status: enabled ? 1 : 0 }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to toggle DNS record status');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Toggle DNS record status');
  }

  // --- Batch operations ---

  async batchUpdateStatus(params: BatchOperationParams): Promise<void> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/batch/status`;
    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        domainId: Number(params.domainId) || params.domainId,
        ids: params.ids.map(id => Number(id) || id),
        status: params.status,
      }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to batch update status');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Batch update status');
  }

  async batchDelete(params: BatchOperationParams): Promise<void> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/batch/delete`;
    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        domainId: Number(params.domainId) || params.domainId,
        ids: params.ids.map(id => Number(id) || id),
      }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to batch delete records');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Batch delete');
  }

  async batchUpdateTtl(params: BatchOperationParams): Promise<void> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/batch/ttl`;
    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        domainId: Number(params.domainId) || params.domainId,
        ids: params.ids.map(id => Number(id) || id),
        ttl: params.ttl,
      }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to batch update TTL');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Batch update TTL');
  }

  async batchUpdateLine(params: BatchOperationParams): Promise<void> {
    this.ensureCredentials();

    const url = `${BASE_URL}/records/batch/line`;
    const result = await apiClient.request<DnsnekoResponse<null>>(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        domainId: Number(params.domainId) || params.domainId,
        ids: params.ids.map(id => Number(id) || id),
        line: params.line,
      }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to batch update line');
    }

    const raw = result.data;
    if (!raw) throw new Error('No data returned');
    this.checkDnsnekoResponse(raw, 'Batch update line');
  }

  // --- Connection test ---

  async testConnection(): Promise<boolean> {
    if (!this.username || !this.apiKey) return false;
    try {
      const url = `${BASE_URL}/domains?page=1&size=1`;
      const result = await apiClient.request<DnsnekoResponse<DnsnekoDomainListData>>(url, {
        headers: this.getAuthHeaders(),
      });
      return result.success && result.data?.code === 200;
    } catch {
      return false;
    }
  }
}
