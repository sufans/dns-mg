import type { PagesFunction, AuthenticatedEventContext } from '../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../_shared/utils';
import { requireAuth } from '../../../_shared/auth';
import { logOperation } from '../../../_shared/logger';

export const onRequest: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    if (context.request.method !== 'DELETE') {
      return createResponse(null, 405, '方法不允许');
    }

    const { id } = context.params;
    if (!id || typeof id !== 'string') {
      return createResponse(null, 400, '无效的分组ID');
    }

    // Check if group exists
    const existing = await context.env.DB
      .prepare(`SELECT id, name FROM account_groups WHERE id = ?`)
      .bind(id)
      .first<{ id: string; name: string }>();
    if (!existing) {
      return createResponse(null, 404, '分组不存在');
    }

    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');

    // Set group_id to null for any accounts referencing this group
    await context.env.DB
      .prepare(`UPDATE api_accounts SET group_id = NULL WHERE group_id = ?`)
      .bind(id)
      .run();

    // Delete the group
    await context.env.DB
      .prepare(`DELETE FROM account_groups WHERE id = ?`)
      .bind(id)
      .run();

    await logOperation(context.env, {
      action: 'delete_group',
      targetType: 'group',
      targetId: id,
      detail: { name: existing.name },
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'success',
    });

    return createResponse(null, 200, '分组删除成功');
  }),
);
