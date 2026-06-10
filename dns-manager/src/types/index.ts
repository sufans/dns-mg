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

// DNS Record type (aligned with DnsRecordSchema)
export interface DnsRecord {
  id: string;
  domainId: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied: boolean;
  createdAt: string;
  updatedAt: string;
}

// Domain type (aligned with DomainSchema)
export interface Domain {
  id: string;
  name: string;
  platform: string;
  platformId: string;
  createdAt: string;
  updatedAt: string;
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
