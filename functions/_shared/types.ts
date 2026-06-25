export type DNSPlatform = 'dnshe' | 'dnsneko' | 'gleam';

export interface Env {
  DB: D1Database;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_ORIGIN?: string;
  AUTOMATION_SECRET?: string;
  LOG_RETENTION_DAYS?: string;
  EMAIL_FROM?: string;
  EMAIL_TO?: string;
  SEND_EMAIL?: { send(message: unknown): Promise<void> };
}

export interface AuthContext {
  username: string;
  csrf: string;
  iat: number;
  exp: number;
}

export interface ApiAccountConfig {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
}

export interface ApiAccountRow {
  id: number;
  platform: DNSPlatform;
  name: string;
  group_id: number | null;
  group_name: string | null;
  group_color: string | null;
  encrypted_config_json: string;
  enabled: number;
  last_check_at: string | null;
  last_check_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicApiAccount {
  id: number;
  platform: DNSPlatform;
  name: string;
  groupId: number | null;
  groupName: string | null;
  groupColor: string | null;
  enabled: boolean;
  maskedCredential: string;
  lastCheckAt: string | null;
  lastCheckStatus: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedDomain {
  id: string;
  name: string;
  platform: DNSPlatform;
  accountId: number;
  accountName: string;
  groupId: number | null;
  groupName: string | null;
  groupColor: string | null;
  status: string;
  dnsStatus: string;
  createdAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  remainingDays: number | null;
  renewStatus: string;
  recordCount: number | null;
  raw: unknown;
}

export interface UnifiedRecord {
  id: string;
  providerRecordId?: string | null;
  domainId: string;
  name: string;
  type: string;
  value: string;
  line: string | null;
  ttl: number;
  priority: number | null;
  remark: string | null;
  status: 'active' | 'paused';
  updatedAt: string | null;
  raw: unknown;
}

export interface DnsRecordInput {
  name: string;
  type: string;
  value: string;
  line?: string | null;
  ttl: number;
  priority?: number | null;
  remark?: string | null;
}

export interface AdapterCredentials {
  platform: DNSPlatform;
  config: ApiAccountConfig;
}

export interface AdapterListOptions {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
}

export interface DNSPlatformAdapter {
  platform: DNSPlatform;
  rateLimit: {
    accountWindowLimit: number;
    ipWindowLimit?: number;
    windowSeconds: number;
  };
  listDomains(credentials: AdapterCredentials, options?: AdapterListOptions): Promise<UnifiedDomain[]>;
  getDomain(credentials: AdapterCredentials, domainId: string): Promise<UnifiedDomain>;
  listRecords(
    credentials: AdapterCredentials,
    domainId: string,
    options?: AdapterListOptions & { type?: string; line?: string; keyword?: string }
  ): Promise<UnifiedRecord[]>;
  createRecord(
    credentials: AdapterCredentials,
    domainId: string,
    input: DnsRecordInput
  ): Promise<UnifiedRecord | null>;
  updateRecord(
    credentials: AdapterCredentials,
    domainId: string,
    recordId: string,
    input: DnsRecordInput
  ): Promise<UnifiedRecord | null>;
  deleteRecord(credentials: AdapterCredentials, domainId: string, recordId: string): Promise<void>;
  setRecordStatus?(
    credentials: AdapterCredentials,
    domainId: string,
    recordId: string,
    enabled: boolean
  ): Promise<void>;
  batchOperation?(
    credentials: AdapterCredentials,
    domainId: string,
    operation: 'delete' | 'status' | 'ttl' | 'line',
    ids: string[],
    value?: string | number | boolean
  ): Promise<void>;
}
