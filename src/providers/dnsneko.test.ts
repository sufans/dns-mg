import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DnsnekoProvider } from './dnsneko';
import { apiClient } from '../lib/api';

vi.mock('../lib/api', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

describe('DnsnekoProvider', () => {
  let provider: DnsnekoProvider;

  beforeEach(() => {
    provider = new DnsnekoProvider();
    vi.clearAllMocks();
  });

  it('setCredentials stores credentials', () => {
    provider.setCredentials({ username: 'testuser', apiKey: 'test-key' });
    // Verify indirectly through getAuthHeaders
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: { domains: [], total: '0', size: '20', current: '1', pages: '0' } },
    });

    return provider.testConnection().then(() => {
      const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers['X-DNSNEKO-USERNAME']).toBe('testuser');
      expect(callArgs[1].headers['X-DNSNEKO-API-KEY']).toBe('test-key');
    });
  });

  it('getAuthHeaders throws if credentials not set', async () => {
    // Accessing getAuthHeaders indirectly via listDomains which calls ensureCredentials
    await expect(provider.listDomains({ page: 1, size: 20 })).rejects.toThrow(
      'DNSNeko API credentials not configured'
    );
  });

  it('getAuthHeaders returns correct headers when set', async () => {
    provider.setCredentials({ username: 'myuser', apiKey: 'mykey' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: { domains: [], total: '0', size: '20', current: '1', pages: '0' } },
    });

    await provider.listDomains({ page: 1, size: 20 });

    const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers['X-DNSNEKO-USERNAME']).toBe('myuser');
    expect(callArgs[1].headers['X-DNSNEKO-API-KEY']).toBe('mykey');
  });

  it('listDomains maps response correctly (string pagination fields)', async () => {
    provider.setCredentials({ username: 'u', apiKey: 'k' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        code: 200,
        message: 'ok',
        data: {
          domains: [
            {
              id: 'd1',
              domain: 'example.com',
              status: 0,
              expired: false,
              expireTime: '2025-12-31T00:00:00Z',
              recordCount: '5',
            },
          ],
          total: '1',
          size: '20',
          current: '1',
          pages: '1',
        },
      },
    });

    const result = await provider.listDomains({ page: 1, size: 20 });

    expect(result.domains).toHaveLength(1);
    expect(result.domains[0]).toEqual({
      id: 'd1',
      name: 'example.com',
      provider: 'dnsneko',
      status: 'active',
      expireTime: '2025-12-31T00:00:00Z',
      recordCount: 5,
      createdAt: null,
      domainId: 'd1',
    });
    expect(result.pagination).toEqual({
      page: 1,
      size: 20,
      total: 1,
      pages: 1,
    });
  });

  it('listDnsRecords maps response correctly', async () => {
    provider.setCredentials({ username: 'u', apiKey: 'k' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        code: 200,
        message: 'ok',
        data: {
          domainId: 'd1',
          domain: 'example.com',
          records: [
            {
              id: 'r1',
              domainId: 'd1',
              name: 'www',
              type: 'A',
              value: '1.2.3.4',
              line: 'default',
              ttl: 600,
              priority: null,
              remark: 'test record',
              status: 1,
              updateTime: '2024-06-01T00:00:00Z',
            },
          ],
          total: '1',
          size: '20',
          current: '1',
          pages: '1',
        },
      },
    });

    const result = await provider.listDnsRecords({ domainId: 'd1' });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual({
      id: 'r1',
      domainId: 'd1',
      name: 'www',
      type: 'A',
      value: '1.2.3.4',
      line: 'default',
      ttl: 600,
      priority: null,
      status: 'active',
      remark: 'test record',
      updatedAt: '2024-06-01T00:00:00Z',
      provider: 'dnsneko',
    });
  });

  it('batchUpdateStatus constructs correct request body', async () => {
    provider.setCredentials({ username: 'u', apiKey: 'k' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: {} },
    });

    await provider.batchUpdateStatus!({
      domainId: 'd1',
      ids: ['r1', 'r2'],
      status: 1,
    });

    const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe('POST');
    const body = JSON.parse(callArgs[1].body);
    expect(body.domainId).toBe('d1');
    expect(body.ids).toEqual(['r1', 'r2']);
    expect(body.status).toBe(1);
  });

  it('batchDelete constructs correct request body', async () => {
    provider.setCredentials({ username: 'u', apiKey: 'k' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: {} },
    });

    await provider.batchDelete!({
      domainId: 'd1',
      ids: ['r1', 'r2'],
    });

    const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe('POST');
    const body = JSON.parse(callArgs[1].body);
    expect(body.domainId).toBe('d1');
    expect(body.ids).toEqual(['r1', 'r2']);
  });

  it('batchUpdateTtl constructs correct request body', async () => {
    provider.setCredentials({ username: 'u', apiKey: 'k' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: {} },
    });

    await provider.batchUpdateTtl!({
      domainId: 'd1',
      ids: ['r1'],
      ttl: 300,
    });

    const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.ttl).toBe(300);
  });

  it('batchUpdateLine constructs correct request body', async () => {
    provider.setCredentials({ username: 'u', apiKey: 'k' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: {} },
    });

    await provider.batchUpdateLine!({
      domainId: 'd1',
      ids: ['r1'],
      line: 'telecom',
    });

    const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.line).toBe('telecom');
  });

  it('testConnection returns true on success', async () => {
    provider.setCredentials({ username: 'u', apiKey: 'k' });
    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: { domains: [], total: '0', size: '20', current: '1', pages: '0' } },
    });

    const result = await provider.testConnection();
    expect(result).toBe(true);
  });

  it('testConnection returns false without credentials', async () => {
    const result = await provider.testConnection();
    expect(result).toBe(false);
  });

  it('separate instances maintain independent credentials', async () => {
    const provider1 = new DnsnekoProvider();
    const provider2 = new DnsnekoProvider();

    provider1.setCredentials({ username: 'user1', apiKey: 'key1' });
    provider2.setCredentials({ username: 'user2', apiKey: 'key2' });

    (apiClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { code: 200, message: 'ok', data: { domains: [], total: '0', size: '20', current: '1', pages: '0' } },
    });

    await provider1.testConnection();
    const callArgs = (apiClient.request as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers['X-DNSNEKO-USERNAME']).toBe('user1');
    expect(callArgs[1].headers['X-DNSNEKO-API-KEY']).toBe('key1');
  });
});
