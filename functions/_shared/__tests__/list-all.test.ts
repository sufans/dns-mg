import { describe, expect, it, vi } from 'vitest';
import { listAllDomains } from '../list-all';
import type { AdapterCredentials, DNSPlatformAdapter, UnifiedDomain } from '../types';

function domain(id: number): UnifiedDomain {
  return {
    id: String(id),
    name: `d${id}.example.com`,
    platform: 'dnshe',
    accountId: 1,
    accountName: 'acc',
    groupId: null,
    groupName: null,
    groupColor: null,
    status: 'active',
    dnsStatus: '正常',
    createdAt: null,
    expiresAt: null,
    expired: false,
    remainingDays: null,
    renewStatus: '正常',
    recordCount: null,
    raw: null
  };
}

function adapterWith(pages: UnifiedDomain[][]): DNSPlatformAdapter {
  return {
    platform: 'dnshe',
    rateLimit: { accountWindowLimit: 55, windowSeconds: 60 },
    listDomains: vi.fn(async (_credentials, options) => pages[(options?.page ?? 1) - 1] ?? []),
    getDomain: vi.fn(),
    listRecords: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn()
  } as unknown as DNSPlatformAdapter;
}

const credentials: AdapterCredentials = { platform: 'dnshe', config: { apiKey: 'k', apiSecret: 's' } };

describe('listAllDomains', () => {
  it('walks every page until a partial page is returned', async () => {
    const full = Array.from({ length: 100 }, (_, i) => domain(i));
    const adapter = adapterWith([full, [domain(100)]]);
    const all = await listAllDomains(adapter, credentials);
    expect(all).toHaveLength(101);
    expect(adapter.listDomains).toHaveBeenCalledTimes(2);
  });

  it('reserves the rate limit before each page request', async () => {
    const full = Array.from({ length: 100 }, (_, i) => domain(i));
    const adapter = adapterWith([full, []]);
    const reserve = vi.fn().mockResolvedValue(undefined);
    await listAllDomains(adapter, credentials, reserve);
    expect(reserve).toHaveBeenCalledTimes(2);
  });

  it('returns a single page when it is not full', async () => {
    const adapter = adapterWith([[domain(1), domain(2)]]);
    expect(await listAllDomains(adapter, credentials)).toHaveLength(2);
    expect(adapter.listDomains).toHaveBeenCalledTimes(1);
  });

  it('stops at the page cap when the upstream always returns a full page', async () => {
    const full = Array.from({ length: 100 }, (_, i) => domain(i));
    const adapter = {
      ...adapterWith([]),
      listDomains: vi.fn(async () => full)
    } as unknown as DNSPlatformAdapter;
    const all = await listAllDomains(adapter, credentials);
    expect(adapter.listDomains).toHaveBeenCalledTimes(100);
    expect(all).toHaveLength(100 * 100);
  });
});
