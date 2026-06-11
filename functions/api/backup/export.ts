import { requireAuth } from '../../_shared/auth';
import { encryptJson } from '../../_shared/crypto';
import { listAccountRows } from '../../_shared/db';
import { logOperation } from '../../_shared/logger';
import { jsonResponse } from '../../_shared/response';
import type { Env } from '../../_shared/types';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accounts = await listAccountRows(env);
  const groups = await env.DB.prepare('SELECT * FROM api_groups ORDER BY id ASC').all();
  const settings = await env.DB.prepare('SELECT * FROM settings ORDER BY key ASC').all();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    groups: groups.results ?? [],
    accounts: accounts.map((row) => ({
      platform: row.platform,
      name: row.name,
      group_id: row.group_id,
      encrypted_config_json: row.encrypted_config_json,
      enabled: row.enabled
    })),
    settings: settings.results ?? []
  };
  const encryptedPayload = await encryptJson(payload, env.ENCRYPTION_KEY);
  await logOperation(env, request, auth, { action: 'backup.export', targetType: 'backup', success: true });
  return jsonResponse({ encryptedPayload });
};
