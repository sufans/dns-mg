import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { sendEmail } from '../../_shared/email';

const TestEmailSchema = z.object({
  email: z.string().email('邮箱格式无效'),
});

export const onRequestPost: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = TestEmailSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { email } = parsed.data;

    const sent = await sendEmail(
      {
        to: email,
        subject: '[DNS Manager] 测试邮件',
        html: `<!DOCTYPE html><html lang="zh-CN"><body style="margin:0;padding:20px;background:#0f172a;font-family:sans-serif;color:#f1f5f9;"><div style="max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px;"><h1 style="color:#6366f1;">DNS Manager</h1><p>这是一封测试邮件，用于验证邮件通知功能是否正常工作。</p><p style="color:#64748b;font-size:12px;">此邮件由 DNS Manager 系统自动发送</p></div></body></html>`,
        text: 'DNS Manager - 这是一封测试邮件，用于验证邮件通知功能是否正常工作。',
      },
      context.env,
    );

    if (!sent) {
      return createResponse(null, 500, '测试邮件发送失败');
    }

    return createResponse({ sent: true }, 200, '测试邮件已发送');
  }),
);
