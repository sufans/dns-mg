import { requireAuth } from '../../_shared/auth';
import { logOperation } from '../../_shared/logger';
import { jsonResponse } from '../../_shared/response';
import { groupSchema } from '../../_shared/validators';
import type { Env } from '../../_shared/types';

interface GroupRow {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const { results } = await env.DB.prepare('SELECT * FROM api_groups ORDER BY name ASC').all<GroupRow>();
  return jsonResponse({ groups: (results ?? []).map((row) => ({ id: row.id, name: row.name, color: row.color, createdAt: row.created_at, updatedAt: row.updated_at })) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const input = groupSchema.parse(await request.json());
  const result = await env.DB.prepare('INSERT INTO api_groups (name, color) VALUES (?, ?)')
    .bind(input.name, input.color)
    .run();
  await logOperation(env, request, auth, { action: 'group.create', targetType: 'api_group', targetId: String(result.meta.last_row_id), detail: input, success: true });
  return jsonResponse({ id: result.meta.last_row_id, ...input });
};
