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

import { createGleamAdapter } from '../gleam';
import { fetchJsonWithRetry } from '../../fetcher';
import type { AdapterCredentials, DnsRecordInput } from '../../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const credentials: AdapterCredentials = {
  platform: 'gleam',
  config: { apiKey: 'hl6_testkey123456789' },
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
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  // Mock crypto.randomUUID for idempotency key
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValue('mock-uuid-1234'),
    getRandomValues: vi.fn(),
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
    it('sends correct GET request with X-API-Key header', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: [] });

      await adapter.listDomains(credentials);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://sld.0n.pub/api/v1/open/subdomains');
      expect(init?.method).toBe('GET');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('hl6_testkey123456789');
      expect(headers['X-Idempotency-Key']).toBeUndefined();
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('includes pagination params', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: [] });

      await adapter.listDomains(credentials, { page: 3, size: 50 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=3');
      expect(url).toContain('size=50');
    });

    it('maps GleamSubdomain[] to UnifiedDomain[]', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        message: 'ok',
        data: [
          {
            id: 101,
            domain_id: 1,
            user_id: 7,
            name: 'myhost',
            fqdn: 'myhost.example.com',
            claim_cost: 10,
            status: 'active',
            dns_records: [{ id: 1 }, { id: 2 }],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 102,
            domain_id: 1,
            user_id: 7,
            name: 'test',
            fqdn: 'test.example.com',
            claim_cost: 10,
            status: 'suspended',
            created_at: '2026-02-01T00:00:00Z',
            updated_at: '2026-02-01T00:00:00Z',
          },
        ],
      });

      const result = await adapter.listDomains(credentials);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '101',
        name: 'myhost.example.com',
        platform: 'gleam',
        accountId: 1,
        accountName: 'test-account',
        status: 'active',
        dnsStatus: '正常',
        recordCount: 2,
        expired: false,
        renewStatus: '正常',
      });
      expect(result[1]).toMatchObject({
        id: '102',
        name: 'test.example.com',
        status: 'suspended',
        dnsStatus: 'suspended',
        recordCount: null,
      });
    });

    it('handles empty data array', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: [] });

      const result = await adapter.listDomains(credentials);
      expect(result).toEqual([]);
    });
  });

  describe('getDomain', () => {
    it('fetches single domain detail', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        message: 'ok',
        data: {
          id: 42,
          domain_id: 1,
          user_id: 7,
          name: 'myhost',
          fqdn: 'myhost.example.com',
          claim_cost: 10,
          status: 'active',
          dns_records: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      const result = await adapter.getDomain(credentials, '42');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://sld.0n.pub/api/v1/open/subdomains/42');
      expect(result.id).toBe('42');
      expect(result.name).toBe('myhost.example.com');
    });

    it('throws UpstreamError when data is null', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: null });

      await expect(adapter.getDomain(credentials, '42')).rejects.toThrow('Gleam 子域名不存在');
    });
  });

  describe('listRecords', () => {
    it('sends correct GET request to dns-records endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: [] });

      await adapter.listRecords(credentials, '42');

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://sld.0n.pub/api/v1/open/dns-records/42');
      expect(init?.method).toBe('GET');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('hl6_testkey123456789');
    });

    it('maps GleamRecord[] to UnifiedRecord[]', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        message: 'ok',
        data: [
          {
            id: 5,
            subdomain_id: 42,
            type: 'A',
            name: 'myhost.example.com',
            content: '203.0.113.10',
            ttl: 1,
            proxied: true,
            provider_record_id: '8f2e6d1c9b7a4e3f2d1c0b9a8f7e6d5c',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 6,
            subdomain_id: 42,
            type: 'CNAME',
            name: 'www.myhost.example.com',
            content: 'myhost.example.com',
            ttl: 1,
            proxied: false,
            provider_record_id: 'abc123',
            status: 'suspended',
            created_at: '2026-02-01T00:00:00Z',
            updated_at: '2026-02-01T00:00:00Z',
          },
        ],
      });

      const result = await adapter.listRecords(credentials, '42');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '5',
        providerRecordId: '8f2e6d1c9b7a4e3f2d1c0b9a8f7e6d5c',
        domainId: '42',
        name: 'myhost.example.com',
        type: 'A',
        value: '203.0.113.10',
        ttl: 1,
        status: 'active',
        line: null,
        priority: null,
      });
      expect(result[1]).toMatchObject({
        id: '6',
        providerRecordId: 'abc123',
        status: 'paused',
      });
    });
  });

  describe('createRecord', () => {
    const recordInput: DnsRecordInput = {
      name: 'www',
      type: 'A',
      value: '203.0.113.10',
      ttl: 600,
      priority: null,
      line: null,
    };

    it('sends POST request with X-Idempotency-Key', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        message: 'created',
        data: {
          id: 99,
          subdomain_id: 42,
          type: 'A',
          name: 'myhost.example.com',
          content: '203.0.113.10',
          ttl: 1,
          proxied: false,
          provider_record_id: 'rec-xyz',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      await adapter.createRecord(credentials, '42', recordInput);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://sld.0n.pub/api/v1/open/dns-records/42');
      expect(init?.method).toBe('POST');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('hl6_testkey123456789');
      expect(headers['X-Idempotency-Key']).toBe('mock-uuid-1234');
      expect(headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(init!.body as string);
      expect(body).toEqual({ type: 'A', content: '203.0.113.10' });
    });

    it('returns mapped UnifiedRecord', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        message: 'created',
        data: {
          id: 99,
          subdomain_id: 42,
          type: 'A',
          name: 'myhost.example.com',
          content: '203.0.113.10',
          ttl: 1,
          proxied: false,
          provider_record_id: 'rec-xyz',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      const result = await adapter.createRecord(credentials, '42', recordInput);

      expect(result).toMatchObject({
        id: '99',
        providerRecordId: 'rec-xyz',
        domainId: '42',
        type: 'A',
        value: '203.0.113.10',
        ttl: 1,
        status: 'active',
      });
    });

    it('returns null when response data is missing', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'created' });

      const result = await adapter.createRecord(credentials, '42', recordInput);
      expect(result).toBeNull();
    });
  });

  describe('updateRecord', () => {
    const recordInput: DnsRecordInput = {
      name: 'www',
      type: 'A',
      value: '203.0.113.20',
      ttl: 600,
      priority: null,
      line: null,
    };

    it('sends PUT request with domainId in path', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        message: 'ok',
        data: {
          id: 5,
          subdomain_id: 42,
          type: 'A',
          name: 'myhost.example.com',
          content: '203.0.113.20',
          ttl: 1,
          proxied: true,
          provider_record_id: '8f2e6d1c',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      await adapter.updateRecord(credentials, '42', '5', recordInput);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://sld.0n.pub/api/v1/open/dns-records/42/5');
      expect(init?.method).toBe('PUT');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-Idempotency-Key']).toBe('mock-uuid-1234');

      const body = JSON.parse(init!.body as string);
      expect(body).toEqual({ content: '203.0.113.20' });
    });

    it('returns mapped UnifiedRecord', async () => {
      mockFetch.mockResolvedValueOnce({
        code: 0,
        message: 'ok',
        data: {
          id: 5,
          subdomain_id: 42,
          type: 'A',
          name: 'myhost.example.com',
          content: '203.0.113.20',
          ttl: 1,
          proxied: true,
          provider_record_id: '8f2e6d1c',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      const result = await adapter.updateRecord(credentials, '42', '5', recordInput);

      expect(result).toMatchObject({
        id: '5',
        domainId: '42',
        value: '203.0.113.20',
      });
    });

    it('returns null when response data is missing', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok' });

      const result = await adapter.updateRecord(credentials, '42', '5', recordInput);
      expect(result).toBeNull();
    });
  });

  describe('deleteRecord', () => {
    it('sends DELETE request with X-Idempotency-Key', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: { message: 'record deleted' } });

      await adapter.deleteRecord(credentials, '42', '5');

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://sld.0n.pub/api/v1/open/dns-records/42/5');
      expect(init?.method).toBe('DELETE');

      const headers = init?.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('hl6_testkey123456789');
      expect(headers['X-Idempotency-Key']).toBe('mock-uuid-1234');
    });

    it('does not include a body for DELETE', async () => {
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: { message: 'record deleted' } });

      await adapter.deleteRecord(credentials, '42', '5');

      const init = mockFetch.mock.calls[0][1];
      expect(init?.body).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws UpstreamError when API returns non-zero code', async () => {
      mockFetch.mockResolvedValueOnce({ code: 500, message: 'Internal Server Error' });

      await expect(adapter.listDomains(credentials)).rejects.toThrow('Internal Server Error');
    });

    it('throws UpstreamError with status 502', async () => {
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
      mockFetch.mockResolvedValueOnce({ code: 0, message: 'ok', data: [] });

      await expect(adapter.listDomains(credentials)).resolves.toEqual([]);
    });

    it('throws when credentials are missing apiKey', async () => {
      const badCredentials: AdapterCredentials = {
        platform: 'gleam',
        config: {},
      };

      await expect(adapter.listDomains(badCredentials)).rejects.toThrow('Gleam API Key 未配置');
    });
  });
});