import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DnsheProvider } from './dnshe';
import { apiClient } from '../lib/api';
import type { ApiResponse } from '../types';

// Mock the apiClient module
vi.mock('../lib/api', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockedRequest = vi.mocked(apiClient.request);

describe('DnsheProvider', () => {
  let provider: DnsheProvider;

  beforeEach(() => {
    provider = new DnsheProvider();
    vi.clearAllMocks();
  });

  describe('provider metadata', () => {
    it('has correct type, name, and description', () => {
      expect(provider.type).toBe('dnshe');
      expect(provider.name).toBe('DNSHE');
      expect(provider.description).toBe('DNSHE 免费域名服务');
    });
  });

  describe('setCredentials', () => {
    it('sets API key and secret credentials', async () => {
      provider.setCredentials({ apiKey: 'test-key', apiSecret: 'test-secret' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          success: true,
          count: 0,
          subdomains: [],
          pagination: { page: 1, per_page: 10, has_more: false, next_page: null, prev_page: null, total: 0 },
        },
        error: null,
        errorCode: null,
      });
      await provider.listDomains({ page: 1, size: 10 });
      expect(mockedRequest).toHaveBeenCalled();
    });
  });

  describe('credential validation', () => {
    it('throws error when credentials are not set for listDomains', async () => {
      await expect(provider.listDomains({ page: 1, size: 10 })).rejects.toThrow(
        'DNSHE API credentials not configured'
      );
    });

    it('throws error when credentials are not set for getDomainDetail', async () => {
      await expect(provider.getDomainDetail('1')).rejects.toThrow(
        'DNSHE API credentials not configured'
      );
    });

    it('throws error when credentials are not set for listDnsRecords', async () => {
      await expect(provider.listDnsRecords({ domainId: '1' })).rejects.toThrow(
        'DNSHE API credentials not configured'
      );
    });
  });

  describe('buildUrl / API URL construction', () => {
    it('constructs URL with endpoint and action', async () => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          success: true,
          count: 0,
          subdomains: [],
          pagination: { page: 1, per_page: 10, has_more: false, next_page: null, prev_page: null, total: 0 },
        },
        error: null,
        errorCode: null,
      });

      await provider.listDomains({ page: 1, size: 10 });

      const calledUrl = mockedRequest.mock.calls[0][0] as string;
      expect(calledUrl).toContain('m=domain_hub');
      expect(calledUrl).toContain('endpoint=subdomains');
      expect(calledUrl).toContain('action=list');
      expect(calledUrl).toContain('https://api005.dnshe.com/index.php');
    });

    it('includes query params in URL', async () => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          success: true,
          count: 0,
          subdomains: [],
          pagination: { page: 1, per_page: 10, has_more: false, next_page: null, prev_page: null, total: 0 },
        },
        error: null,
        errorCode: null,
      });

      await provider.listDomains({ page: 2, size: 20, search: 'example' });

      const calledUrl = mockedRequest.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('per_page=20');
      expect(calledUrl).toContain('search=example');
      expect(calledUrl).toContain('include_total=true');
    });

    it('sends auth headers with credentials', async () => {
      provider.setCredentials({ apiKey: 'my-api-key', apiSecret: 'my-api-secret' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          success: true,
          count: 0,
          subdomains: [],
          pagination: { page: 1, per_page: 10, has_more: false, next_page: null, prev_page: null, total: 0 },
        },
        error: null,
        errorCode: null,
      });

      await provider.listDomains({ page: 1, size: 10 });

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toHaveProperty('X-API-Key', 'my-api-key');
      expect(calledOptions.headers).toHaveProperty('X-API-Secret', 'my-api-secret');
    });
  });

  describe('DNSHE response → UnifiedDomain mapping', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('maps subdomain list response to UnifiedDomain array', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 2,
          subdomains: [
            {
              id: 101,
              subdomain: 'test1',
              rootdomain: 'dnshe.com',
              full_domain: 'test1.dnshe.com',
              status: 'active',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z',
              expires_at: '2025-01-15T10:00:00Z',
            },
            {
              id: 102,
              subdomain: 'test2',
              rootdomain: 'dnshe.com',
              full_domain: 'test2.dnshe.com',
              status: 'suspended',
              created_at: '2024-02-01T08:00:00Z',
              updated_at: '2024-02-01T08:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            per_page: 10,
            has_more: false,
            next_page: null,
            prev_page: null,
            total: 2,
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 10 });

      expect(result.domains).toHaveLength(2);
      expect(result.domains[0]).toEqual({
        id: '101',
        name: 'test1.dnshe.com',
        provider: 'dnshe',
        status: 'active',
        expireTime: '2025-01-15T10:00:00Z',
        recordCount: 0,
        createdAt: '2024-01-15T10:00:00Z',
        rootDomain: 'dnshe.com',
        subdomainId: 101,
      });
      expect(result.domains[1]).toEqual({
        id: '102',
        name: 'test2.dnshe.com',
        provider: 'dnshe',
        status: 'suspended',
        expireTime: null,
        recordCount: 0,
        createdAt: '2024-02-01T08:00:00Z',
        rootDomain: 'dnshe.com',
        subdomainId: 102,
      });
    });

    it('maps expired subdomain status correctly', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 1,
          subdomains: [
            {
              id: 200,
              subdomain: 'expired',
              rootdomain: 'dnshe.com',
              full_domain: 'expired.dnshe.com',
              status: 'expired',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 10 });

      expect(result.domains[0].status).toBe('expired');
    });

    it('maps unknown subdomain status to "unknown"', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 1,
          subdomains: [
            {
              id: 300,
              subdomain: 'weird',
              rootdomain: 'dnshe.com',
              full_domain: 'weird.dnshe.com',
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 10 });

      expect(result.domains[0].status).toBe('unknown');
    });
  });

  describe('DNSHE response → UnifiedDnsRecord mapping', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('maps DNS record list response to UnifiedDnsRecord array', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 2,
          records: [
            {
              id: 501,
              record_id: 'rec-abc',
              name: 'www',
              type: 'A',
              content: '1.2.3.4',
              ttl: 600,
              priority: null,
              line: 'default',
              proxied: false,
              status: 'active',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-16T10:00:00Z',
            },
            {
              id: 502,
              name: 'mail',
              type: 'MX',
              content: 'mail.example.com',
              ttl: 3600,
              priority: 10,
              line: 'default',
              proxied: false,
              status: 'paused',
              created_at: '2024-02-01T08:00:00Z',
            },
          ],
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDnsRecords({ domainId: '101' });

      expect(result.records).toHaveLength(2);
      expect(result.records[0]).toEqual({
        id: '501',
        domainId: '101',
        name: 'www',
        type: 'A',
        value: '1.2.3.4',
        line: 'default',
        ttl: 600,
        priority: null,
        status: 'active',
        remark: '',
        updatedAt: '2024-01-16T10:00:00Z',
        provider: 'dnshe',
        recordId: 'rec-abc',
        proxied: false,
      });
      expect(result.records[1]).toEqual({
        id: '502',
        domainId: '101',
        name: 'mail',
        type: 'MX',
        value: 'mail.example.com',
        line: 'default',
        ttl: 3600,
        priority: 10,
        status: 'paused',
        remark: '',
        updatedAt: '2024-02-01T08:00:00Z',
        provider: 'dnshe',
        recordId: undefined,
        proxied: false,
      });
    });

    it('maps unknown record status to "unknown"', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 1,
          records: [
            {
              id: 600,
              name: '@',
              type: 'TXT',
              content: 'v=spf1 include:example.com ~all',
              ttl: 600,
              priority: null,
              line: null,
              proxied: false,
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDnsRecords({ domainId: '101' });

      expect(result.records[0].status).toBe('unknown');
      expect(result.records[0].line).toBe('default'); // null line maps to 'default'
    });
  });

  describe('DNSHE pagination mapping', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('maps pagination from API response', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 50,
          subdomains: [],
          pagination: {
            page: 2,
            per_page: 10,
            has_more: true,
            next_page: 3,
            prev_page: 1,
            total: 50,
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 2, size: 10 });

      expect(result.pagination).toEqual({
        page: 2,
        size: 10,
        total: 50,
        pages: 5,
      });
    });

    it('falls back to count-based pagination when no pagination object', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 3,
          subdomains: [],
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 10 });

      expect(result.pagination).toEqual({
        page: 1,
        size: 10,
        total: 3,
        pages: 1,
      });
    });

    it('handles DNS record list pagination', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          count: 5,
          records: [],
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDnsRecords({ domainId: '101', page: 1, size: 20 });

      expect(result.pagination).toEqual({
        page: 1,
        size: 20,
        total: 5,
        pages: 1,
      });
    });
  });

  describe('getDomainDetail', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('maps domain detail response with DNS count', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          subdomain: {
            id: 101,
            subdomain: 'test1',
            rootdomain: 'dnshe.com',
            full_domain: 'test1.dnshe.com',
            status: 'active',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            expires_at: '2025-01-15T10:00:00Z',
          },
          dns_records: [],
          dns_count: 3,
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const domain = await provider.getDomainDetail('101');

      expect(domain.recordCount).toBe(3);
      expect(domain.id).toBe('101');
      expect(domain.name).toBe('test1.dnshe.com');
    });

    it('throws error for invalid domain ID', async () => {
      await expect(provider.getDomainDetail('abc')).rejects.toThrow('Invalid DNSHE domain ID');
    });
  });

  describe('createDnsRecord', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('creates a DNS record and maps response', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          id: 501,
          record_id: 'rec-new',
          message: 'Record created',
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const record = await provider.createDnsRecord({
        domainId: '101',
        name: 'www',
        type: 'A',
        value: '1.2.3.4',
        ttl: 600,
      });

      expect(record).toEqual({
        id: '501',
        domainId: '101',
        name: 'www',
        type: 'A',
        value: '1.2.3.4',
        line: 'default',
        ttl: 600,
        priority: null,
        status: 'active',
        remark: '',
        updatedAt: expect.any(String),
        provider: 'dnshe',
        recordId: 'rec-new',
        proxied: false,
      });
    });
  });

  describe('updateDnsRecord', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('updates a DNS record and maps response', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          id: 501,
          record_id: 'rec-updated',
          message: 'Record updated',
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const record = await provider.updateDnsRecord({
        recordId: '501',
        domainId: '101',
        name: 'www',
        type: 'A',
        value: '5.6.7.8',
        ttl: 300,
      });

      expect(record.value).toBe('5.6.7.8');
      expect(record.ttl).toBe(300);
      expect(record.id).toBe('501');
    });
  });

  describe('deleteDnsRecord', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('deletes a DNS record successfully', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          success: true,
          message: 'Record deleted',
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      await expect(provider.deleteDnsRecord('101', '501')).resolves.toBeUndefined();
    });

    it('throws for invalid record ID', async () => {
      await expect(provider.deleteDnsRecord('101', 'abc')).rejects.toThrow('Invalid DNSHE record ID');
    });
  });

  describe('toggleDnsRecordStatus', () => {
    it('throws because DNSHE does not support toggling', async () => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
      await expect(provider.toggleDnsRecordStatus('1', true)).rejects.toThrow(
        'DNSHE provider does not support toggling'
      );
    });
  });

  describe('testConnection', () => {
    it('returns false when no credentials set', async () => {
      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('returns true on successful connection', async () => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: { success: true, quota: { used: 1, base: 5, invite_bonus: 0, total: 5, available: 4 } },
        error: null,
        errorCode: null,
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
    });

    it('returns false on failed connection', async () => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: { success: false, error: 'Unauthorized' },
        error: null,
        errorCode: null,
      });

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('returns false on exception', async () => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
      mockedRequest.mockRejectedValue(new Error('Network error'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      provider.setCredentials({ apiKey: 'key', apiSecret: 'secret' });
    });

    it('throws when API response success is false', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          success: false,
          error: 'Unauthorized access',
          error_code: 'AUTH_FAILED',
        },
        error: null,
        errorCode: null,
      });

      await expect(provider.listDomains({ page: 1, size: 10 })).rejects.toThrow('Unauthorized access');
    });

    it('throws when apiClient.request fails', async () => {
      mockedRequest.mockResolvedValue({
        success: false,
        data: null,
        error: 'Network error',
        errorCode: 'NETWORK_ERROR',
      });

      await expect(provider.listDomains({ page: 1, size: 10 })).rejects.toThrow('Network error');
    });
  });
});
