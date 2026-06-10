// Email sending via MailChannels API
// Cloudflare Workers can send emails using the MailChannels API
// (free for Cloudflare workers, no additional setup needed)
//
// Requirements:
// - The sending domain must have proper SPF/DKIM DNS records
// - For Cloudflare Workers, use a custom domain with proper DNS setup
// - The from email must use a domain that's verified in MailChannels
// - Add a Domain Lockdown record in MailChannels for your domain
//
// Alternative: Use Cloudflare's built-in send_email binding if the project
// uses a custom domain with Email Routing

import type { Env } from './types';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface MailChannelsPersonalization {
  to: { email: string; name?: string }[];
}

interface MailChannelsContent {
  type: 'text/plain' | 'text/html';
  value: string;
}

interface MailChannelsBody {
  personalizations: MailChannelsPersonalization[];
  from: { email: string; name: string };
  subject: string;
  content: MailChannelsContent[];
}

export async function sendEmail(
  options: EmailOptions,
  env: Env,
): Promise<boolean> {
  const sendDomain = env.SEND_EMAIL_DOMAIN || 'dns-manager.workers.dev';
  const fromEmail = `noreply@${sendDomain}`;

  const body: MailChannelsBody = {
    personalizations: [
      {
        to: [{ email: options.to }],
      },
    ],
    from: { email: fromEmail, name: 'DNS Manager' },
    subject: options.subject,
    content: [
      { type: 'text/plain', value: options.text },
      { type: 'text/html', value: options.html },
    ],
  };

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `MailChannels API error: ${response.status} ${response.statusText}`,
        errorText,
      );
      return false;
    }

    console.log(`Email sent successfully to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error('Failed to send email via MailChannels:', error);
    return false;
  }
}
