import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DnsheProvider } from './dnshe';
import { apiClient } from '../lib/api';

vi.mock('../lib/api', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

describe('DnsheProvider', () => {
  let provider: DnsheProvider;

  beforeEach(() => {
    provider = new DnsheProvider();
    vi.clearAllMocks();
  });

  it('setCredentials stores credentials', () => {
    provider.setCredentials({ apiKey: 'my-key', apiSecret: 'my-secret' });
    // After setting credentials, testConnection should attempt to use them
    // We can verify indirectly through getAuthHeaders via testConnection
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { success: true, quota: { used: 0, base: 10, invite_bonus: 0, total: 10, available: 10 } },
    });

    return provider.testConnection().then(() => {
      expect(apiClient.request).toHaveBeenCalled();
      const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers['X-API-Key']).toBe('my-key');
      expect(callArgs[1].headers['X-API-Secret']).toBe('my-secret');
    });
  });

  it('getAuthHeaders returns correct headers', async () => {
    provider.setCredentials({ apiKey: 'test-key', apiSecret: 'test-secret' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { success: true, quota: { used: 0, base: 10, invite_bonus: 0, total: 10, available: 10 } },
    });

    await provider.testConnection();

    const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers['X-API-Key']).toBe('test-key');
    expect(callArgs[1].headers['X-API-Secret']).toBe('test-secret');
  });

  it('listDomains maps response correctly', async () => {
    provider.setCredentials({ apiKey: 'k', apiSecret: 's' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        success: true,
        count: 1,
        subdomains: [
          {
            id: 42,
            subdomain: 'test',
            rootdomain: 'example.com',
            full_domain: 'test.example.com',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          has_more: false,
          next_page: null,
          prev_page: null,
          total: 1,
        },
      },
    });

    const result = await provider.listDomains({ page: 1, size: 20 });

    expect(result.domains).toHaveLength(1);
    expect(result.domains[0]).toEqual({
      id: '42',
      name: 'test.example.com',
      provider: 'dnshe',
      status: 'active',
      expireTime: null,
      recordCount: 0,
      createdAt: '2024-01-01T00:00:00Z',
      rootDomain: 'example.com',
      subdomainId: 42,
    });
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.total).toBe(1);
  });

  it('listDnsRecords maps response correctly', async () => {
    provider.setCredentials({ apiKey: 'k', apiSecret: 's' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        success: true,
        count: 1,
        records: [
          {
            id: 100,
            record_id: 'rec-100',
            name: 'www',
            type: 'A',
            content: '1.2.3.4',
            ttl: 600,
            priority: null,
            line: 'default',
            proxied: false,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
      },
    });

    const result = await provider.listDnsRecords({ domainId: '42' });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual({
      id: '100',
      domainId: '42',
      name: 'www',
      type: 'A',
      value: '1.2.3.4',
      line: 'default',
      ttl: 600,
      priority: null,
      status: 'active',
      remark: '',
      updatedAt: '2024-01-02T00:00:00Z',
      provider: 'dnshe',
      recordId: 'rec-100',
      proxied: false,
    });
  });

  it('testConnection returns true on success', async () => {
    provider.setCredentials({ apiKey: 'k', apiSecret: 's' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { success: true, quota: { used: 0, base: 10, invite_bonus: 0, total: 10, available: 10 } },
    });

    const result = await provider.testConnection();
    expect(result).toBe(true);
  });

  it('testConnection returns false without credentials', async () => {
    const result = await provider.testConnection();
    expect(result).toBe(false);
  });

  it('testConnection returns false on API failure', async () => {
    provider.setCredentials({ apiKey: 'k', apiSecret: 's' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      data: null,
      error: 'Unauthorized',
    });

    const result = await provider.testConnection();
    expect(result).toBe(false);
  });
});
