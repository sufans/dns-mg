import type { PagesFunction, AuthenticatedEventContext } from '../../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../../_shared/utils';
import { requireAuth } from '../../../_shared/auth';
import { decrypt } from '../../../_shared/crypto';
import { getAdapter } from '../../../../_shared/adapters/index';

export const onRequestPost: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const accountId = context.params.id as string;
    if (!accountId) {
      return createResponse(null, 400, '缺少账号ID');
    }

    // Get account from D1
    const account = await context.env.DB
      .prepare(
        `SELECT id, name, platform, credentials_encrypted FROM api_accounts WHERE id = ?`,
      )
      .bind(accountId)
      .first<{
        id: string;
        name: string;
        platform: string;
        credentials_encrypted: string;
      }>();

    if (!account) {
      return createResponse(null, 404, '账号不存在');
    }

    // Decrypt credentials
    let credentials: Record<string, string>;
    try {
      const decrypted = await decrypt(account.credentials_encrypted, context.env.ENCRYPTION_KEY);
      credentials = JSON.parse(decrypted) as Record<string, string>;
    } catch {
      return createResponse(null, 500, '凭据解密失败');
    }

    // Test connection using platform adapter
    let success = false;
    let message = '';
    let connectionStatus = 'error';

    try {
      const adapter = getAdapter(account.platform);
      const result = await adapter.testConnection(credentials as never);
      success = result.success;
      message = result.message;
      connectionStatus = result.success ? 'online' : 'offline';
    } catch (err) {
      success = false;
      message = err instanceof Error ? err.message : '连接测试失败';
      connectionStatus = 'error';
    }

    // Update connection_status and last_tested_at in D1
    await context.env.DB
      .prepare(
        `UPDATE api_accounts SET connection_status = ?, last_tested_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(connectionStatus, accountId)
      .run();

    // Log operation
    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');
    await context.env.DB
      .prepare(
        `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
         VALUES ('test_account', 'account', ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind(
        accountId,
        `测试API账号连接: ${account.name} - ${message}`,
        ip,
        userAgent,
        success ? 'success' : 'failed',
      )
      .run();

    return createResponse(
      {
        id: accountId,
        success,
        message,
        connectionStatus,
        lastTestedAt: new Date().toISOString(),
      },
      200,
      success ? '连接测试成功' : '连接测试失败',
    );
  }),
);
