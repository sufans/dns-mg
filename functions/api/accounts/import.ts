import { z } from 'zod';
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors, getClientIP } from '../../_shared/utils';
import { requireAuth, verifyPassword } from '../../_shared/auth';
import { encrypt, decrypt } from '../../_shared/crypto';

const ImportSchema = z.object({
  data: z.string().min(1, '导入数据不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

interface ImportAccount {
  name: string;
  platform: string;
  groupId?: string | null;
  credentials: Record<string, string>;
}

interface ImportData {
  version: number;
  accounts: ImportAccount[];
  exportedAt: string;
}

export const onRequestPost: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createResponse(null, 400, '请求体格式错误');
    }

    const parsed = ImportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return createResponse(null, 400, firstError?.message ?? '输入验证失败');
    }

    const { data, password } = parsed.data;

    // Verify admin password
    const isValid = verifyPassword(password, context.env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return createResponse(null, 401, '密码验证失败');
    }

    // Decrypt the import data
    let importJson: string;
    try {
      importJson = await decrypt(data, context.env.ENCRYPTION_KEY);
    } catch {
      return createResponse(null, 400, '导入数据解密失败，数据可能已损坏');
    }

    // Validate structure
    let importData: ImportData;
    try {
      importData = JSON.parse(importJson) as ImportData;
    } catch {
      return createResponse(null, 400, '导入数据格式无效');
    }

    if (!importData.accounts || !Array.isArray(importData.accounts)) {
      return createResponse(null, 400, '导入数据缺少账号列表');
    }

    const validPlatforms = ['dnshe', 'dnsneko'];
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const account of importData.accounts) {
      // Validate each account
      if (!account.name || !account.platform || !account.credentials) {
        skipped++;
        continue;
      }

      if (!validPlatforms.includes(account.platform)) {
        skipped++;
        continue;
      }

      // Filter out empty credentials
      const filteredCreds: Record<string, string> = {};
      for (const [key, value] of Object.entries(account.credentials)) {
        if (value !== undefined && value !== '') {
          filteredCreds[key] = value;
        }
      }

      if (Object.keys(filteredCreds).length === 0) {
        skipped++;
        continue;
      }

      try {
        const credentialsJson = JSON.stringify(filteredCreds);
        const credentialsEncrypted = await encrypt(credentialsJson, context.env.ENCRYPTION_KEY);
        const id = crypto.randomUUID();

        await context.env.DB
          .prepare(
            `INSERT INTO api_accounts (id, name, platform, group_id, credentials_encrypted, is_enabled, connection_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, 'unknown', datetime('now'), datetime('now'))`,
          )
          .bind(id, account.name, account.platform, account.groupId ?? null, credentialsEncrypted)
          .run();

        imported++;
      } catch {
        // Likely duplicate or DB error
        failed++;
      }
    }

    // Log operation
    const ip = getClientIP(context.request);
    const userAgent = context.request.headers.get('User-Agent');
    await context.env.DB
      .prepare(
        `INSERT INTO operation_logs (action, target_type, target_id, detail, ip_address, user_agent, status, created_at)
         VALUES ('import_accounts', 'account', NULL, ?, ?, ?, 'success', datetime('now'))`,
      )
      .bind(
        `导入API账号: 成功${imported}个, 跳过${skipped}个, 失败${failed}个`,
        ip,
        userAgent,
      )
      .run();

    return createResponse(
      { imported, skipped, failed, total: importData.accounts.length },
      200,
      '导入完成',
    );
  }),
);
