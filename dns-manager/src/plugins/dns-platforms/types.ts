// Unified data models for cross-platform DNS management

export interface UnifiedDomain {
  id: string;
  accountId: string;
  platform: 'dnshe' | 'dnsneko';
  domain: string;           // Full domain name (e.g., "test.example.com")
  rootDomain?: string;      // Root domain (e.g., ".os.kg")
  status: 'active' | 'suspended' | 'expired' | number;  // Platform-specific status
  statusText?: string;      // Human-readable status
  createdAt?: string;       // ISO 8601
  updatedAt?: string;       // ISO 8601
  expireTime?: string;      // ISO 8601
  expired?: boolean;
  recordCount?: number | string;
  // DNSHE-specific
  subdomainId?: number;     // DNSHE numeric subdomain ID
  subdomain?: string;       // DNSHE subdomain prefix
  // DNSNEKO-specific
  domainId?: string;        // DNSNEKO domain ID
  userRemark?: string;
  notice?: string;
  allowOperation?: number;
  registerDuration?: number;
  renewDays?: number;
}

export interface UnifiedRecord {
  id: string;               // Record unique ID
  domainId: string;         // Domain ID (platform-specific)
  accountId: string;
  platform: 'dnshe' | 'dnsneko';
  name: string;             // Host record (e.g., "www", "@")
  type: string;             // Record type (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA)
  value: string;            // Record value
  line?: string;            // Resolution line (e.g., "default", "telecom")
  ttl: number;              // TTL in seconds
  priority?: number | null; // Priority for MX/SRV
  status: 'active' | 'paused' | number;  // Record status
  remark?: string;          // Comment/remark
  updatedAt?: string;       // ISO 8601
  // DNSHE-specific
  recordId?: string;        // DNSHE cloud provider record ID
  proxied?: boolean;
  // DNSNEKO-specific
  nekoRecordId?: string;    // DNSNEKO record ID
}

export interface DomainListResult {
  domains: UnifiedDomain[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface RecordListResult {
  records: UnifiedRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateRecordInput {
  name: string;
  type: string;
  value: string;
  line?: string;
  ttl: number;
  priority?: number;
  remark?: string;
  // DNSHE-specific
  subdomainId?: number;
  // SRV-specific
  weight?: number;
  port?: number;
  target?: string;
  // CAA-specific
  caaFlag?: number;
  caaTag?: string;
  caaValue?: string;
}

export interface UpdateRecordInput extends Partial<CreateRecordInput> {
  id: string;               // Record ID to update
}

export interface BatchOperationInput {
  domainId: string;
  recordIds: string[];
  operation: 'status' | 'delete' | 'ttl' | 'line';
  status?: number;          // 1=enable, 0=disable (for status operation)
  ttl?: number;             // For ttl operation
  line?: string;            // For line operation
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  platform: 'dnshe' | 'dnsneko';
  accountName?: string;
}

// Platform credentials (stored encrypted, decrypted at runtime)
export interface DnsheCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface DnsnekoCredentials {
  username: string;
  apiKey: string;
}

export type PlatformCredentials = DnsheCredentials | DnsnekoCredentials;

// The main adapter interface
export interface DNSPlatformAdapter {
  readonly platform: 'dnshe' | 'dnsneko';

  // Domain operations
  listDomains(credentials: PlatformCredentials, page?: number, pageSize?: number): Promise<DomainListResult>;
  getDomainDetail(credentials: PlatformCredentials, domainId: string): Promise<UnifiedDomain>;

  // DNS Record operations
  listRecords(credentials: PlatformCredentials, domainId: string): Promise<RecordListResult>;
  createRecord(credentials: PlatformCredentials, domainId: string, input: CreateRecordInput): Promise<UnifiedRecord>;
  updateRecord(credentials: PlatformCredentials, domainId: string, recordId: string, input: UpdateRecordInput): Promise<UnifiedRecord>;
  deleteRecord(credentials: PlatformCredentials, domainId: string, recordId: string): Promise<void>;

  // Status toggle
  toggleRecordStatus(credentials: PlatformCredentials, recordId: string, enabled: boolean): Promise<void>;

  // Batch operations (DNSNEKO only, DNSHE should throw unsupported)
  batchOperation(credentials: PlatformCredentials, input: BatchOperationInput): Promise<void>;

  // Connection test
  testConnection(credentials: PlatformCredentials): Promise<ConnectionTestResult>;
}
