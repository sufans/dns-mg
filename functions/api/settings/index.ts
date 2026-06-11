import { requireAuth } from '../../_shared/auth';
import { logOperation } from '../../_shared/logger';
import { jsonResponse } from '../../_shared/response';
import { settingsSchema } from '../../_shared/validators';
import type { Env } from '../../_shared/types';

async function readSettings(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  return Object.fromEntries((results ?? []).map((row) => [row.key, row.value]));
}

function serialize(value: unknown): string {
  if (Array.isArray(value)) return value.join(',');
  if (typeof value === 'boolean') return String(value);
  return String(value);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const raw = await readSettings(env);
  return jsonResponse({
    settings: {
      theme: raw.theme ?? 'system',
      refreshIntervalMinutes: Number(raw.refreshIntervalMinutes ?? 60),
      emailReminderEnabled: raw.emailReminderEnabled === 'true',
      emailReminderDays: (raw.emailReminderDays ?? '30,7,0').split(',').filter(Boolean).map(Number),
      logRetentionDays: Number(raw.logRetentionDays ?? env.LOG_RETENTION_DAYS ?? 90)
    }
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const input = settingsSchema.parse(await request.json());
  for (const [key, value] of Object.entries(input)) {
    await env.DB.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
      .bind(key, serialize(value), new Date().toISOString())
      .run();
  }
  await logOperation(env, request, auth, { action: 'settings.update', targetType: 'settings', detail: input, success: true });
  return jsonResponse({ settings: await readSettings(env) });
};
