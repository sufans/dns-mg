// POST /api/records/:accountId/:recordId/status - Toggle record status
// Protected by requireAuth
import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../../../_shared/utils';
import { requireAuth } from '../../../../../_shared/auth';
import { decrypt } from '../../../../../_shared/crypto';
import { logOperation } from '../../../../../_shared/logger';
import { getAdapter } from '../../../../../../_shared/adapters/index';
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

const ToggleStatusSchema = z.object({
  status: z.number().int().refine((v) => v === 0 || v === 1, {
    message: '状态值必须为0(禁用)或1(启用)',
  }),
});

export const onRequestPost: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const accountId = context.params.accountId as string;
    const recordId = context.params.recordId as string;

    if (!accountId || !recordId) {
      return createResponse(null, 400, '缺少账号ID或记录ID');
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

    // 2. Validate input
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = ToggleStatusSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const enabled = parsed.data.status === 1;

    // 3. Decrypt credentials
    let credentials: Record<string, string>;
    try {
      const decrypted = await decrypt(account.credentials_encrypted, context.env.ENCRYPTION_KEY);
      credentials = JSON.parse(decrypted) as Record<string, string>;
    } catch {
      return createResponse(null, 500, '凭据解密失败');
    }

    // 4. Call adapter.toggleRecordStatus
    try {
      const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
      await waitForRateLimit(`records:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

      const adapter = getAdapter(account.platform);
      await retryWithBackoff(() =>
        adapter.toggleRecordStatus(credentials as never, recordId, enabled),
      );

      // 5. Log operation
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'toggle_record_status',
        targetType: 'record',
        targetId: recordId,
        detail: { accountId, recordId, enabled },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'success',
      });

      return createResponse({ recordId, enabled }, 200, enabled ? '记录已启用' : '记录已禁用');
    } catch (error) {
      const message = error instanceof Error ? error.message : '切换记录状态失败';

      // Check if it's an unsupported operation
      if (message.includes('does not support')) {
        return createResponse(null, 400, `当前平台(${account.platform})不支持切换记录状态`);
      }

      // Log failure
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'toggle_record_status',
        targetType: 'record',
        targetId: recordId,
        detail: { accountId, recordId, enabled },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'failed',
        errorMessage: message,
      });

      return createResponse(null, 502, message);
    }
  }),
);
