// Shared types for the DNS Manager application

// Provider types
export type ProviderType = 'dnshe' | 'dnsneko';

// Unified domain model
export interface UnifiedDomain {
  id: string;
  name: string;           // full domain name
  provider: ProviderType;
  status: 'active' | 'suspended' | 'expired' | 'unknown';
  expireTime: string | null;
  recordCount: number;
  createdAt: string | null;
  rootDomain?: string;
  // DNSHE specific
  subdomainId?: number;
  // DNSNeko specific
  domainId?: string;
  userRemark?: string | null;
  notice?: string;
  allowOperation?: boolean;
  registerDuration?: number;
  renewDays?: number;
}

// Unified DNS record model
export interface UnifiedDnsRecord {
  id: string;
  domainId: string;
  name: string;           // host record
  type: string;           // A, AAAA, CNAME, MX, TXT, NS, SRV, CAA
  value: string;          // record value / content
  line: string;           // resolution line
  ttl: number;
  priority: number | null;
  status: 'active' | 'paused' | 'unknown';
  remark: string;
  updatedAt: string | null;
  provider: ProviderType;
  // DNSHE specific
  recordId?: string;
  proxied?: boolean;
}

// Pagination
export interface Pagination {
  page: number;
  size: number;
  total: number;
  pages: number;
}

// Domain list params
export interface DomainListParams {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  rootdomain?: string;
  createdFrom?: string;
  createdTo?: string;
}

// DNS record list params
export interface DnsRecordListParams {
  domainId: string;
  page?: number;
  size?: number;
  type?: string;
  line?: string;
  status?: number | string;
  keyword?: string;
}

// Create DNS record params
export interface CreateDnsRecordParams {
  domainId: string;
  name: string;
  type: string;
  value: string;
  line?: string;
  ttl?: number;
  priority?: number | null;
  remark?: string;
}

// Update DNS record params
export interface UpdateDnsRecordParams {
  recordId: string;
  domainId: string;
  name?: string;
  type?: string;
  value?: string;
  line?: string;
  ttl?: number;
  priority?: number | null;
  remark?: string;
}

// Batch operation params
export interface BatchOperationParams {
  domainId: string | number;
  ids: (string | number)[];
  status?: number;
  ttl?: number;
  line?: string;
}

// API credential
export interface ApiCredential {
  id: string;
  provider: ProviderType;
  label: string;
  status: 'valid' | 'invalid' | 'unconfigured';
  lastVerified: string | null;
  createdAt: string;
}

// DNSHE credential
export interface DnsheCredential {
  apiKey: string;
  apiSecret: string;
}

// DNSNeko credential
export interface DnsnekoCredential {
  username: string;
  apiKey: string;
}

// Sync task
export interface SyncTask {
  id: string;
  type: 'full' | 'incremental';
  provider: ProviderType | 'all';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// Operation log
export interface OperationLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  target: string;
  result: 'success' | 'failure';
  detail: string | null;
}

// DNSHE quota
export interface DnsheQuota {
  used: number;
  base: number;
  inviteBonus: number;
  total: number;
  available: number;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  errorCode: string | null;
}

// DNSHE API key
export interface DnsheApiKey {
  id: number;
  keyName: string;
  apiKey: string;
  status: string;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}
