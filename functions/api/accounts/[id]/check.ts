import { requireAuth } from '../../../_shared/auth';
import { getDecryptedAccount } from '../../../_shared/db';
import { adapterForAccount } from '../../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../../_shared/rate-limit';
import { jsonResponse, notFound } from '../../../_shared/response';
import { logOperation } from '../../../_shared/logger';
import type { Env } from '../../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const id = Number(params.id);
  const account = await getDecryptedAccount(env, id);
  if (!account) return notFound();
  const adapter = adapterForAccount(account.row);
  try {
    await reservePlatformRequest(env, id, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
    await adapter.listDomains({ platform: account.row.platform, config: account.config }, { page: 1, size: 1 });
    await env.DB.prepare('UPDATE api_accounts SET last_check_at = ?, last_check_status = ?, last_error = NULL WHERE id = ?')
      .bind(new Date().toISOString(), 'success', id)
      .run();
    await logOperation(env, request, auth, { action: 'account.check', targetType: 'api_account', targetId: String(id), success: true });
    return jsonResponse({ status: 'success' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '连接检测失败';
    await env.DB.prepare('UPDATE api_accounts SET last_check_at = ?, last_check_status = ?, last_error = ? WHERE id = ?')
      .bind(new Date().toISOString(), 'failed', message, id)
      .run();
    await logOperation(env, request, auth, { action: 'account.check', targetType: 'api_account', targetId: String(id), success: false, errorMessage: message });
    return jsonResponse({ status: 'failed', error: message });
  }
};
