import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { logOperation } from '../../_shared/logger';
import { CreateAccountGroupSchema } from '../../../src/schemas';

export const onRequest: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    if (context.request.method !== 'POST') {
      return createResponse(null, 405, '方法不允许');
    }

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = CreateAccountGroupSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { name, color, sortOrder } = parsed.data;
    const id = crypto.randomUUID();
    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');

    await context.env.DB
      .prepare(
        `INSERT INTO account_groups (id, name, color, sort_order, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
      )
      .bind(id, name, color, sortOrder)
      .run();

    const group = await context.env.DB
      .prepare(
        `SELECT id, name, color, sort_order, created_at FROM account_groups WHERE id = ?`,
      )
      .bind(id)
      .first();

    await logOperation(context.env, {
      action: 'create_group',
      targetType: 'group',
      targetId: id,
      detail: { name, color, sortOrder },
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'success',
    });

    return createResponse(group, 201, '分组创建成功');
  }),
);
