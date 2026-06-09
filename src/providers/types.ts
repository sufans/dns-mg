import type {
  UnifiedDomain,
  UnifiedDnsRecord,
  DomainListParams,
  DnsRecordListParams,
  CreateDnsRecordParams,
  UpdateDnsRecordParams,
  BatchOperationParams,
  Pagination,
  DnsheQuota,
  DnsheApiKey,
} from '../types';

export interface DomainProvider {
  readonly type: string;
  readonly name: string;
  readonly description: string;

  // Domain operations
  listDomains(params: DomainListParams): Promise<{ domains: UnifiedDomain[]; pagination: Pagination }>;
  getDomainDetail(domainId: string): Promise<UnifiedDomain>;

  // DNS record operations
  listDnsRecords(params: DnsRecordListParams): Promise<{ records: UnifiedDnsRecord[]; pagination: Pagination }>;
  createDnsRecord(params: CreateDnsRecordParams): Promise<UnifiedDnsRecord>;
  updateDnsRecord(params: UpdateDnsRecordParams): Promise<UnifiedDnsRecord>;
  deleteDnsRecord(domainId: string, recordId: string): Promise<void>;
  toggleDnsRecordStatus(recordId: string, enabled: boolean): Promise<void>;

  // Batch operations (optional, DNSNeko only)
  batchUpdateStatus?(params: BatchOperationParams): Promise<void>;
  batchDelete?(params: BatchOperationParams): Promise<void>;
  batchUpdateTtl?(params: BatchOperationParams): Promise<void>;
  batchUpdateLine?(params: BatchOperationParams): Promise<void>;

  // Connection test
  testConnection(): Promise<boolean>;

  // Provider-specific
  getQuota?(): Promise<DnsheQuota>;
  listApiKeys?(): Promise<DnsheApiKey[]>;
}
