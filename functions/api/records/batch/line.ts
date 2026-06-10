// POST /api/records/batch/line - Batch update record resolution line
// Protected by requireAuth
import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../_shared/utils';
import { requireAuth } from '../../../_shared/auth';
import { decrypt } from '../../../_shared/crypto';
import { logOperation } from '../../../_shared/logger';
import { getAdapter } from '../../../_shared/adapters/index';
import type { BatchOperationInput } from '../../../_shared/adapters/types';
import { waitForRateLimit, retryWithBackoff } from '../../../_shared/rateLimiter';

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

const BatchLineSchema = z.object({
  accountId: z.string().min(1, '账号ID不能为空'),
  domainId: z.string().min(1, '域名ID不能为空'),
  recordIds: z.array(z.string().min(1)).min(1, '至少选择一条记录'),
  line: z.string().min(1, '解析线路不能为空'),
});

export const onRequestPost: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = BatchLineSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { accountId, domainId, recordIds, line } = parsed.data;

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

    // 3. Call adapter.batchOperation
    try {
      const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
      await waitForRateLimit(`batch:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

      const adapter = getAdapter(account.platform);
      const input: BatchOperationInput = {
        domainId,
        recordIds,
        operation: 'line',
        line,
      };
      await retryWithBackoff(() =>
        adapter.batchOperation(credentials as never, input),
      );

      // 4. Log operation
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'batch_line',
        targetType: 'record',
        detail: { accountId, domainId, recordIds, line },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'success',
      });

      return createResponse({ recordIds, line }, 200, '批量修改解析线路成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : '批量修改解析线路失败';

      if (message.includes('does not support')) {
        return createResponse(null, 400, `当前平台(${account.platform})不支持批量操作`);
      }

      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'batch_line',
        targetType: 'record',
        detail: { accountId, domainId, recordIds, line },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'failed',
        errorMessage: message,
      });

      return createResponse(null, 502, message);
    }
  }),
);
