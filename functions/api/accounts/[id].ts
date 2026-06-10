import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { encrypt, decrypt } from '../../_shared/crypto';
import { getAdapter } from '../../../_shared/adapters/index';

const PlatformSchema = z.enum(['dnshe', 'dnsneko']);

const UpdateApiAccountSchema = z.object({
  name: z.string().min(1, '账号名称不能为空').max(100).optional(),
  platform: PlatformSchema.optional(),
  groupId: z.string().nullable().optional(),
  credentials: z
    .object({
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
      username: z.string().optional(),
      apiToken: z.string().optional(),
    })
    .optional(),
  isEnabled: z.boolean().optional(),
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

export const onRequestPut: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const accountId = context.params.id as string;
    if (!accountId) {
      return createResponse(null, 400, '缺少账号ID');
    }

    // Check if account exists
    const existing = await context.env.DB
      .prepare(
        `SELECT id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, last_tested_at, created_at, updated_at
         FROM api_accounts WHERE id = ?`,
      )
      .bind(accountId)
      .first<{
        id: string;
        name: string;
        platform: string;
        group_id: string | null;
        credentials_encrypted: string;
        is_enabled: number;
        connection_status: string;
        last_tested_at: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!existing) {
      return createResponse(null, 404, '账号不存在');
    }

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = UpdateApiAccountSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { name, platform, groupId, credentials, isEnabled } = parsed.data;

    // Build update fields
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (platform !== undefined) {
      updates.push('platform = ?');
      values.push(platform);
    }
    if (groupId !== undefined) {
      updates.push('group_id = ?');
      values.push(groupId);
    }
    if (isEnabled !== undefined) {
      updates.push('is_enabled = ?');
      values.push(isEnabled ? 1 : 0);
    }

    let credentialsChanged = false;
    let currentCreds: Record<string, string> = {};
    let newCreds: Record<string, string> | undefined;

    // Decrypt current credentials
    try {
      const decrypted = await decrypt(existing.credentials_encrypted, context.env.ENCRYPTION_KEY);
      currentCreds = JSON.parse(decrypted) as Record<string, string>;
    } catch {
      // If we can't decrypt, start fresh
    }

    if (credentials !== undefined) {
      // Merge: new credentials override existing ones
      const filteredNewCreds: Record<string, string> = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (value !== undefined && value !== '') {
          filteredNewCreds[key] = value;
        }
      }

      newCreds = { ...currentCreds, ...filteredNewCreds };
      const credentialsJson = JSON.stringify(newCreds);
      const credentialsEncrypted = await encrypt(credentialsJson, context.env.ENCRYPTION_KEY);
      updates.push('credentials_encrypted = ?');
      values.push(credentialsEncrypted);
      credentialsChanged = true;
    }

    // Always update updated_at
    updates.push("updated_at = datetime('now')");

    if (updates.length === 1) {
      // Only updated_at, nothing to update
      return createResponse(null, 400, '没有需要更新的字段');
    }

    values.push(accountId);

    await context.env.DB
      .prepare(`UPDATE api_accounts SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // If credentials changed, re-test connection
    let connectionStatus = existing.connection_status;
    let testMessage = '';
    const effectivePlatform = platform ?? existing.platform;
    if (credentialsChanged && newCreds) {
      try {
        const adapter = getAdapter(effectivePlatform);
        const testResult = await adapter.testConnection(newCreds as never);
        connectionStatus = testResult.success ? 'online' : 'error';
        testMessage = testResult.message;
      } catch (err) {
        connectionStatus = 'error';
        testMessage = err instanceof Error ? err.message : '连接测试失败';
      }

      await context.env.DB
        .prepare(
          `UPDATE api_accounts SET connection_status = ?, last_tested_at = datetime('now') WHERE id = ?`,
        )
        .bind(connectionStatus, accountId)
        .run();
    }

    // Log operation
    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');
    const detail = `更新API账号: ${name ?? existing.name}`;
    await context.env.DB
      .prepare(
        `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
         VALUES ('update_account', 'account', ?, ?, ?, ?, 'success', datetime('now'))`,
      )
      .bind(accountId, detail, ip, userAgent)
      .run();

    // Fetch updated record
    const updated = await context.env.DB
      .prepare(
        `SELECT id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, last_tested_at, created_at, updated_at
         FROM api_accounts WHERE id = ?`,
      )
      .bind(accountId)
      .first<{
        id: string;
        name: string;
        platform: string;
        group_id: string | null;
        credentials_encrypted: string;
        is_enabled: number;
        connection_status: string;
        last_tested_at: string | null;
        created_at: string;
        updated_at: string;
      }>();

    // Decrypt for masked response
    let maskedCreds: Record<string, string> = {};
    try {
      const decCreds = updated
        ? await decrypt(updated.credentials_encrypted, context.env.ENCRYPTION_KEY)
        : await decrypt(existing.credentials_encrypted, context.env.ENCRYPTION_KEY);
      const parsedCreds = JSON.parse(decCreds) as Record<string, string>;
      maskedCreds = maskCredentials(parsedCreds);
    } catch {
      maskedCreds = { error: '无法解密凭据' };
    }

    const resultAccount = updated ?? existing;
    return createResponse(
      {
        id: resultAccount.id,
        name: resultAccount.name,
        platform: resultAccount.platform,
        groupId: resultAccount.group_id,
        credentials: maskedCreds,
        isEnabled: resultAccount.is_enabled === 1,
        connectionStatus: resultAccount.connection_status,
        lastTestedAt: resultAccount.last_tested_at,
        createdAt: resultAccount.created_at,
        updatedAt: resultAccount.updated_at,
        testMessage: credentialsChanged ? testMessage : undefined,
      },
      200,
      '账号更新成功',
    );
  }),
);
