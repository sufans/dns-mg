import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../_shared/utils';
import { requireAuth, verifyPassword } from '../../../_shared/auth';

export const onRequest: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    if (context.request.method !== 'DELETE') {
      return createResponse(null, 405, '方法不允许');
    }

    const accountId = context.params.id as string;
    if (!accountId) {
      return createResponse(null, 400, '缺少账号ID');
    }

    // Get password from header or body
    const verifyHeader = context.request.headers.get('X-Verify-Password');
    let password: string | undefined = verifyHeader ?? undefined;

    if (!password) {
      try {
        const body = (await context.request.json()) as { password?: string };
        password = body.password;
      } catch {
        // No body or invalid JSON
      }
    }

    if (!password) {
      return createResponse(null, 400, '需要密码验证');
    }

    // Verify admin password
    const isValid = verifyPassword(password, context.env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return createResponse(null, 401, '密码验证失败');
    }

    // Check if account exists
    const existing = await context.env.DB
      .prepare('SELECT id, name, platform FROM api_accounts WHERE id = ?')
      .bind(accountId)
      .first<{ id: string; name: string; platform: string }>();

    if (!existing) {
      return createResponse(null, 404, '账号不存在');
    }

    // Delete from D1
    await context.env.DB
      .prepare('DELETE FROM api_accounts WHERE id = ?')
      .bind(accountId)
      .run();

    // Log operation
    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');
    await context.env.DB
      .prepare(
        `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
         VALUES ('delete_account', 'account', ?, ?, ?, ?, 'success', datetime('now'))`,
      )
      .bind(accountId, `删除API账号: ${existing.name} (${existing.platform})`, ip, userAgent)
      .run();

    return createResponse(null, 200, '账号删除成功');
  }),
);
