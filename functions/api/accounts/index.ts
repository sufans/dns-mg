import { requireAuth, requireSecondVerification } from '../../_shared/auth';
import { encryptJson } from '../../_shared/crypto';
import { decryptAccountConfig, listAccountRows, toPublicAccount } from '../../_shared/db';
import { logOperation } from '../../_shared/logger';
import { errorResponse, jsonResponse } from '../../_shared/response';
import { createAccountSchema } from '../../_shared/validators';
import { adapterForAccount } from '../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../_shared/rate-limit';
import { ZodError } from 'zod';
import type { ApiAccountConfig, ApiAccountRow, Env } from '../../_shared/types';

function normalizeConfig(platform: string, credentials: Record<string, string>): ApiAccountConfig {
  if (platform === 'dnsneko') return { username: credentials.username, apiKey: credentials.apiKey };
  if (platform === 'gleam') return { apiKey: credentials.apiKey };
  return { apiKey: credentials.apiKey, apiSecret: credentials.apiSecret };
}

async function updateCheckStatus(env: Env, row: ApiAccountRow, config: ApiAccountConfig): Promise<void> {
  const adapter = adapterForAccount(row);
  await reservePlatformRequest(env, row.id, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
  try {
    await adapter.listDomains({ platform: row.platform, config }, { page: 1, size: 1 });
    await env.DB.prepare('UPDATE api_accounts SET last_check_at = ?, last_check_status = ?, last_error = NULL WHERE id = ?')
      .bind(new Date().toISOString(), 'success', row.id)
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : '连接检测失败';
    await env.DB.prepare('UPDATE api_accounts SET last_check_at = ?, last_check_status = ?, last_error = ? WHERE id = ?')
      .bind(new Date().toISOString(), 'failed', message, row.id)
      .run();
    throw error;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const rows = await listAccountRows(env);
  const accounts = await Promise.all(rows.map(async (row) => toPublicAccount(row, await decryptAccountConfig(env, row))));
  return jsonResponse({ accounts });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await requireAuth(request, env);
    if (auth instanceof Response) return auth;
    const input = createAccountSchema.parse(await request.json());
    const second = await requireSecondVerification(input.verifyPassword, env);
    if (second) return second;

    const config = normalizeConfig(input.platform, input.credentials);
    const encrypted = await encryptJson(config, env.ENCRYPTION_KEY);
    const result = await env.DB.prepare(
      `INSERT INTO api_accounts (platform, name, group_id, encrypted_config_json, enabled)
     VALUES (?, ?, ?, ?, ?)`
    )
      .bind(input.platform, input.name, input.groupId ?? null, encrypted, input.enabled ? 1 : 0)
      .run();
    const id = Number(result.meta.last_row_id);
    const row = await env.DB.prepare(
      `SELECT a.*, g.name AS group_name, g.color AS group_color
     FROM api_accounts a LEFT JOIN api_groups g ON g.id = a.group_id WHERE a.id = ?`
    )
      .bind(id)
      .first<ApiAccountRow>();
    if (!row) return errorResponse('账号创建失败', 500, 'account_create_failed');

    let warning: string | null = null;
    if (input.checkConnection) {
      try {
        await updateCheckStatus(env, row, config);
      } catch (error) {
        warning = error instanceof Error ? error.message : '连接检测失败';
      }
    }
    await logOperation(env, request, auth, { action: 'account.create', targetType: 'api_account', targetId: String(id), detail: { platform: input.platform, name: input.name }, success: true });
    return jsonResponse({ account: toPublicAccount(row, config), warning });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(`请求参数校验失败: ${error.issues.map((i) => i.message).join('; ')}`, 400, 'validation_error');
    }
    throw error;
  }
};
