import { clientIp } from './rate-limit';
import type { AuthContext, Env } from './types';

export async function logOperation(
  env: Env,
  request: Request,
  auth: AuthContext | null,
  payload: {
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: unknown;
    success: boolean;
    errorMessage?: string | null;
  }
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO operation_logs (actor, ip, action, target_type, target_id, detail_json, success, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        auth?.username ?? 'anonymous',
        clientIp(request),
        payload.action,
        payload.targetType ?? '',
        payload.targetId ?? '',
        JSON.stringify(payload.detail ?? {}),
        payload.success ? 1 : 0,
        payload.errorMessage ?? null
      )
      .run();
  } catch {
    // Logging must never break production requests.
  }
}

export async function purgeOldLogs(env: Env): Promise<void> {
  const days = Number(env.LOG_RETENTION_DAYS ?? 90);
  await env.DB.prepare("DELETE FROM operation_logs WHERE created_at < datetime('now', ?)")
    .bind(`-${Math.max(days, 7)} days`)
    .run();
}
