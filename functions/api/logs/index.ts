import { requireAuth } from '../../_shared/auth';
import { purgeOldLogs } from '../../_shared/logger';
import { jsonResponse, noContent } from '../../_shared/response';
import type { Env } from '../../_shared/types';

interface LogRow {
  id: number;
  actor: string;
  ip: string;
  action: string;
  target_type: string;
  target_id: string;
  detail_json: string;
  success: number;
  error_message: string | null;
  created_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
  const { results } = await env.DB.prepare('SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all<LogRow>();
  return jsonResponse({
    logs: (results ?? []).map((row) => ({
      id: row.id,
      actor: row.actor,
      ip: row.ip,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      detail: JSON.parse(row.detail_json || '{}') as unknown,
      success: Boolean(row.success),
      errorMessage: row.error_message,
      createdAt: row.created_at
    }))
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  await purgeOldLogs(env);
  return noContent();
};
