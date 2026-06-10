// POST /api/records/:accountId/:domainId - Create DNS record
// Protected by requireAuth
import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../../_shared/utils';
import { requireAuth } from '../../../../_shared/auth';
import { decrypt } from '../../../../_shared/crypto';
import { logOperation } from '../../../../_shared/logger';
import { getAdapter } from '../../../../../src/plugins/dns-platforms/index';
import type { CreateRecordInput } from '../../../../../src/plugins/dns-platforms/types';
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

const CreateRecordSchema = z.object({
  name: z.string().min(1, '主机记录不能为空'),
  type: z.string().min(1, '记录类型不能为空'),
  value: z.string().min(1, '记录值不能为空'),
  line: z.string().optional(),
  ttl: z.number().int().min(1, 'TTL必须为正整数').default(600),
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

export const onRequestPost: PagesFunction = withCors(
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

    // 3. Validate input
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = CreateRecordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const input: CreateRecordInput = parsed.data;

    // 4. Call adapter.createRecord
    try {
      const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
      await waitForRateLimit(`records:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

      const adapter = getAdapter(account.platform);
      const record = await retryWithBackoff(() =>
        adapter.createRecord(credentials as never, domainId, input),
      );

      // 5. Log operation
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'create_record',
        targetType: 'record',
        targetId: record.id,
        detail: { accountId, domainId, name: input.name, type: input.type, value: input.value },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'success',
      });

      // 6. Return created record
      return createResponse({
        ...record,
        accountId: account.id,
        platform: account.platform as 'dnshe' | 'dnsneko',
        accountName: account.name,
      }, 201, 'DNS记录创建成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建DNS记录失败';

      // Log failure
      const ip = getClientIP(context.request);
      const userAgent = context.request.headers.get('User-Agent');
      await logOperation(context.env, {
        action: 'create_record',
        targetType: 'record',
        targetId: domainId,
        detail: { accountId, domainId, name: input.name, type: input.type },
        ipAddress: ip,
        userAgent: userAgent ?? undefined,
        status: 'failed',
        errorMessage: message,
      });

      return createResponse(null, 502, message);
    }
  }),
);
