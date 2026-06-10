import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { decrypt } from '../../_shared/crypto';

interface AccountRow {
  id: string;
  name: string;
  platform: string;
  group_id: string | null;
  credentials_encrypted: string;
  is_enabled: number;
  connection_status: string;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

function maskCredential(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

function maskCredentials(
  credentials: Record<string, string>,
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    masked[key] = maskCredential(value) ?? '';
  }
  return masked;
}

export const onRequest: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    if (context.request.method !== 'GET') {
      return createResponse(null, 405, '方法不允许');
    }

    const { results: accounts } = await context.env.DB
      .prepare(
        `SELECT id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, last_tested_at, created_at, updated_at
         FROM api_accounts
         ORDER BY created_at DESC`,
      )
      .all<AccountRow>();

    // Fetch all groups for mapping
    const { results: groups } = await context.env.DB
      .prepare(`SELECT id, name, color, sort_order FROM account_groups ORDER BY sort_order ASC`)
      .all<GroupRow>();

    const groupMap = new Map<string, GroupRow>();
    for (const group of groups) {
      groupMap.set(group.id, group);
    }

    const result = await Promise.all(
      accounts.map(async (account) => {
        let maskedCreds: Record<string, string> = {};
        try {
          const decrypted = await decrypt(account.credentials_encrypted, context.env.ENCRYPTION_KEY);
          const parsed = JSON.parse(decrypted) as Record<string, string>;
          maskedCreds = maskCredentials(parsed);
        } catch {
          maskedCreds = { error: '无法解密凭据' };
        }

        const group = account.group_id ? groupMap.get(account.group_id) : null;

        return {
          id: account.id,
          name: account.name,
          platform: account.platform,
          groupId: account.group_id,
          group: group
            ? { id: group.id, name: group.name, color: group.color, sortOrder: group.sort_order }
            : null,
          credentials: maskedCreds,
          isEnabled: account.is_enabled === 1,
          connectionStatus: account.connection_status,
          lastTestedAt: account.last_tested_at,
          createdAt: account.created_at,
          updatedAt: account.updated_at,
        };
      }),
    );

    return createResponse(result, 200, 'ok');
  }),
);
