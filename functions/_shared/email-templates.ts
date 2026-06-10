// Email templates for domain expiry notifications

interface ExpiryEmailParams {
  domainName: string;
  platform: string;
  expireDate: string;
  remainingDays: number;
  level: 'warning' | 'urgent' | 'expired';
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

type LevelConfig = {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  titleText: string;
};

const LEVEL_CONFIG: Record<ExpiryEmailParams['level'], LevelConfig> = {
  warning: {
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fbbf24',
    icon: '⚠️',
    titleText: '域名即将到期提醒',
  },
  urgent: {
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#f87171',
    icon: '🚨',
    titleText: '域名即将到期 - 紧急提醒',
  },
  expired: {
    color: '#991b1b',
    bgColor: '#450a0a',
    borderColor: '#dc2626',
    icon: '❌',
    titleText: '域名已过期 - 需要立即处理',
  },
};

function getLevelLabel(level: ExpiryEmailParams['level']): string {
  switch (level) {
    case 'warning':
      return '提醒';
    case 'urgent':
      return '紧急';
    case 'expired':
      return '已过期';
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function generateExpiryEmail(params: ExpiryEmailParams): EmailContent {
  const { domainName, platform, expireDate, remainingDays, level } = params;
  const config = LEVEL_CONFIG[level];
  const formattedDate = formatDate(expireDate);
  const levelLabel = getLevelLabel(level);

  const subject = `[DNS Manager${levelLabel !== '提醒' ? ` - ${levelLabel}` : ''}] 域名 ${domainName} ${level === 'expired' ? '已过期' : `将在 ${remainingDays} 天后到期`}`;

  const text = generateTextContent(domainName, platform, formattedDate, remainingDays, level);
  const html = generateHtmlContent(domainName, platform, formattedDate, remainingDays, level, config);

  return { subject, html, text };
}

function generateTextContent(
  domainName: string,
  platform: string,
  formattedDate: string,
  remainingDays: number,
  level: ExpiryEmailParams['level'],
): string {
  const statusText = level === 'expired' ? '已过期' : `将在 ${remainingDays} 天后到期`;

  return `DNS Manager - 域名到期通知

域名: ${domainName}
平台: ${platform}
到期日期: ${formattedDate}
状态: ${statusText}

${level === 'expired'
    ? '该域名已过期，请立即登录管理平台进行续期操作，以免影响域名解析服务。'
    : level === 'urgent'
      ? `该域名即将在 ${remainingDays} 天后到期，请尽快登录管理平台进行续期操作。`
      : `该域名将在 ${remainingDays} 天后到期，建议您提前安排续期。`
}

请登录 DNS Manager 管理平台查看详情并处理。

---
此邮件由 DNS Manager 系统自动发送，请勿直接回复。`;
}

function generateHtmlContent(
  domainName: string,
  platform: string,
  formattedDate: string,
  remainingDays: number,
  level: ExpiryEmailParams['level'],
  config: LevelConfig,
): string {
  const statusText = level === 'expired' ? '已过期' : `${remainingDays} 天后到期`;

  const actionText = level === 'expired'
    ? '立即续期'
    : level === 'urgent'
      ? '尽快续期'
      : '查看详情';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>域名到期通知</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 32px 40px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                ${config.icon} DNS Manager
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                ${config.titleText}
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background-color: ${config.bgColor}; border-left: 4px solid ${config.color}; padding: 20px 40px;">
              <p style="margin: 0; color: ${config.color}; font-size: 18px; font-weight: 600;">
                域名 ${level === 'expired' ? '已过期' : '即将到期'}
              </p>
            </td>
          </tr>

          <!-- Domain Info -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #94a3b8; font-size: 13px;">域名</span><br>
                    <span style="color: #f1f5f9; font-size: 18px; font-weight: 600;">${domainName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #94a3b8; font-size: 13px;">所属平台</span><br>
                    <span style="color: #f1f5f9; font-size: 15px;">${platform}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155;">
                    <span style="color: #94a3b8; font-size: 13px;">到期日期</span><br>
                    <span style="color: #f1f5f9; font-size: 15px;">${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #94a3b8; font-size: 13px;">状态</span><br>
                    <span style="color: ${config.color}; font-size: 15px; font-weight: 600;">${statusText}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="background-color: #1e293b; padding: 0 40px 24px;">
              <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.7;">
                ${level === 'expired'
                  ? '该域名已过期，DNS 解析服务可能已受到影响。请立即登录管理平台进行续期操作，恢复域名解析服务。'
                  : level === 'urgent'
                    ? `该域名即将在 <strong>${remainingDays}</strong> 天后到期，请尽快登录管理平台进行续期操作，避免域名过期导致解析服务中断。`
                    : `该域名将在 <strong>${remainingDays}</strong> 天后到期，建议您提前安排续期，确保域名解析服务不受影响。`
                }
              </p>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="background-color: #1e293b; padding: 8px 40px 32px; text-align: center;">
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                ${actionText}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 40px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                此邮件由 DNS Manager 系统自动发送，请勿直接回复。<br>
                如需修改通知设置，请登录管理平台进行调整。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
