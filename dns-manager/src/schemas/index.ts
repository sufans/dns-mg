import { z } from 'zod';

// Platform type
export const PlatformSchema = z.enum(['dnshe', 'dnsneko']);
export type Platform = z.infer<typeof PlatformSchema>;

// Connection status
export const ConnectionStatusSchema = z.enum(['online', 'offline', 'error', 'unknown']);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

// API Account
export const ApiAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '账号名称不能为空'),
  platform: PlatformSchema,
  groupId: z.string().nullable(),
  credentialsEncrypted: z.string(),
  isEnabled: z.boolean().default(true),
  connectionStatus: ConnectionStatusSchema.default('unknown'),
  lastTestedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApiAccount = z.infer<typeof ApiAccountSchema>;

// Create/Update API Account input
export const CreateApiAccountSchema = z.object({
  name: z.string().min(1, '账号名称不能为空').max(100),
  platform: PlatformSchema,
  groupId: z.string().nullable().optional(),
  credentials: z.object({
    // DNSHE credentials
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    // DNSNEKO credentials
    username: z.string().optional(),
    apiToken: z.string().optional(),
  }),
});
export type CreateApiAccountInput = z.infer<typeof CreateApiAccountSchema>;

export const UpdateApiAccountSchema = CreateApiAccountSchema.partial().extend({
  isEnabled: z.boolean().optional(),
});
export type UpdateApiAccountInput = z.infer<typeof UpdateApiAccountSchema>;

// Account Group
export const AccountGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '分组名称不能为空').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式无效'),
  sortOrder: z.number().int().min(0).default(0),
  createdAt: z.string(),
});
export type AccountGroup = z.infer<typeof AccountGroupSchema>;

export const CreateAccountGroupSchema = z.object({
  name: z.string().min(1, '分组名称不能为空').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式无效').default('#6366f1'),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateAccountGroupInput = z.infer<typeof CreateAccountGroupSchema>;

export const UpdateAccountGroupSchema = CreateAccountGroupSchema.partial();
export type UpdateAccountGroupInput = z.infer<typeof UpdateAccountGroupSchema>;

// Operation Log
export const OperationLogSchema = z.object({
  id: z.number(),
  action: z.string(),
  targetType: z.enum(['account', 'domain', 'record', 'group', 'system']),
  targetId: z.string().nullable(),
  detail: z.string().nullable(),
  ipAddress: z.string(),
  userAgent: z.string().nullable(),
  status: z.enum(['success', 'failed']),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
});
export type OperationLog = z.infer<typeof OperationLogSchema>;

// System Settings
export const SystemSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  updatedAt: z.string(),
});
export type SystemSetting = z.infer<typeof SystemSettingSchema>;

// Settings value schemas
export const RefreshIntervalSchema = z.number().min(900).max(86400); // 15min - 24h in seconds
export const LogRetentionDaysSchema = z.number().min(1).max(365);

// Login schema
export const LoginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// Password verification schema
export const VerifyPasswordSchema = z.object({
  password: z.string().min(1, '密码不能为空'),
});
export type VerifyPasswordInput = z.infer<typeof VerifyPasswordSchema>;

// DNS Record schema
export const DnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV']),
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  ttl: z.number().int().min(1).default(1),
  priority: z.number().int().min(0).max(65535).optional(),
  proxied: z.boolean().default(false),
});
export type DnsRecordInput = z.infer<typeof DnsRecordSchema>;

// Domain schema
export const DomainSchema = z.object({
  name: z.string().min(1, 'Domain name is required'),
  platform: z.string().min(1, 'Platform is required'),
  platformId: z.string().min(1, 'Platform ID is required'),
});
export type DomainInput = z.infer<typeof DomainSchema>;

// API Response wrapper
export const ApiResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().nullable(),
});
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
