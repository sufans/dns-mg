import { requireAuth } from '../../../../_shared/auth';
import { dnsRecordInputSchema } from '../../../../_shared/validators';
import { getDecryptedAccount } from '../../../../_shared/db';
import { logOperation } from '../../../../_shared/logger';
import { adapterForAccount } from '../../../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../../../_shared/rate-limit';
import { jsonResponse, notFound } from '../../../../_shared/response';
import type { Env } from '../../../../_shared/types';

async function load(env: Env, accountId: number) {
  const account = await getDecryptedAccount(env, accountId);
  if (!account || !account.row.enabled) return null;
  return { ...account, adapter: adapterForAccount(account.row) };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accountId = Number(params.accountId);
  const domainId = String(params.domainId);
  const loaded = await load(env, accountId);
  if (!loaded) return notFound();
  const url = new URL(request.url);
  await reservePlatformRequest(env, accountId, loaded.adapter.rateLimit.accountWindowLimit, loaded.adapter.rateLimit.windowSeconds);
  const records = await loaded.adapter.listRecords(
    { platform: loaded.row.platform, config: loaded.config },
    domainId,
    {
      page: Number(url.searchParams.get('page') ?? 1),
      size: Number(url.searchParams.get('size') ?? 100),
      type: url.searchParams.get('type') ?? undefined,
      line: url.searchParams.get('line') ?? undefined,
      keyword: url.searchParams.get('keyword') ?? undefined,
      status: url.searchParams.get('status') ?? undefined
    }
  );
  return jsonResponse({ records });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accountId = Number(params.accountId);
  const domainId = String(params.domainId);
  const loaded = await load(env, accountId);
  if (!loaded) return notFound();
  const input = dnsRecordInputSchema.parse(await request.json());
  await reservePlatformRequest(env, accountId, loaded.adapter.rateLimit.accountWindowLimit, loaded.adapter.rateLimit.windowSeconds);
  const record = await loaded.adapter.createRecord({ platform: loaded.row.platform, config: loaded.config }, domainId, input);
  await logOperation(env, request, auth, { action: 'record.create', targetType: 'dns_record', targetId: domainId, detail: { accountId, input: { ...input, value: '***' } }, success: true });
  return jsonResponse({ record });
};
