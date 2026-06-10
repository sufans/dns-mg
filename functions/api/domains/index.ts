// GET /api/domains - Aggregate domain list from all enabled accounts
// Protected by requireAuth
// Query params: page, size, platform, groupId, status, keyword
import type { PagesFunction, AuthenticatedEventContext } from '../../_shared/types';
import { createResponse, withCors } from '../../_shared/utils';
import { requireAuth } from '../../_shared/auth';
import { decrypt } from '../../_shared/crypto';
import { getAdapter } from '../../../_shared/adapters/index';
import type { UnifiedDomain } from '../../../_shared/adapters/types';
import { waitForRateLimit, retryWithBackoff } from '../../_shared/rateLimiter';

interface AccountRow {
  id: string;
  name: string;
  platform: string;
  group_id: string | null;
  credentials_encrypted: string;
  is_enabled: number;
}

// Rate limit configs per platform
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  dnshe: { maxRequests: 60, windowMs: 60_000 },
  dnsneko: { maxRequests: 30, windowMs: 60_000 },
};

export const onRequestGet: PagesFunction = withCors(
  requireAuth(async (context: AuthenticatedEventContext) => {
    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('size') || '20', 10) || 20));
    const platformFilter = url.searchParams.get('platform') || undefined;
    const groupIdFilter = url.searchParams.get('groupId') || undefined;
    const statusFilter = url.searchParams.get('status') || undefined;
    const keyword = url.searchParams.get('keyword') || undefined;

    // 1. Get all enabled API accounts from D1
    let query = `SELECT id, name, platform, group_id, credentials_encrypted, is_enabled FROM api_accounts WHERE is_enabled = 1`;
    const binds: unknown[] = [];

    if (platformFilter) {
      query += ` AND platform = ?`;
      binds.push(platformFilter);
    }
    if (groupIdFilter) {
      query += ` AND group_id = ?`;
      binds.push(groupIdFilter);
    }

    query += ` ORDER BY created_at ASC`;

    const { results: accounts } = await context.env.DB
      .prepare(query)
      .bind(...binds)
      .all<AccountRow>();

    if (accounts.length === 0) {
      return createResponse({
        domains: [],
        total: 0,
        page,
        pageSize: size,
        hasMore: false,
      }, 200, 'ok');
    }

    // 2. For each account, decrypt credentials and call adapter.listDomains()
    const domainPromises = accounts.map(async (account) => {
      try {
        const decrypted = await decrypt(account.credentials_encrypted, context.env.ENCRYPTION_KEY);
        const credentials = JSON.parse(decrypted) as Record<string, string>;

        const rateLimit = RATE_LIMITS[account.platform] ?? { maxRequests: 30, windowMs: 60_000 };
        await waitForRateLimit(`domains:${account.id}`, rateLimit.maxRequests, rateLimit.windowMs);

        const adapter = getAdapter(account.platform);
        const result = await retryWithBackoff(() =>
          adapter.listDomains(credentials as never),
        );

        // Add accountId and platform info to each domain
        const domains = result.domains.map((domain) => ({
          ...domain,
          accountId: account.id,
          platform: account.platform as 'dnshe' | 'dnsneko',
          accountName: account.name,
        }));

        return domains;
      } catch (error) {
        // Gracefully handle errors - return empty for this account
        console.error(`Failed to fetch domains for account ${account.id}:`, error);
        return [];
      }
    });

    const domainArrays = await Promise.all(domainPromises);
    let allDomains: (UnifiedDomain & { accountName: string })[] = domainArrays.flat();

    // 3. Apply client-side filtering
    if (keyword) {
      const kw = keyword.toLowerCase();
      allDomains = allDomains.filter((d) =>
        d.domain.toLowerCase().includes(kw) ||
        (d.rootDomain && d.rootDomain.toLowerCase().includes(kw)) ||
        (d.subdomain && d.subdomain.toLowerCase().includes(kw)) ||
        (d.userRemark && d.userRemark.toLowerCase().includes(kw)),
      );
    }

    if (statusFilter) {
      allDomains = allDomains.filter((d) => {
        const statusStr = String(d.status).toLowerCase();
        return statusStr === statusFilter.toLowerCase();
      });
    }

    // 4. Apply pagination
    const total = allDomains.length;
    const startIndex = (page - 1) * size;
    const paginatedDomains = allDomains.slice(startIndex, startIndex + size);
    const hasMore = startIndex + size < total;

    return createResponse({
      domains: paginatedDomains,
      total,
      page,
      pageSize: size,
      hasMore,
    }, 200, 'ok');
  }),
);
