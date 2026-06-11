import { requireAuth, requireSecondVerification } from '../../_shared/auth';
import { decryptJson } from '../../_shared/crypto';
import { logOperation } from '../../_shared/logger';
import { jsonResponse } from '../../_shared/response';
import { backupImportSchema } from '../../_shared/validators';
import type { Env } from '../../_shared/types';

interface BackupPayload {
  version: number;
  groups: Array<{ name: string; color: string }>;
  accounts: Array<{ platform: string; name: string; group_id: number | null; encrypted_config_json: string; enabled: number }>;
  settings: Array<{ key: string; value: string }>;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const input = backupImportSchema.parse(await request.json());
  const second = await requireSecondVerification(input.verifyPassword, env);
  if (second) return second;
  const backup = await decryptJson<BackupPayload>(input.encryptedPayload, env.ENCRYPTION_KEY);
  if (backup.version !== 1) throw new Error('不支持的备份版本');
  for (const group of backup.groups ?? []) {
    await env.DB.prepare(
      `INSERT INTO api_groups (name, color) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET color = excluded.color, updated_at = ?`
    )
      .bind(group.name, group.color, new Date().toISOString())
      .run();
  }
  for (const account of backup.accounts ?? []) {
    await env.DB.prepare(
      `INSERT INTO api_accounts (platform, name, group_id, encrypted_config_json, enabled)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(account.platform, account.name, account.group_id, account.encrypted_config_json, account.enabled ? 1 : 0)
      .run();
  }
  for (const setting of backup.settings ?? []) {
    await env.DB.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
      .bind(setting.key, setting.value, new Date().toISOString())
      .run();
  }
  await logOperation(env, request, auth, { action: 'backup.import', targetType: 'backup', detail: { accounts: backup.accounts?.length ?? 0 }, success: true });
  return jsonResponse({ imported: true });
};
