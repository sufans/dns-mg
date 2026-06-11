import { requireAuth } from '../../../_shared/auth';
import { logOperation } from '../../../_shared/logger';
import { jsonResponse, noContent, notFound } from '../../../_shared/response';
import { groupSchema } from '../../../_shared/validators';
import type { Env } from '../../../_shared/types';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const id = Number(params.id);
  const input = groupSchema.parse(await request.json());
  const result = await env.DB.prepare('UPDATE api_groups SET name = ?, color = ?, updated_at = ? WHERE id = ?')
    .bind(input.name, input.color, new Date().toISOString(), id)
    .run();
  if (!result.meta.changes) return notFound();
  await logOperation(env, request, auth, { action: 'group.update', targetType: 'api_group', targetId: String(id), detail: input, success: true });
  return jsonResponse({ id, ...input });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;
  const id = Number(params.id);
  const result = await env.DB.prepare('DELETE FROM api_groups WHERE id = ?').bind(id).run();
  if (!result.meta.changes) return notFound();
  await logOperation(env, request, auth, { action: 'group.delete', targetType: 'api_group', targetId: String(id), success: true });
  return noContent();
};
