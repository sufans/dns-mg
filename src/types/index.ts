// Re-export types from Zod schemas as the single source of truth
export type {
  Platform,
  ConnectionStatus,
  ApiAccount,
  CreateApiAccountInput,
  UpdateApiAccountInput,
  AccountGroup,
  CreateAccountGroupInput,
  UpdateAccountGroupInput,
  OperationLog,
  SystemSetting,
  LoginInput,
  VerifyPasswordInput,
  ApiResponse,
} from '../schemas/index';

// DNS Record type (aligned with UnifiedRecord from platform adapters)
export interface DnsRecord {
  id: string;
  domainId: string;
  accountId: string;
  platform: 'dnshe' | 'dnsneko';
  name: string;
  type: string;
  value: string;
  line?: string;
  ttl: number;
  priority?: number | null;
  status: 'active' | 'paused' | number;
  remark?: string;
  updatedAt?: string;
  // DNSHE-specific
  recordId?: string;
  proxied?: boolean;
  // DNSNEKO-specific
  nekoRecordId?: string;
}

// Domain type (aligned with UnifiedDomain from platform adapters)
export interface Domain {
  id: string;
  accountId: string;
  platform: 'dnshe' | 'dnsneko';
  domain: string;
  rootDomain?: string;
  status: 'active' | 'suspended' | 'expired' | number;
  statusText?: string;
  createdAt?: string;
  updatedAt?: string;
  expireTime?: string;
  expired?: boolean;
  recordCount?: number | string;
  accountName?: string;
  // DNSHE-specific
  subdomainId?: number;
  subdomain?: string;
  // DNSNEKO-specific
  domainId?: string;
  userRemark?: string;
  notice?: string;
  allowOperation?: number;
  registerDuration?: number;
  renewDays?: number;
}

// DNS Platform adapter interface
export interface DnsPlatform {
  id: string;
  name: string;
  type: string;
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Legacy API response type (for backward compatibility)
export interface ApiResponseLegacy<T> {
  success: boolean;
  data?: T;
  error?: string;
}
