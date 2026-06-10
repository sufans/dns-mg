// PUT /api/records/:accountId/:domainId/:recordId - Update DNS record
// Protected by requireAuth
import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../../../_shared/utils';
import { requireAuth } from '../../../../../_shared/auth';
import { decrypt } from '../../../../../_shared/crypto';
import { logOperation } from '../../../../../_shared/logger';
import { getAdapter } from '../../../../../../src/plugins/dns-platforms/index';
import type { UpdateRecordInput } from '../../../../../../src/plugins/dns-platforms/types';
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

const UpdateRecordSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  value: z.string().optional(),
  line: z.string().optional(),
  ttl: z.number().int().min(1).optional(),
  priority: z.number().int().optional(),
  remark: z.string().optional(),
  subdomainId: z.number().optional(),
  weight: z.number().int().optional(),
  port: z.number().int().optional(),
  target: z.string().optional(),
  caaFlag: z.number().int().optional(),
  caaTag: z.string().optional(),
  caaValue: z.string().optional(),
});

export const onRequestPut: PagesFunction = withCors(
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

    // 3. Validate input
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = UpdateRecordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const input: UpdateRecordInput = { ...parsed.data, id: recordId };

    // 4. Call adapter.updateRecord
    try {
      const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
      await waitForRateLimit(`records:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

      const adapter = getAdapter(account.platform);
      const record = await retryWithBackoff(() =>
        adapter.updateRecord(credentials as never, domainId, recordId, input),
      );

      // 5. Log operation
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'update_record',
        targetType: 'record',
        targetId: recordId,
        detail: { accountId, domainId, recordId, updates: parsed.data },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'success',
      });

      // 6. Return updated record
      return createResponse({
        ...record,
        accountId: account.id,
        platform: account.platform as 'dnshe' | 'dnsneko',
        accountName: account.name,
      }, 200, 'DNS记录更新成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新DNS记录失败';

      // Log failure
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'update_record',
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
