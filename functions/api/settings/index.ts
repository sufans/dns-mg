import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { logOperation } from '../../_shared/logger';
import { RefreshIntervalSchema, LogRetentionDaysSchema } from '../../_shared/schemas';

// Settings value validation map
const settingsValidators: Record<string, z.ZodTypeAny> = {
  refreshInterval: RefreshIntervalSchema,
  logRetentionDays: LogRetentionDaysSchema,
  emailNotifications: z.boolean(),
  notificationEmail: z.string().email('邮箱格式无效'),
  notifyDaysBefore: z.array(z.number().int().min(1).max(365)),
};

export const onRequestGet: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    return handleGetSettings(context);
  }),
);

export const onRequestPut: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    return handleUpdateSettings(context);
  }),
);

async function handleGetSettings(context: AuthenticatedEventContext): Promise<Response> {
  const results = await context.env.DB
    .prepare(`SELECT key, value, updated_at FROM system_settings`)
    .all();

  // Parse settings as key-value pairs, converting JSON values
  const settings: Record<string, any> = {};
  for (const row of results.results as { key: string; value: string; updated_at: string }[]) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return createResponse(settings, 200, 'ok');
}

async function handleUpdateSettings(context: AuthenticatedEventContext): Promise<Response> {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return createResponse(null, 400, '请求体格式错误');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return createResponse(null, 400, '请求体必须是对象');
  }

  const input = body as Record<string, unknown>;
  const ip = getClientIP(context.request);
  const userAgent = context.request.headers.get('User-Agent');

  // Validate each setting
  const validatedSettings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const validator = settingsValidators[key];
    if (!validator) {
      return createResponse(null, 400, `未知的设置项: ${key}`);
    }

    const parsed = validator.safeParse(value);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, `设置项 ${key} 验证失败: ${firstError?.message ?? '无效值'}`);
    }

    validatedSettings[key] = parsed.data;
  }

  // Upsert each setting
  for (const [key, value] of Object.entries(validatedSettings)) {
    const jsonValue = JSON.stringify(value);
    await context.env.DB
      .prepare(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      )
      .bind(key, jsonValue)
      .run();
  }

  // Log the operation
  await logOperation(context.env, {
    action: 'update_settings',
    targetType: 'system',
    detail: { keys: Object.keys(validatedSettings) },
    ipAddress: ip,
    userAgent: userAgent ?? undefined,
    status: 'success',
  });

  // Return updated settings
  return handleGetSettings(context);
}
