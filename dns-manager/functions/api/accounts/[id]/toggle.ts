import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../_shared/utils';
import { requireAuth } from '../../../_shared/auth';

const ToggleSchema = z.object({
  isEnabled: z.boolean(),
});

export const onRequest: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    if (context.request.method !== 'PATCH') {
      return createResponse(null, 405, '方法不允许');
    }

    const accountId = context.params.id as string;
    if (!accountId) {
      return createResponse(null, 400, '缺少账号ID');
    }

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = ToggleSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { isEnabled } = parsed.data;

    // Check if account exists
    const existing = await context.env.DB
      .prepare('SELECT id, name FROM api_accounts WHERE id = ?')
      .bind(accountId)
      .first<{ id: string; name: string }>();

    if (!existing) {
      return createResponse(null, 404, '账号不存在');
    }

    // Update is_enabled
    await context.env.DB
      .prepare(
        `UPDATE api_accounts SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(isEnabled ? 1 : 0, accountId)
      .run();

    // Log operation
    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');
    const action = isEnabled ? '启用' : '禁用';
    await context.env.DB
      .prepare(
        `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
         VALUES ('toggle_account', 'account', ?, ?, ?, ?, 'success', datetime('now'))`,
      )
      .bind(accountId, `${action}API账号: ${existing.name}`, ip, userAgent)
      .run();

    return createResponse(
      { id: accountId, isEnabled },
      200,
      isEnabled ? '账号已启用' : '账号已禁用',
    );
  }),
);
