import { EmailMessage } from 'cloudflare:email';
import { getAuthContext } from '../../_shared/auth';
import { decryptAccountConfig, listAccountRows } from '../../_shared/db';
import { adapterForAccount } from '../../_shared/platforms/factory';
import { reservePlatformRequest } from '../../_shared/rate-limit';
import { errorResponse, jsonResponse } from '../../_shared/response';
import type { Env, UnifiedDomain } from '../../_shared/types';

function authorized(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get('X-Automation-Secret');
  if (env.AUTOMATION_SECRET && header && header === env.AUTOMATION_SECRET) return Promise.resolve(true);
  return getAuthContext(request, env).then(Boolean);
}

async function readReminderSettings(env: Env): Promise<{ enabled: boolean; days: number[] }> {
  const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('emailReminderEnabled', 'emailReminderDays')").all<{ key: string; value: string }>();
  const map = Object.fromEntries((rows.results ?? []).map((row) => [row.key, row.value]));
  return {
    enabled: map.emailReminderEnabled === 'true',
    days: (map.emailReminderDays ?? '30,7,0').split(',').map(Number).filter((n) => Number.isFinite(n))
  };
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

function buildMime(from: string, to: string, subject: string, text: string): string {
  const safeSubject = `=?UTF-8?B?${base64Utf8(subject)}?=`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text
  ].join('\r\n');
}

async function sendReminder(env: Env, domains: UnifiedDomain[]): Promise<string> {
  if (!env.SEND_EMAIL || !env.EMAIL_FROM || !env.EMAIL_TO) return 'email_not_configured';
  const lines = domains.map((d) => `- ${d.name} | ${d.platform}/${d.accountName} | 到期: ${d.expiresAt ?? '未知'} | 剩余: ${d.remainingDays ?? '未知'} 天`);
  const body = `以下域名需要关注：\n\n${lines.join('\n')}\n\n本邮件由 Cloudflare DNS Manager 自动发送。`;
  const raw = buildMime(env.EMAIL_FROM, env.EMAIL_TO, `DNS Manager 域名到期提醒（${domains.length} 个）`, body);
  const sender = env.EMAIL_FROM.match(/<(.+)>/)?.[1] ?? env.EMAIL_FROM;
  const message = new EmailMessage(sender, env.EMAIL_TO, raw);
  await env.SEND_EMAIL.send(message);
  return 'sent';
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await authorized(request, env))) return errorResponse('未授权的自动化请求', 401, 'unauthorized');
  const settings = await readReminderSettings(env);
  const accounts = await listAccountRows(env, true);
  const watched: UnifiedDomain[] = [];
  const errors: Array<{ accountId: number; error: string }> = [];

  for (const row of accounts) {
    try {
      const adapter = adapterForAccount(row);
      await reservePlatformRequest(env, row.id, adapter.rateLimit.accountWindowLimit, adapter.rateLimit.windowSeconds);
      const config = await decryptAccountConfig(env, row);
      const domains = await adapter.listDomains({ platform: row.platform, config }, { page: 1, size: 500 });
      watched.push(...domains.filter((d) => d.remainingDays !== null && (d.remainingDays <= Math.max(...settings.days) || d.expired)));
    } catch (error) {
      errors.push({ accountId: row.id, error: error instanceof Error ? error.message : '未知错误' });
    }
  }

  const emailStatus = settings.enabled && watched.length > 0 ? await sendReminder(env, watched) : 'skipped';
  return jsonResponse({ checkedAt: new Date().toISOString(), matched: watched, errors, emailStatus });
};
