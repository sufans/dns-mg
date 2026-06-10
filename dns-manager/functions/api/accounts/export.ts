import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { decrypt, encrypt } from '../../_shared/crypto';

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

export const onRequest: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    if (context.request.method !== 'GET') {
      return createResponse(null, 405, '方法不允许');
    }

    // Get all accounts from D1
    const { results: accounts } = await context.env.DB
      .prepare(
        `SELECT id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, last_tested_at, created_at, updated_at
         FROM api_accounts
         ORDER BY created_at DESC`,
      )
      .all<AccountRow>();

    // Decrypt credentials for each account
    const exportAccounts = await Promise.all(
      accounts.map(async (account) => {
        let credentials: Record<string, string> = {};
        try {
          const decrypted = await decrypt(account.credentials_encrypted, context.env.ENCRYPTION_KEY);
          credentials = JSON.parse(decrypted) as Record<string, string>;
        } catch {
          credentials = { error: '无法解密凭据' };
        }

        return {
          name: account.name,
          platform: account.platform,
          groupId: account.group_id,
          credentials,
        };
      }),
    );

    // Build export data
    const exportData = {
      version: 1,
      accounts: exportAccounts,
      exportedAt: new Date().toISOString(),
    };

    // Encrypt the entire export data
    const exportJson = JSON.stringify(exportData);
    const encryptedData = await encrypt(exportJson, context.env.ENCRYPTION_KEY);

    // Log operation
    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');
    await context.env.DB
      .prepare(
        `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
         VALUES ('export_accounts', 'account', NULL, ?, ?, ?, 'success', datetime('now'))`,
      )
      .bind(`导出API账号: ${accounts.length}个`, ip, userAgent)
      .run();

    return createResponse(
      { data: encryptedData, count: accounts.length },
      200,
      '导出成功',
    );
  }),
);
