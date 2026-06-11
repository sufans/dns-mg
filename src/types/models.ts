export type DNSPlatform = 'dnshe' | 'dnsneko';

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  code: string | null;
  requestId: string;
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

export interface ApiGroup {
  id: number;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  refreshIntervalMinutes: number;
  emailReminderEnabled: boolean;
  emailReminderDays: number[];
  logRetentionDays: number;
}

export interface OperationLog {
  id: number;
  actor: string;
  ip: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: unknown;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}
