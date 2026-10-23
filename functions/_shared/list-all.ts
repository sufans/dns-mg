import type { AdapterCredentials, DNSPlatformAdapter, UnifiedDomain } from './types';

const PAGE_SIZE = 100;
// Defensive bound: an upstream that always returns a full page would otherwise
// loop forever. 100 pages x 100 rows is far beyond any realistic account.
const MAX_PAGES = 100;

/**
 * Lists every domain for an account across all pages by repeatedly requesting
 * the next page until a page returns fewer items than the page size.
 * `reserveBeforePage` is awaited before each upstream request so the platform
 * rate limit is applied per request rather than per account.
 */
export async function listAllDomains(
  adapter: DNSPlatformAdapter,
  credentials: AdapterCredentials,
  reserveBeforePage?: () => Promise<void>
): Promise<UnifiedDomain[]> {
  const all: UnifiedDomain[] = [];
  let page = 1;
  while (page <= MAX_PAGES) {
    if (reserveBeforePage) await reserveBeforePage();
    const domains = await adapter.listDomains(credentials, { page, size: PAGE_SIZE });
    all.push(...domains);
    if (domains.length < PAGE_SIZE) break;
    page += 1;
  }
  return all;
}
