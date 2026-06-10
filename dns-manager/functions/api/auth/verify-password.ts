import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors } from '../../_shared/utils';
import { requireAuth, verifyPassword } from '../../_shared/auth';

const VerifyPasswordSchema = z.object({
  password: z.string().min(1, '密码不能为空'),
});

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

    const parsed = VerifyPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { password } = parsed.data;
    const isValid = verifyPassword(password, context.env.ADMIN_PASSWORD_HASH);

    if (!isValid) {
      return createResponse(null, 401, '密码验证失败');
    }

    return createResponse({ verified: true }, 200, '密码验证成功');
  }),
);
