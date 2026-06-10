// DELETE /api/records/:accountId/:domainId/:recordId - Delete DNS record
// Protected by requireAuth
import type { PagesFunction, AuthenticatedEventContext } from '../../../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../../../_shared/utils';
import { requireAuth } from '../../../../../_shared/auth';
import { decrypt } from '../../../../../_shared/crypto';
import { logOperation } from '../../../../../_shared/logger';
import { getAdapter } from '../../../../../_shared/adapters/index';
import { waitForRateLimit, retryWithBackoff } from '../../../../../_shared/rateLimiter';

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

export const onRequestDelete: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const accountId = context.params.accountId as string;
    const domainId = context.params.domainId as string;
    const recordId = context.params.recordId as string;

    if (!accountId || !domainId || !recordId) {
      return createResponse(null, 400, '缺少账号ID、域名ID或记录ID');
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

    // 3. Call adapter.deleteRecord
    try {
      const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
      await waitForRateLimit(`records:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

      const adapter = getAdapter(account.platform);
      await retryWithBackoff(() =>
        adapter.deleteRecord(credentials as never, domainId, recordId),
      );

      // 4. Log operation
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'delete_record',
        targetType: 'record',
        targetId: recordId,
        detail: { accountId, domainId, recordId },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'success',
      });

      // 5. Return success
      return createResponse(null, 200, 'DNS记录删除成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除DNS记录失败';

      // Log failure
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'delete_record',
        targetType: 'record',
        targetId: recordId,
        detail: { accountId, domainId, recordId },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'failed',
        errorMessage: message,
      });

      return createResponse(null, 502, message);
    }
  }),
);
