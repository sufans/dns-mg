import { requireAuth } from '../../../_shared/auth';
import { getDecryptedAccount } from '../../../_shared/db';
import { adapterForAccount } from '../../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../../_shared/rate-limit';
import { jsonResponse, notFound } from '../../../_shared/response';
import type { Env } from '../../../_shared/types';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const accountId = Number(params.accountId);
  const domainId = String(params.domainId);
  const account = await getDecryptedAccount(env, accountId);
  if (!account || !account.row.enabled) return notFound();
  const adapter = adapterForAccount(account.row);
  await reservePlatformRequest(env, accountId, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
  const credentials = { platform: account.row.platform, config: account.config } as const;
  const [domain, records] = await Promise.all([adapter.getDomain(credentials, domainId), adapter.listRecords(credentials, domainId)]);
  return jsonResponse({ domain, records });
};
