import { requireAuth } from '../../../../../_shared/auth';
import { getDecryptedAccount } from '../../../../../_shared/db';
import { logOperation } from '../../../../../_shared/logger';
import { adapterForAccount } from '../../../../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../../../../_shared/rate-limit';
import { errorResponse, jsonResponse, notFound } from '../../../../../_shared/response';
import type { Env } from '../../../../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accountId = Number(params.accountId);
  const domainId = String(params.domainId);
  const recordId = String(params.recordId);
  const body = (await request.json()) as { enabled?: boolean };
  const account = await getDecryptedAccount(env, accountId);
  if (!account || !account.row.enabled) return notFound();
  const adapter = adapterForAccount(account.row);
  if (!adapter.setRecordStatus) return errorResponse('当前平台不支持暂停/启用解析记录', 400, 'unsupported_operation');
  await reservePlatformRequest(env, accountId, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
  await adapter.setRecordStatus({ platform: account.row.platform, config: account.config }, domainId, recordId, Boolean(body.enabled));
  await logOperation(env, request, auth, { action: 'record.status', targetType: 'dns_record', targetId: recordId, detail: { accountId, domainId, enabled: body.enabled }, success: true });
  return jsonResponse({ ok: true });
};
