import { requireAuth, requireSecondVerification } from '../../_shared/auth';
import { decryptJson } from '../../_shared/crypto';
import { logOperation } from '../../_shared/logger';
import { jsonResponse } from '../../_shared/response';
import { importAccountsSchema } from '../../_shared/validators';
import type { Env } from '../../_shared/types';

interface AccountsExport {
  version: number;
  accounts: Array<{ platform: string; name: string; groupId: number | null; encryptedConfigJson: string; enabled: boolean }>;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const input = importAccountsSchema.parse(await request.json());
  const second = await requireSecondVerification(input.verifyPassword, env);
  if (second) return second;
  const payload = await decryptJson<AccountsExport>(input.encryptedPayload, env.ENCRYPTION_KEY);
  if (payload.version !== 1) throw new Error('不支持的账号导入格式');
  for (const account of payload.accounts) {
    await env.DB.prepare(
      `INSERT INTO api_accounts (platform, name, group_id, encrypted_config_json, enabled)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(account.platform, account.name, account.groupId, account.encryptedConfigJson, account.enabled ? 1 : 0)
      .run();
  }
  await logOperation(env, request, auth, { action: 'account.import', targetType: 'api_account', detail: { count: payload.accounts.length }, success: true });
  return jsonResponse({ imported: payload.accounts.length });
};
