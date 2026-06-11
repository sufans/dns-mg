import { requireAuth } from '../../../../_shared/auth';
import { dnsRecordInputSchema } from '../../../../_shared/validators';
import { getDecryptedAccount } from '../../../../_shared/db';
import { logOperation } from '../../../../_shared/logger';
import { adapterForAccount } from '../../../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../../../_shared/rate-limit';
import { jsonResponse, noContent, notFound } from '../../../../_shared/response';
import type { Env } from '../../../../_shared/types';

async function load(env: Env, accountId: number) {
  const account = await getDecryptedAccount(env, accountId);
  if (!account || !account.row.enabled) return null;
  return { ...account, adapter: adapterForAccount(account.row) };
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accountId = Number(params.accountId);
  const domainId = String(params.domainId);
  const recordId = String(params.recordId);
  const loaded = await load(env, accountId);
  if (!loaded) return notFound();
  const input = dnsRecordInputSchema.parse(await request.json());
  await reservePlatformRequest(env, accountId, loaded.adapter.rateLimit.accountWindowLimit, loaded.adapter.rateLimit.windowSeconds);
  const record = await loaded.adapter.updateRecord({ platform: loaded.row.platform, config: loaded.config }, domainId, recordId, input);
  await logOperation(env, request, auth, { action: 'record.update', targetType: 'dns_record', targetId: recordId, detail: { accountId, domainId, input: { ...input, value: '***' } }, success: true });
  return jsonResponse({ record });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accountId = Number(params.accountId);
  const domainId = String(params.domainId);
  const recordId = String(params.recordId);
  const loaded = await load(env, accountId);
  if (!loaded) return notFound();
  await reservePlatformRequest(env, accountId, loaded.adapter.rateLimit.accountWindowLimit, loaded.adapter.rateLimit.windowSeconds);
  await loaded.adapter.deleteRecord({ platform: loaded.row.platform, config: loaded.config }, domainId, recordId);
  await logOperation(env, request, auth, { action: 'record.delete', targetType: 'dns_record', targetId: recordId, detail: { accountId, domainId }, success: true });
  return noContent();
};
