import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the fetcher module BEFORE any other imports
// ---------------------------------------------------------------------------
vi.mock('../../fetcher', () => {
  class UpstreamError extends Error {
    status: number;
    code?: string;
    retryAfter?: number;
    constructor(message: string, status: number, code?: string, retryAfter?: number) {
      super(message);
      this.name = 'UpstreamError';
      this.status = status;
      this.code = code;
      this.retryAfter = retryAfter;
    }
  }
  return {
    fetchJsonWithRetry: vi.fn(),
    UpstreamError,
  };
});

import { createGleamAdapter, generateSignature } from '../gleam';
import { fetchJsonWithRetry } from '../../fetcher';
import type { AdapterCredentials, DnsRecordInput } from '../../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const credentials: AdapterCredentials = {
  platform: 'gleam',
  config: { apiKey: 'test-api-key', apiSecret: 'test-api-secret' },
};

const accountMeta = {
  id: 1,
  name: 'test-account',
  groupId: null,
  groupName: null,
  groupColor: null,
};

const mockFetch = vi.mocked(fetchJsonWithRetry);

// ---------------------------------------------------------------------------
// Mock crypto.subtle
// ---------------------------------------------------------------------------
const mockImportKey = vi.fn().mockResolvedValue({});
const mockSign = vi.fn().mockResolvedValue(new Uint8Array([0xAB, 0xCD]).buffer);

beforeEach(() => {
  vi.clearAllMocks();

  // Deterministic timestamp
  vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

  // Mock crypto.subtle using vi.stubGlobal to handle getter-only property
  vi.stubGlobal('crypto', {
    subtle: {
      importKey: mockImportKey,
      sign: mockSign,
    },
    getRandomValues: vi.fn(),
    randomUUID: vi.fn(),
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateSignature', () => {
  it('produces correct HMAC-SHA256 hex signature', async () => {
    const timestamp = '1700000000';
    const method = 'GET';
    const path = '/api/open/subdomains';
    const body = '';
    const apiSecret = 'test-api-secret';

    const signature = await generateSignature(timestamp, method, path, body, apiSecret);

    // Verify that importKey was called with correct parameters
    expect(mockImportKey).toHaveBeenCalledTimes(1);
    expect(mockImportKey).toHaveBeenCalledWith(
      'raw',
      expect.any(Uint8Array),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    // Verify key data is the encoded apiSecret
    const keyDataArg = mockImportKey.mock.calls[0][1] as Uint8Array;
    expect(new TextDecoder().decode(keyDataArg)).toBe(apiSecret);

    // Verify sign was called with correct parameters
    expect(mockSign).toHaveBeenCalledTimes(1);
    expect(mockSign).toHaveBeenCalledWith('HMAC', expect.any(Object), expect.any(Uint8Array));

    // Verify message data
    const messageArg = mockSign.mock.calls[0][2] as Uint8Array;
    const expectedMessage = timestamp + method + path + body;
    expect(new TextDecoder().decode(messageArg)).toBe(expectedMessage);

    // Verify hex output (0xAB, 0xCD → "abcd")
    expect(signature).toBe('abcd');
  });

  it('includes body in the signature message for POST requests', async () => {
    const timestamp = '1700000000';
    const method = 'POST';
    const path = '/api/open/subdomains/123/records';
    const body = '{"name":"www"}';
    const apiSecret = 'test-api-secret';

    await generateSignature(timestamp, method, path, body, apiSecret);

    const messageArg = mockSign.mock.calls[0][2] as Uint8Array;
    const expectedMessage = timestamp + method + path + body;
    expect(new TextDecoder().decode(messageArg)).toBe(expectedMessage);
  });
});

describe('createGleamAdapter', () => {
  const adapter = createGleamAdapter(accountMeta);

  describe('platform metadata', () => {
    it('reports platform as gleam', () => {
      expect(adapter.platform).toBe('gleam');
    });

    it('has correct rate limit', () => {
      expect(adapter.rateLimit).toEqual({
        accountWindowLimit: 55,
        windowSeconds: 60,
      });
    });
  });

  describe('listDomains', () => {
    it('sends correct GET request to subdomains endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, data: [] });

      await adapter.listDomains(credentials);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('https://api.gleam.com/api/open/subdomains?page=1&size=100');
      expect(init?.method).toBe('GET');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-Api-Key']).toBe('test-api-key');
      expect(headers['X-Timestamp']).toBe('1700000000');
      expect(headers['X-Signature']).toBe('abcd');
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('includes pagination and filter params', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, data: [] });

      await adapter.listDomains(credentials, {
        page: 3,
        size: 50,
        search: 'example',
        status: 'active',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=3');
      expect(url).toContain('size=50');
      expect(url).toContain('search=example');
      expect(url).toContain('status=active');
    });

    it('maps GleamSubdomain[] to UnifiedDomain[]', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: [
          {
            id: 101,
            full_domain: 'example.com',
            status: 'active',
            created_at: '2024-01-01',
            expires_at: '2025-01-01',
            remaining_days: 180,
            record_count: 5,
          },
          {
            id: 102,
            subdomain: 'test.org',
            status: 'expired',
            remaining_days: -5,
            record_count: 0,
          },
        ],
      });

      const result = await adapter.listDomains(credentials);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '101',
        name: 'example.com',
        platform: 'gleam',
        accountId: 1,
        accountName: 'test-account',
        status: 'active',
        dnsStatus: '正常',
        recordCount: 5,
        expired: false,
      });
      expect(result[1]).toMatchObject({
        id: '102',
        name: 'test.org',
        status: 'expired',
        expired: true,
        remainingDays: -5,
        renewStatus: '已过期',
      });
    });

    it('handles empty data array', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, data: undefined });

      const result = await adapter.listDomains(credentials);
      expect(result).toEqual([]);
    });

    it('handles remaining_days from expires_at', async () => {
      // Mock Date.now to 2024-06-15
      vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-06-15').getTime());

      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: [
          {
            id: 1,
            full_domain: 'example.com',
            expires_at: '2024-07-15',
            // no remaining_days provided
          },
        ],
      });

      const result = await adapter.listDomains(credentials);
      // 30 days between 2024-06-15 and 2024-07-15
      expect(result[0].remainingDays).toBe(30);
    });
  });

  describe('getDomain', () => {
    it('fetches single domain detail', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: {
          id: 42,
          full_domain: 'single.example.com',
          status: 'active',
          record_count: 3,
        },
      });

      const result = await adapter.getDomain(credentials, '42');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.gleam.com/api/open/subdomains/42');
      expect(result.id).toBe('42');
      expect(result.name).toBe('single.example.com');
    });

    it('throws UpstreamError when data is null', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, data: null });

      await expect(adapter.getDomain(credentials, '42')).rejects.toThrow('Gleam 子域名不存在');
    });
  });

  describe('listRecords', () => {
    it('sends correct GET request to records endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, data: [] });

      await adapter.listRecords(credentials, 'domain-123');

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('https://api.gleam.com/api/open/subdomains/domain-123/records?page=1&size=100');
      expect(init?.method).toBe('GET');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-Api-Key']).toBe('test-api-key');
      expect(headers['X-Signature']).toBe('abcd');
    });

    it('includes optional filter params', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, data: [] });

      await adapter.listRecords(credentials, 'domain-123', {
        type: 'A',
        line: 'default',
        keyword: 'www',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('type=A');
      expect(url).toContain('line=default');
      expect(url).toContain('keyword=www');
    });

    it('maps GleamRecord[] to UnifiedRecord[]', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: [
          {
            id: 1,
            name: 'www',
            type: 'A',
            content: '1.2.3.4',
            ttl: 600,
            priority: null,
            line: 'default',
            status: 'active',
            updated_at: '2024-06-01',
          },
          {
            id: 2,
            record_id: 'rec-abc',
            name: '@',
            type: 'CNAME',
            value: 'example.com',
            ttl: 300,
            priority: 10,
            status: 'suspended',
            remark: 'test record',
          },
        ],
      });

      const result = await adapter.listRecords(credentials, 'domain-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '1',
        domainId: 'domain-123',
        name: 'www',
        type: 'A',
        value: '1.2.3.4',
        ttl: 600,
        line: 'default',
        status: 'active',
      });
      expect(result[1]).toMatchObject({
        id: '2',
        providerRecordId: 'rec-abc',
        name: '@',
        type: 'CNAME',
        value: 'example.com',
        ttl: 300,
        priority: 10,
        status: 'paused',
        remark: 'test record',
      });
    });
  });

  describe('createRecord', () => {
    const recordInput: DnsRecordInput = {
      name: 'www',
      type: 'A',
      value: '1.2.3.4',
      ttl: 600,
      priority: null,
      line: null,
    };

    it('sends POST request with correct body', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: { id: 99, name: 'www', type: 'A', content: '1.2.3.4', ttl: 600 },
      });

      await adapter.createRecord(credentials, 'domain-123', recordInput);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.gleam.com/api/open/subdomains/domain-123/records');
      expect(init?.method).toBe('POST');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-Api-Key']).toBe('test-api-key');
      expect(headers['X-Signature']).toBe('abcd');
      expect(headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(init!.body as string);
      expect(body).toEqual({
        name: 'www',
        type: 'A',
        content: '1.2.3.4',
        ttl: 600,
        priority: undefined,
        line: undefined,
      });
    });

    it('converts @ name to empty string in body', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: { id: 100, name: '@', type: 'A', content: '5.6.7.8', ttl: 600 },
      });

      await adapter.createRecord(credentials, 'domain-123', {
        ...recordInput,
        name: '@',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
      expect(body.name).toBe('');
    });

    it('returns mapped UnifiedRecord', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: {
          id: 99,
          name: 'www',
          type: 'A',
          content: '1.2.3.4',
          ttl: 600,
          priority: 5,
          line: 'default',
        },
      });

      const result = await adapter.createRecord(credentials, 'domain-123', {
        ...recordInput,
        priority: 5,
        line: 'default',
      });

      expect(result).toMatchObject({
        id: '99',
        domainId: 'domain-123',
        name: 'www',
        type: 'A',
        value: '1.2.3.4',
        ttl: 600,
        priority: 5,
        line: 'default',
      });
    });

    it('returns null when response data is missing', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0 });

      const result = await adapter.createRecord(credentials, 'domain-123', recordInput);
      expect(result).toBeNull();
    });
  });

  describe('updateRecord', () => {
    const recordInput: DnsRecordInput = {
      name: 'api',
      type: 'CNAME',
      value: 'api.example.com',
      ttl: 300,
      priority: null,
      line: null,
    };

    it('sends PUT request to dns-records endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: { id: 55, name: 'api', type: 'CNAME', content: 'api.example.com', ttl: 300 },
      });

      await adapter.updateRecord(credentials, 'domain-123', '55', recordInput);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.gleam.com/api/open/dns-records/55');
      expect(init?.method).toBe('PUT');

      const body = JSON.parse(init!.body as string);
      expect(body).toEqual({
        name: 'api',
        type: 'CNAME',
        content: 'api.example.com',
        ttl: 300,
        priority: undefined,
        line: undefined,
      });
    });

    it('returns mapped UnifiedRecord', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: {
          id: 55,
          name: 'api',
          type: 'CNAME',
          content: 'api.example.com',
          ttl: 300,
          priority: 10,
        },
      });

      const result = await adapter.updateRecord(credentials, 'domain-xyz', '55', {
        ...recordInput,
        priority: 10,
      });

      expect(result).toMatchObject({
        id: '55',
        domainId: 'domain-xyz',
        name: 'api',
        type: 'CNAME',
        value: 'api.example.com',
        ttl: 300,
        priority: 10,
      });
    });

    it('returns null when response data is missing', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0 });

      const result = await adapter.updateRecord(credentials, 'domain-123', '55', recordInput);
      expect(result).toBeNull();
    });
  });

  describe('deleteRecord', () => {
    it('sends DELETE request to dns-records endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0 });

      await adapter.deleteRecord(credentials, 'domain-123', '77');

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.gleam.com/api/open/dns-records/77');
      expect(init?.method).toBe('DELETE');
    });

    it('does not include a body for DELETE', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0 });

      await adapter.deleteRecord(credentials, 'domain-123', '77');

      const init = mockFetch.mock.calls[0][1];
      expect(init?.body).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws UpstreamError when API returns non-zero code', async () => {
      mockFetch.mockResolvedValueOnce({ code: 500, message: 'Internal Server Error' });

      await expect(adapter.listDomains(credentials)).rejects.toThrow('Internal Server Error');
    });

    it('throws UpstreamError when API returns error field', async () => {
      mockFetch.mockResolvedValueOnce({ code: 400, error: 'Invalid request' });

      await expect(adapter.listDomains(credentials)).rejects.toThrow('Invalid request');
    });

    it('throws UpstreamError with code 502 when API returns non-zero code', async () => {
      mockFetch.mockResolvedValueOnce({ code: 403, message: 'Forbidden' });

      try {
        await adapter.listDomains(credentials);
        expect.fail('Expected error to be thrown');
      } catch (e: any) {
        expect(e.status).toBe(502);
        expect(e.message).toBe('Forbidden');
      }
    });

    it('passes through successful responses with code 0', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, data: [] });

      await expect(adapter.listDomains(credentials)).resolves.toEqual([]);
    });

    it('passes through responses without code field', async () => {
      mockFetch.mockResolvedValueOnce({ data: [] });

      await expect(adapter.listDomains(credentials)).resolves.toEqual([]);
    });

    it('throws when credentials are missing apiKey', async () => {
      const badCredentials: AdapterCredentials = {
        platform: 'gleam',
        config: { apiSecret: 'secret' },
      };

      await expect(adapter.listDomains(badCredentials)).rejects.toThrow('Gleam API Key/Secret 未配置');
    });

    it('throws when credentials are missing apiSecret', async () => {
      const badCredentials: AdapterCredentials = {
        platform: 'gleam',
        config: { apiKey: 'key' },
      };

      await expect(adapter.listDomains(badCredentials)).rejects.toThrow('Gleam API Key/Secret 未配置');
    });
  });

  describe('renewStatus mapping', () => {
    it('maps never_expires to 永久', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: [{ id: 1, full_domain: 'forever.com', never_expires: 1 }],
      });

      const result = await adapter.listDomains(credentials);
      expect(result[0].renewStatus).toBe('永久');
    });

    it('maps expired to 已过期', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: [{ id: 1, full_domain: 'expired.com', status: 'expired' }],
      });

      const result = await adapter.listDomains(credentials);
      expect(result[0].renewStatus).toBe('已过期');
      expect(result[0].expired).toBe(true);
    });

    it('maps remaining <= 30 to 待续期', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: [{ id: 1, full_domain: 'renew.com', remaining_days: 15 }],
      });

      const result = await adapter.listDomains(credentials);
      expect(result[0].renewStatus).toBe('待续期');
    });

    it('maps remaining > 30 to 正常', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        data: [{ id: 1, full_domain: 'ok.com', remaining_days: 60 }],
      });

      const result = await adapter.listDomains(credentials);
      expect(result[0].renewStatus).toBe('正常');
    });
  });
});