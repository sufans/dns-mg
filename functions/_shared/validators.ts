import { z } from 'zod';

export const dnsPlatformSchema = z.enum(['dnshe', 'dnsneko', 'gleam']);

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256)
});

export const secondVerifySchema = z.object({
  password: z.string().min(1).max(256)
});

export const accountCredentialSchema = z.union([
  z.object({ platform: z.literal('dnshe'), apiKey: z.string().min(8).max(256), apiSecret: z.string().min(8).max(512) }),
  z.object({ platform: z.literal('dnsneko'), username: z.string().min(1).max(128), apiKey: z.string().min(8).max(512) }),
  z.object({ platform: z.literal('gleam'), apiKey: z.string().min(8).max(512) })
]);

export const createAccountSchema = z.object({
  platform: dnsPlatformSchema,
  name: z.string().min(1).max(120),
  groupId: z.number().int().positive().nullable().optional(),
  enabled: z.boolean().default(true),
  credentials: z.record(z.string(), z.string().min(1).max(1024)),
  verifyPassword: z.string().min(1).max(256),
  checkConnection: z.boolean().default(true)
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  verifyPassword: z.string().min(1).max(256).optional(),
  checkConnection: z.boolean().optional()
});

export const groupSchema = z.object({
  name: z.string().min(1).max(48),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const recordTypeSchema = z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA']);

export const dnsRecordInputSchema = z.object({
  name: z.string().min(1).max(253),
  type: recordTypeSchema,
  value: z.string().min(1).max(4096),
  line: z.string().min(1).max(64).nullable().optional(),
  ttl: z.number().int().min(60).max(86400),
  priority: z.number().int().min(0).max(65535).nullable().optional(),
  remark: z.string().max(256).nullable().optional()
});

export const batchRecordSchema = z.object({
  accountId: z.number().int().positive(),
  domainId: z.string().min(1).max(128),
  operation: z.enum(['delete', 'status', 'ttl', 'line']),
  ids: z.array(z.string().min(1).max(128)).min(1).max(100),
  value: z.union([z.string(), z.number(), z.boolean()]).optional()
});

export const settingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  refreshIntervalMinutes: z.number().int().min(15).max(1440).optional(),
  emailReminderEnabled: z.boolean().optional(),
  emailReminderDays: z.array(z.number().int().min(0).max(365)).min(1).max(10).optional(),
  logRetentionDays: z.number().int().min(7).max(3650).optional()
});

export const importAccountsSchema = z.object({
  encryptedPayload: z.string().min(1),
  verifyPassword: z.string().min(1).max(256)
});

export const backupImportSchema = importAccountsSchema;
