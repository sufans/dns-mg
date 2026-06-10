import type { Env } from './types';

interface LogParams {
  action: string;
  targetType: 'account' | 'domain' | 'record' | 'group' | 'system';
  targetId?: string;
  detail?: unknown;
  ipAddress: string;
  userAgent?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
}

export async function logOperation(env: Env, params: LogParams): Promise<void> {
  const detailStr = params.detail ? JSON.stringify(params.detail) : null;
  await env.DB
    .prepare(
      `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      params.action,
      params.targetType,
      params.targetId ?? null,
      detailStr,
      params.ipAddress,
      params.userAgent ?? null,
      params.status,
      params.errorMessage ?? null,
    )
    .run();
}
