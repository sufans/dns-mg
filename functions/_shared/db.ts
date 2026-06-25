import { decryptJson, maskSecret } from './crypto';
import type { ApiAccountConfig, ApiAccountRow, Env, PublicApiAccount } from './types';

export function toPublicAccount(row: ApiAccountRow, config?: ApiAccountConfig): PublicApiAccount {
  const maskedCredential = row.platform === 'dnsneko' ? `${config?.username ?? 'unknown'} / ${maskSecret(config?.apiKey)}` : maskSecret(config?.apiKey);
  return {
    id: row.id,
    platform: row.platform,
    name: row.name,
    groupId: row.group_id,
    groupName: row.group_name,
    groupColor: row.group_color,
    enabled: Boolean(row.enabled),
    maskedCredential,
    lastCheckAt: row.last_check_at,
    lastCheckStatus: row.last_check_status,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listAccountRows(env: Env, enabledOnly = false): Promise<ApiAccountRow[]> {
  const query = `SELECT a.*, g.name AS group_name, g.color AS group_color
    FROM api_accounts a LEFT JOIN api_groups g ON g.id = a.group_id
    ${enabledOnly ? 'WHERE a.enabled = 1' : ''}
    ORDER BY a.created_at DESC`;
  const { results } = await env.DB.prepare(query).all<ApiAccountRow>();
  return results ?? [];
}

export async function getAccountRow(env: Env, id: number): Promise<ApiAccountRow | null> {
  return env.DB.prepare(
    `SELECT a.*, g.name AS group_name, g.color AS group_color
     FROM api_accounts a LEFT JOIN api_groups g ON g.id = a.group_id
     WHERE a.id = ?`
  )
    .bind(id)
    .first<ApiAccountRow>();
}

export async function decryptAccountConfig(env: Env, row: Pick<ApiAccountRow, 'encrypted_config_json'>): Promise<ApiAccountConfig> {
  return decryptJson<ApiAccountConfig>(row.encrypted_config_json, env.ENCRYPTION_KEY);
}

export async function getDecryptedAccount(env: Env, id: number): Promise<{ row: ApiAccountRow; config: ApiAccountConfig } | null> {
  const row = await getAccountRow(env, id);
  if (!row) return null;
  return { row, config: await decryptAccountConfig(env, row) };
}
