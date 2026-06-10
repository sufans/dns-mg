// Cloudflare Cron Trigger handler
// Runs on schedule (configured in wrangler.toml)
// Checks all domains for upcoming expiry and sends email notifications

import type { Env } from './_shared/types';
import { decrypt } from './_shared/crypto';
import { sendEmail } from './_shared/email';
import { generateExpiryEmail } from './_shared/email-templates';
import { logOperation } from './_shared/logger';
import { getAdapter } from './_shared/adapters/index';
import type { UnifiedDomain, PlatformCredentials } from './_shared/adapters/types';
import { waitForRateLimit, retryWithBackoff } from './_shared/rateLimiter';

interface AccountRow {
  id: string;
  name: string;
  platform: string;
  group_id: string | null;
  credentials_encrypted: string;
  is_enabled: number;
}

interface NotificationState {
  [domainKey: string]: {
    level: string;
    date: string;
  };
}

interface NotificationSettings {
  emailNotifications: boolean;
  notificationEmail: string;
  notifyDaysBefore: number[];
  notificationState: NotificationState;
}

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  dnshe: { maxRequests: 60, windowMs: 60_000 },
  dnsneko: { maxRequests: 30, windowMs: 60_000 },
};

async function getNotificationSettings(db: D1Database): Promise<NotificationSettings> {
  const { results } = await db
    .prepare(`SELECT key, value FROM system_settings`)
    .all<{ key: string; value: string }>();

  const settingsMap: Record<string, unknown> = {};
  for (const row of results) {
    try {
      settingsMap[row.key] = JSON.parse(row.value);
    } catch {
      settingsMap[row.key] = row.value;
    }
  }

  // Support both camelCase (backend API) and snake_case (frontend) keys
  const emailNotifications =
    settingsMap.emailNotifications === true ||
    settingsMap.email_notification_enabled === 'true';

  const notificationEmail =
    (settingsMap.notificationEmail as string | undefined) ??
    (settingsMap.notification_email as string | undefined) ??
    '';

  const notifyDaysBefore =
    (settingsMap.notifyDaysBefore as number[] | undefined) ??
    (() => {
      const daysStr = settingsMap.notify_days_before as string | undefined;
      if (typeof daysStr === 'string') {
        return daysStr.split(',').map(Number).filter((n) => !isNaN(n) && n > 0);
      }
      return [30, 7, 3, 1];
    })();

  const notificationState =
    (settingsMap.notificationState as NotificationState | undefined) ??
    (typeof settingsMap.notification_state === 'string'
      ? JSON.parse(settingsMap.notification_state as string)
      : {});

  return {
    emailNotifications,
    notificationEmail,
    notifyDaysBefore,
    notificationState,
  };
}

async function saveNotificationState(
  db: D1Database,
  state: NotificationState,
): Promise<void> {
  const jsonValue = JSON.stringify(state);
  await db
    .prepare(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('notificationState', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )
    .bind(jsonValue)
    .run();
}

function getExpiryLevel(remainingDays: number, notifyDays: number[]): 'warning' | 'urgent' | 'expired' | null {
  if (remainingDays <= 0) return 'expired';
  if (notifyDays.includes(remainingDays)) {
    if (remainingDays <= 3) return 'urgent';
    return 'warning';
  }
  // Find the closest threshold that has been passed
  const sortedDays = [...notifyDays].sort((a, b) => b - a);
  for (const threshold of sortedDays) {
    if (remainingDays <= threshold) {
      if (threshold <= 3) return 'urgent';
      return 'warning';
    }
  }
  return null;
}

function shouldNotify(
  domainKey: string,
  level: string,
  state: NotificationState,
): boolean {
  const lastNotified = state[domainKey];
  if (!lastNotified) return true;

  // Notify if the level has escalated (e.g., from warning to urgent)
  if (lastNotified.level !== level) return true;

  // Don't re-notify at the same level on the same day
  const lastDate = new Date(lastNotified.date);
  const today = new Date();
  return (
    lastDate.getFullYear() !== today.getFullYear() ||
    lastDate.getMonth() !== today.getMonth() ||
    lastDate.getDate() !== today.getDate()
  );
}

export async function onScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  console.log('[Scheduled] Starting domain expiry check at', new Date().toISOString());

  try {
    // 1. Get notification settings
    const settings = await getNotificationSettings(env.DB);

    if (!settings.emailNotifications) {
      console.log('[Scheduled] Email notifications are disabled, skipping');
      return;
    }

    if (!settings.notificationEmail) {
      console.log('[Scheduled] No notification email configured, skipping');
      return;
    }

    if (settings.notifyDaysBefore.length === 0) {
      console.log('[Scheduled] No notification days configured, skipping');
      return;
    }

    // 2. Get all enabled API accounts
    const { results: accounts } = await env.DB
      .prepare(
        `SELECT id, name, platform, group_id, credentials_encrypted, is_enabled
         FROM api_accounts
         WHERE is_enabled = 1
         ORDER BY created_at ASC`,
      )
      .all<AccountRow>();

    if (accounts.length === 0) {
      console.log('[Scheduled] No enabled accounts found');
      return;
    }

    // 3. For each account, fetch domains
    const allDomains: (UnifiedDomain & { accountName: string })[] = [];

    for (const account of accounts) {
      try {
        const decrypted = await decrypt(account.credentials_encrypted, env.ENCRYPTION_KEY);
        const credentials = JSON.parse(decrypted) as Record<string, string>;

        const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
        await waitForRateLimit(`scheduled:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

        const adapter = getAdapter(account.platform);
        const result = await retryWithBackoff(() =>
          adapter.listDomains(credentials as unknown as PlatformCredentials),
        );

        const domains = result.domains.map((domain) => ({
          ...domain,
          accountName: account.name,
        }));

        allDomains.push(...domains);
      } catch (error) {
        console.error(`[Scheduled] Failed to fetch domains for account ${account.id} (${account.name}):`, error);
      }
    }

    console.log(`[Scheduled] Found ${allDomains.length} domains across ${accounts.length} accounts`);

    // 4. Check expiry and send notifications
    let notificationsSent = 0;

    for (const domain of allDomains) {
      if (!domain.expireTime) continue;

      try {
        const expireDate = new Date(domain.expireTime);
        const now = new Date();
        const diffMs = expireDate.getTime() - now.getTime();
        const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const level = getExpiryLevel(remainingDays, settings.notifyDaysBefore);
        if (!level) continue;

        const domainKey = `${domain.accountId}:${domain.id}`;
        if (!shouldNotify(domainKey, level, settings.notificationState)) continue;

        // Generate and send email
        const emailContent = generateExpiryEmail({
          domainName: domain.domain,
          platform: domain.platform,
          expireDate: domain.expireTime,
          remainingDays: Math.max(0, remainingDays),
          level,
        });

        const sent = await sendEmail(
          {
            to: settings.notificationEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          },
          env,
        );

        if (sent) {
          notificationsSent++;
          // Update notification state
          settings.notificationState[domainKey] = {
            level,
            date: new Date().toISOString(),
          };
        }
      } catch (error) {
        console.error(`[Scheduled] Error processing domain ${domain.domain}:`, error);
      }
    }

    // 5. Save updated notification state
    if (notificationsSent > 0) {
      await saveNotificationState(env.DB, settings.notificationState);
    }

    // 6. Log the scheduled check
    await logOperation(env, {
      action: 'scheduled_expiry_check',
      targetType: 'system',
      detail: {
        accountsChecked: accounts.length,
        domainsChecked: allDomains.length,
        notificationsSent,
      },
      ipAddress: 'system',
      status: 'success',
    });

    console.log(
      `[Scheduled] Expiry check complete: ${allDomains.length} domains checked, ${notificationsSent} notifications sent`,
    );
  } catch (error) {
    console.error('[Scheduled] Fatal error during scheduled check:', error);

    // Try to log the error
    try {
      await logOperation(env, {
        action: 'scheduled_expiry_check',
        targetType: 'system',
        detail: { error: String(error) },
        ipAddress: 'system',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (logError) {
      console.error('[Scheduled] Failed to log error:', logError);
    }
  }
}

