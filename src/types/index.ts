// Provider types
export type ProviderType = 'dnshe' | 'dnsneko';

// Account status
export type AccountStatus = 'valid' | 'invalid' | 'unverified';

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

// Platform credential union
export type PlatformCredential = DnsheCredential | DnsnekoCredential;

// Account entry - supports multiple accounts per provider
export interface AccountEntry {
  id: string;                          // unique account ID (uuid)
  provider: ProviderType;
  label: string;                       // user-defined account name
  tags: string[];                      // user-defined tags for filtering
  isDefault: boolean;                  // whether this is the default account for the provider
  credentials: PlatformCredential;
  status: AccountStatus;
  lastVerified: string | null;         // ISO 8601 timestamp
  createdAt: string;                   // ISO 8601 timestamp
  usageStats: UsageStats;
}

// Usage statistics per account
export interface UsageStats {
  totalRequests: number;
  lastRequestAt: string | null;
  dailyRequests: DailyRequest[];       // last 7 days
  recentCalls: RecentCall[];           // last 10 calls
}

// Daily request count
export interface DailyRequest {
  date: string;                        // YYYY-MM-DD
  count: number;
}

// Recent API call record
export interface RecentCall {
  timestamp: string;                   // ISO 8601
  endpoint: string;
  statusCode: number;
  duration: number;                    // ms
}

// Operation log
export interface OperationLog {
  id: string;
  timestamp: string;
  operator: string;
  action: 'add_account' | 'edit_account' | 'delete_account' | 'test_connection' | 'set_default' | 'login' | 'logout' | 'change_password' | 'update_settings';
  target: string;                      // account label or id
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

// Global config
export interface GlobalConfig {
  rateLimitPerMinute: number;          // default 50
  requestTimeout: number;              // ms, default 10000
  autoRetry: boolean;                  // default true
  maxRetries: number;                  // default 2
  credentialStorage: 'local' | 'cloudflare';  // default 'local'
}

// Provider info for UI
export interface ProviderInfo {
  type: ProviderType;
  name: string;
  description: string;
  icon: string;
  endpoint: string;
  credentialFields: CredentialField[];
}

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder: string;
  required: boolean;
}

// Pagination (kept for potential future use)
export interface Pagination {
  page: number;
  size: number;
  total: number;
  pages: number;
}

// Keep domain/record types for Provider layer compatibility
export interface UnifiedDomain {
  id: string;
  name: string;
  provider: ProviderType;
  status: 'active' | 'suspended' | 'expired' | 'unknown';
  expireTime: string | null;
  recordCount: number;
  createdAt: string | null;
  rootDomain?: string;
  subdomainId?: number;
  domainId?: string;
  // DNSHE specific
  userRemark?: string | null;
  notice?: string;
  allowOperation?: boolean;
  registerDuration?: number;
  renewDays?: number;
}

export interface UnifiedDnsRecord {
  id: string;
  domainId: string;
  name: string;
  type: string;
  value: string;
  line: string;
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

export interface DnsRecordListParams {
  domainId: string;
  page?: number;
  size?: number;
  type?: string;
  line?: string;
  status?: number | string;
  keyword?: string;
}

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

export interface BatchOperationParams {
  domainId: string | number;
  ids: (string | number)[];
  status?: number;
  ttl?: number;
  line?: string;
}

export interface DnsheApiKey {
  id: number;
  keyName: string;
  apiKey: string;
  status: string;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

// Sync task (kept for SyncTasksPage compatibility)
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

// Alert types
export type AlertType = 'rate_limit' | 'credential_invalid' | 'quota_warning' | 'system';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  accountId: string | null;
  accountLabel: string | null;
  createdAt: string;
  acknowledged: boolean;
}
