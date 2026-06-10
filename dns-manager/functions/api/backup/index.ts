import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth, verifyPassword } from '../../_shared/auth';
import { logOperation } from '../../_shared/logger';
import { encrypt, decrypt } from '../../_shared/crypto';

export const onRequest: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    if (context.request.method === 'GET') {
      return handleBackup(context);
    }

    if (context.request.method === 'POST') {
      return handleRestore(context);
    }

    return createResponse(null, 405, '方法不允许');
  }),
);

async function handleBackup(context: AuthenticatedEventContext): Promise<Response> {
  const ip = getClientIP(context.request);
  const userAgent = context.request.headers.get('User-Agent');

  try {
    // Read all data from D1 (operation_logs are NOT included)
    const [accounts, groups, settings] = await Promise.all([
      context.env.DB
        .prepare(
          `SELECT id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, last_tested_at, created_at, updated_at FROM api_accounts`,
        )
        .all(),
      context.env.DB
        .prepare(`SELECT id, name, color, sort_order, created_at FROM account_groups`)
        .all(),
      context.env.DB.prepare(`SELECT key, value, updated_at FROM system_settings`).all(),
    ]);

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        api_accounts: accounts.results,
        account_groups: groups.results,
        system_settings: settings.results,
      },
    };

    // Encrypt the entire JSON
    const jsonString = JSON.stringify(backupData);
    const encrypted = await encrypt(jsonString, context.env.ENCRYPTION_KEY);

    await logOperation(context.env, {
      action: 'backup',
      targetType: 'system',
      detail: {
        accountCount: accounts.results.length,
        groupCount: groups.results.length,
        settingCount: settings.results.length,
      },
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'success',
    });

    return new Response(encrypted, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="dns-manager-backup-${new Date().toISOString().slice(0, 10)}.enc"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    await logOperation(context.env, {
      action: 'backup',
      targetType: 'system',
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '备份失败',
    });

    return createResponse(null, 500, '备份导出失败');
  }
}

async function handleRestore(context: AuthenticatedEventContext): Promise<Response> {
  const ip = getClientIP(context.request);
  const userAgent = context.request.headers.get('User-Agent');

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return createResponse(null, 400, '请求体格式错误');
  }

  const { data: encryptedData, password } = body as { data?: string; password?: string };

  if (!encryptedData || typeof encryptedData !== 'string') {
    return createResponse(null, 400, '缺少备份数据');
  }

  if (!password || typeof password !== 'string') {
    return createResponse(null, 400, '缺少管理员密码');
  }

  // Verify admin password
  const isValid = verifyPassword(password, context.env.ADMIN_PASSWORD_HASH);
  if (!isValid) {
    await logOperation(context.env, {
      action: 'restore',
      targetType: 'system',
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'failed',
      errorMessage: '管理员密码验证失败',
    });
    return createResponse(null, 401, '管理员密码验证失败');
  }

  try {
    // Decrypt data
    const decryptedJson = await decrypt(encryptedData, context.env.ENCRYPTION_KEY);
    const backupData = JSON.parse(decryptedJson);

    // Validate structure
    if (!backupData || !backupData.data) {
      return createResponse(null, 400, '备份数据格式无效');
    }

    const { api_accounts = [], account_groups = [], system_settings = [] } = backupData.data;

    // Clear existing data and insert restored data
    // Delete in order respecting foreign keys
    await context.env.DB.prepare(`DELETE FROM api_accounts`).run();
    await context.env.DB.prepare(`DELETE FROM account_groups`).run();
    await context.env.DB.prepare(`DELETE FROM system_settings`).run();

    // Insert groups first (accounts reference groups)
    for (const group of account_groups) {
      await context.env.DB
        .prepare(
          `INSERT INTO account_groups (id, name, color, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(group.id, group.name, group.color, group.sort_order, group.created_at)
        .run();
    }

    // Insert accounts
    for (const account of api_accounts) {
      await context.env.DB
        .prepare(
          `INSERT INTO api_accounts (id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, last_tested_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          account.id,
          account.name,
          account.platform,
          account.group_id,
          account.credentials_encrypted,
          account.is_enabled,
          account.connection_status,
          account.last_tested_at,
          account.created_at,
          account.updated_at,
        )
        .run();
    }

    // Insert settings
    for (const setting of system_settings) {
      await context.env.DB
        .prepare(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES (?, ?, ?)`,
        )
        .bind(setting.key, setting.value, setting.updated_at)
        .run();
    }

    await logOperation(context.env, {
      action: 'restore',
      targetType: 'system',
      detail: {
        accountCount: api_accounts.length,
        groupCount: account_groups.length,
        settingCount: system_settings.length,
      },
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'success',
    });

    return createResponse(
      {
        accountCount: api_accounts.length,
        groupCount: account_groups.length,
        settingCount: system_settings.length,
      },
      200,
      '数据恢复成功',
    );
  } catch (error) {
    await logOperation(context.env, {
      action: 'restore',
      targetType: 'system',
      ipAddress: ip,
      userAgent: userAgent ?? undefined,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '数据恢复失败',
    });

    return createResponse(null, 500, '数据恢复失败，可能是备份数据已损坏');
  }
}
