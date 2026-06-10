import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { logOperation } from '../../_shared/logger';
import { UpdateAccountGroupSchema } from '../../../_shared/schemas';

export const onRequestPut: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const { id } = context.params;
    if (!id || typeof id !== 'string') {
      return createResponse(null, 400, '无效的分组ID');
    }

    // Check if group exists
    const existing = await context.env.DB
      .prepare(`SELECT id FROM account_groups WHERE id = ?`)
      .bind(id)
      .first();
    if (!existing) {
      return createResponse(null, 404, '分组不存在');
    }

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = UpdateAccountGroupSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { name, color, sortOrder } = parsed.data;

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(sortOrder);
    }

    if (updates.length === 0) {
      return createResponse(null, 400, '没有需要更新的字段');
    }

    values.push(id);
    await context.env.DB
      .prepare(`UPDATE account_groups SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const group = await context.env.DB
      .prepare(
        `SELECT id, name, color, sort_order, created_at FROM account_groups WHERE id = ?`,
      )
      .bind(id)
      .first();

    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');

    await logOperation(context.env, {
      action: 'update_group',
      targetType: 'group',
      targetId: id,
      detail: parsed.data,
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'success',
    });

    return createResponse(group, 200, '分组更新成功');
  }),
);
