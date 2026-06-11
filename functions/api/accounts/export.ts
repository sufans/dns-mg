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
  const encryptedPayload = await encryptJson(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: accounts.map((row) => ({
        platform: row.platform,
        name: row.name,
        groupId: row.group_id,
        encryptedConfigJson: row.encrypted_config_json,
        enabled: Boolean(row.enabled)
      }))
    },
    env.ENCRYPTION_KEY
  );
  await logOperation(env, request, auth, { action: 'account.export', targetType: 'api_account', success: true });
  return jsonResponse({ encryptedPayload });
};
