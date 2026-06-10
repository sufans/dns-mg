// GET /api/records/:accountId/:domainId - List DNS records
// Protected by requireAuth
import type { PagesFunction, AuthenticatedEventContext } from '../../../../_shared/types';
import { createResponse, withCors } from '../../../../_shared/utils';
import { requireAuth } from '../../../../_shared/auth';
import { decrypt } from '../../../../_shared/crypto';
import { getAdapter } from '../../../../../_shared/adapters/index';
import { waitForRateLimit, retryWithBackoff } from '../../../../_shared/rateLimiter';

interface AccountRow {
  id: string;
  name: string;
  platform: string;
  credentials_encrypted: string;
}

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  dnshe: { maxRequests: 60, windowMs: 60_000 },
  dnsneko: { maxRequests: 30, windowMs: 60_000 },
};

export const onRequestGet: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const accountId = context.params.accountId as string;
    const domainId = context.params.domainId as string;

    if (!accountId || !domainId) {
      return createResponse(null, 400, '缺少账号ID或域名ID');
    }

    // 1. Get account from D1
    const account = await context.env.DB
      .prepare(
        `SELECT id, name, platform, credentials_encrypted FROM api_accounts WHERE id = ? AND is_enabled = 1`,
      )
      .bind(accountId)
      .first<AccountRow>();

    if (!account) {
      return createResponse(null, 404, '账号不存在或已禁用');
    }

    // 2. Decrypt credentials
    let credentials: Record<string, string>;
    try {
      const decrypted = await decrypt(account.credentials_encrypted, context.env.ENCRYPTION_KEY);
      credentials = JSON.parse(decrypted) as Record<string, string>;
    } catch {
      return createResponse(null, 500, '凭据解密失败');
    }

    // 3. Call adapter.listRecords
    try {
      const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
      await waitForRateLimit(`records:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

      const adapter = getAdapter(account.platform);
      const result = await retryWithBackoff(() =>
        adapter.listRecords(credentials as never, domainId),
      );

      // 4. Return records with account info
      const records = result.records.map((record) => ({
        ...record,
        accountId: account.id,
        platform: account.platform as 'dnshe' | 'dnsneko',
        accountName: account.name,
      }));

      return createResponse({
        records,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      }, 200, 'ok');
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取DNS记录失败';
      return createResponse(null, 502, message);
    }
  }),
);
