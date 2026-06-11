import { requireAuth, requireSecondVerification } from '../../../_shared/auth';
import { encryptJson } from '../../../_shared/crypto';
import { decryptAccountConfig, getAccountRow, toPublicAccount } from '../../../_shared/db';
import { logOperation } from '../../../_shared/logger';
import { errorResponse, jsonResponse, noContent, notFound } from '../../../_shared/response';
import { updateAccountSchema } from '../../../_shared/validators';
import type { ApiAccountConfig, Env } from '../../../_shared/types';

function idFrom(params: Record<string, string | string[]>): number {
  const value = params.id;
  return Number(Array.isArray(value) ? value[0] : value);
}

function mergeConfig(platform: string, oldConfig: ApiAccountConfig, credentials?: Record<string, string>): ApiAccountConfig {
  if (!credentials) return oldConfig;
  if (platform === 'dnshe') return { apiKey: credentials.apiKey ?? oldConfig.apiKey, apiSecret: credentials.apiSecret ?? oldConfig.apiSecret };
  return { username: credentials.username ?? oldConfig.username, apiKey: credentials.apiKey ?? oldConfig.apiKey };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const row = await getAccountRow(env, idFrom(params));
  if (!row) return notFound();
  const config = await decryptAccountConfig(env, row);
  return jsonResponse({ account: toPublicAccount(row, config) });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const id = idFrom(params);
  const row = await getAccountRow(env, id);
  if (!row) return notFound();
  const input = updateAccountSchema.parse(await request.json());
  const oldConfig = await decryptAccountConfig(env, row);
  const newConfig = mergeConfig(input.platform ?? row.platform, oldConfig, input.credentials);
  if (input.credentials || input.platform || input.enabled === false) {
    const second = await requireSecondVerification(input.verifyPassword, env);
    if (second) return second;
  }
  const encrypted = input.credentials ? await encryptJson(newConfig, env.ENCRYPTION_KEY) : row.encrypted_config_json;
  await env.DB.prepare(
    `UPDATE api_accounts SET platform = ?, name = ?, group_id = ?, encrypted_config_json = ?, enabled = ?, updated_at = ? WHERE id = ?`
  )
    .bind(
      input.platform ?? row.platform,
      input.name ?? row.name,
      input.groupId === undefined ? row.group_id : input.groupId,
      encrypted,
      input.enabled === undefined ? row.enabled : input.enabled ? 1 : 0,
      new Date().toISOString(),
      id
    )
    .run();
  const updated = await getAccountRow(env, id);
  if (!updated) return errorResponse('账号更新失败', 500, 'account_update_failed');
  await logOperation(env, request, auth, { action: 'account.update', targetType: 'api_account', targetId: String(id), success: true });
  return jsonResponse({ account: toPublicAccount(updated, newConfig) });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const { verifyPassword } = (await request.json().catch(() => ({}))) as { verifyPassword?: string };
  const second = await requireSecondVerification(verifyPassword, env);
  if (second) return second;
  const id = idFrom(params);
  const row = await getAccountRow(env, id);
  if (!row) return notFound();
  await env.DB.prepare('DELETE FROM api_accounts WHERE id = ?').bind(id).run();
  await logOperation(env, request, auth, { action: 'account.delete', targetType: 'api_account', targetId: String(id), success: true });
  return noContent();
};
