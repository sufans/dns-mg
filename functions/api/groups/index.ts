import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';

export const onRequestGet: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const results = await context.env.DB
      .prepare(
        `SELECT g.id, g.name, g.color, g.sort_order, g.created_at,
                (SELECT COUNT(*) FROM api_accounts WHERE group_id = g.id) AS account_count
         FROM account_groups g
         ORDER BY g.sort_order ASC, g.created_at ASC`,
      )
      .all();

    return createResponse(results.results, 200, 'ok');
  }),
);
