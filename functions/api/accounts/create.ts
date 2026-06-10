import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { encrypt, decrypt } from '../../_shared/crypto';
import { getAdapter } from '../../../_shared/adapters/index';

const PlatformSchema = z.enum(['dnshe', 'dnsneko']);

const CreateApiAccountSchema = z.object({
  name: z.string().min(1, '账号名称不能为空').max(100),
  platform: PlatformSchema,
  groupId: z.string().nullable().optional(),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    username: z.string().optional(),
    apiToken: z.string().optional(),
  }),
});

function maskCredential(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

function maskCredentials(
  credentials: Record<string, string>,
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    masked[key] = maskCredential(value) ?? '';
  }
  return masked;
}

export const onRequestPost: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = CreateApiAccountSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { name, platform, groupId, credentials } = parsed.data;

    // Filter out undefined/empty credentials
    const filteredCreds: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (value !== undefined && value !== '') {
        filteredCreds[key] = value;
      }
    }

    if (Object.keys(filteredCreds).length === 0) {
      return createResponse(null, 400, '至少需要提供一个凭据字段');
    }

    const id = crypto.randomUUID();
    const credentialsJson = JSON.stringify(filteredCreds);
    const credentialsEncrypted = await encrypt(credentialsJson, context.env.ENCRYPTION_KEY);

    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');

    // Test connection automatically
    let connectionStatus = 'unknown';
    let testMessage = '';
    try {
      const adapter = getAdapter(platform);
      const testResult = await adapter.testConnection(filteredCreds as never);
      connectionStatus = testResult.success ? 'online' : 'error';
      testMessage = testResult.message;
    } catch (err) {
      connectionStatus = 'error';
      testMessage = err instanceof Error ? err.message : '连接测试失败';
    }

    // Insert into D1
    await context.env.DB
      .prepare(
        `INSERT INTO api_accounts (id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, last_tested_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'), datetime('now'))`,
      )
      .bind(id, name, platform, groupId ?? null, credentialsEncrypted, connectionStatus)
      .run();

    // Log operation
    await context.env.DB
      .prepare(
        `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
         VALUES ('create_account', 'account', ?, ?, ?, ?, 'success', datetime('now'))`,
      )
      .bind(id, `创建API账号: ${name} (${platform})`, ip, userAgent)
      .run();

    return createResponse(
      {
        id,
        name,
        platform,
        groupId: groupId ?? null,
        credentials: maskCredentials(filteredCreds),
        isEnabled: true,
        connectionStatus,
        lastTestedAt: new Date().toISOString(),
        testMessage,
      },
      201,
      '账号创建成功',
    );
  }),
);
