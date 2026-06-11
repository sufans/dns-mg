import { requireAuth } from '../../_shared/auth';
import { batchRecordSchema } from '../../_shared/validators';
import { getDecryptedAccount } from '../../_shared/db';
import { logOperation } from '../../_shared/logger';
import { adapterForAccount } from '../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../_shared/rate-limit';
import { errorResponse, jsonResponse, notFound } from '../../_shared/response';
import type { Env } from '../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const input = batchRecordSchema.parse(await request.json());
  const account = await getDecryptedAccount(env, input.accountId);
  if (!account || !account.row.enabled) return notFound();
  const adapter = adapterForAccount(account.row);
  if (!adapter.batchOperation) return errorResponse('当前平台不支持官方批量操作，将由前端逐条执行', 400, 'unsupported_batch_operation');
  await reservePlatformRequest(env, input.accountId, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
  await adapter.batchOperation({ platform: account.row.platform, config: account.config }, input.domainId, input.operation, input.ids, input.value);
  await logOperation(env, request, auth, { action: `record.batch.${input.operation}`, targetType: 'dns_record', targetId: input.domainId, detail: { accountId: input.accountId, ids: input.ids }, success: true });
  return jsonResponse({ ok: true });
};
