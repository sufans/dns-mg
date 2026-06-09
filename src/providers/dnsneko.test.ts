import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DnsnekoProvider } from './dnsneko';
import { apiClient } from '../lib/api';
import type { ApiResponse } from '../types';

// Mock the apiClient module
vi.mock('../lib/api', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockedRequest = vi.mocked(apiClient.request);

describe('DnsnekoProvider', () => {
  let provider: DnsnekoProvider;

  beforeEach(() => {
    provider = new DnsnekoProvider();
    vi.clearAllMocks();
  });

  describe('provider metadata', () => {
    it('has correct type, name, and description', () => {
      expect(provider.type).toBe('dnsneko');
      expect(provider.name).toBe('DNSNeko');
      expect(provider.description).toBe('DNSNeko 域名解析服务');
    });
  });

  describe('setCredentials', () => {
    it('sets username and API key credentials', async () => {
      provider.setCredentials({ username: 'testuser', apiKey: 'test-key' });
      // After setting credentials, operations should not throw about missing credentials
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: { domains: [], total: '0', size: '20', current: '1', pages: '1' },
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
        'DNSNeko API credentials not configured'
      );
    });

    it('throws error when credentials are not set for getDomainDetail', async () => {
      await expect(provider.getDomainDetail('1')).rejects.toThrow(
        'DNSNeko API credentials not configured'
      );
    });

    it('throws error when credentials are not set for listDnsRecords', async () => {
      await expect(provider.listDnsRecords({ domainId: '1' })).rejects.toThrow(
        'DNSNeko API credentials not configured'
      );
    });
  });

  describe('DNSNeko response → UnifiedDomain mapping', () => {
    beforeEach(() => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
    });

    it('maps domain list response to UnifiedDomain array', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domains: [
              {
                id: 'abc123',
                domain: 'example.dnsneko.com',
                status: 0,
                expired: false,
                expireTime: '2025-12-31T23:59:59Z',
                recordCount: '5',
              },
              {
                id: 'def456',
                domain: 'test.dnsneko.com',
                status: 1,
                expired: false,
                expireTime: '2025-06-30T23:59:59Z',
                recordCount: '3',
              },
            ],
            total: '2',
            size: '20',
            current: '1',
            pages: '1',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 20 });

      expect(result.domains).toHaveLength(2);
      expect(result.domains[0]).toEqual({
        id: 'abc123',
        name: 'example.dnsneko.com',
        provider: 'dnsneko',
        status: 'active',
        expireTime: '2025-12-31T23:59:59Z',
        recordCount: 5,
        createdAt: null,
        domainId: 'abc123',
      });
      expect(result.domains[1]).toEqual({
        id: 'def456',
        name: 'test.dnsneko.com',
        provider: 'dnsneko',
        status: 'active',
        expireTime: '2025-06-30T23:59:59Z',
        recordCount: 3,
        createdAt: null,
        domainId: 'def456',
      });
    });

    it('maps expired domain status correctly', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domains: [
              {
                id: 'exp1',
                domain: 'expired.dnsneko.com',
                status: 0,
                expired: true,
                expireTime: '2023-01-01T00:00:00Z',
                recordCount: '0',
              },
            ],
            total: '1',
            size: '20',
            current: '1',
            pages: '1',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 20 });

      expect(result.domains[0].status).toBe('expired');
    });

    it('maps unknown domain status to "unknown"', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domains: [
              {
                id: 'unk1',
                domain: 'unknown.dnsneko.com',
                status: 99,
                expired: false,
                expireTime: '2025-12-31T23:59:59Z',
                recordCount: '0',
              },
            ],
            total: '1',
            size: '20',
            current: '1',
            pages: '1',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 20 });

      expect(result.domains[0].status).toBe('unknown');
    });

    it('parses recordCount from string to number', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domains: [
              {
                id: 'rc1',
                domain: 'test.dnsneko.com',
                status: 0,
                expired: false,
                expireTime: '2025-12-31T23:59:59Z',
                recordCount: '42',
              },
            ],
            total: '1',
            size: '20',
            current: '1',
            pages: '1',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 1, size: 20 });

      expect(result.domains[0].recordCount).toBe(42);
    });
  });

  describe('DNSNeko response → UnifiedDnsRecord mapping', () => {
    beforeEach(() => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
    });

    it('maps DNS record list response to UnifiedDnsRecord array', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domainId: 'abc123',
            domain: 'example.dnsneko.com',
            records: [
              {
                id: 'rec001',
                domainId: 'abc123',
                name: 'www',
                type: 'A',
                value: '1.2.3.4',
                line: 'default',
                ttl: 600,
                priority: null,
                remark: '',
                status: 1,
                updateTime: '2024-01-16T10:00:00Z',
              },
              {
                id: 'rec002',
                domainId: 'abc123',
                name: 'mail',
                type: 'MX',
                value: 'mail.example.com',
                line: 'default',
                ttl: 3600,
                priority: 10,
                remark: 'mail server',
                status: 0,
                updateTime: null,
              },
            ],
            total: '2',
            size: '20',
            current: '1',
            pages: '1',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDnsRecords({ domainId: 'abc123' });

      expect(result.records).toHaveLength(2);
      expect(result.records[0]).toEqual({
        id: 'rec001',
        domainId: 'abc123',
        name: 'www',
        type: 'A',
        value: '1.2.3.4',
        line: 'default',
        ttl: 600,
        priority: null,
        status: 'active',
        remark: '',
        updatedAt: '2024-01-16T10:00:00Z',
        provider: 'dnsneko',
      });
      expect(result.records[1]).toEqual({
        id: 'rec002',
        domainId: 'abc123',
        name: 'mail',
        type: 'MX',
        value: 'mail.example.com',
        line: 'default',
        ttl: 3600,
        priority: 10,
        status: 'paused',
        remark: 'mail server',
        updatedAt: null,
        provider: 'dnsneko',
      });
    });

    it('maps unknown record status to "unknown"', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domainId: 'abc123',
            domain: 'example.dnsneko.com',
            records: [
              {
                id: 'rec003',
                domainId: 'abc123',
                name: '@',
                type: 'TXT',
                value: 'v=spf1 ~all',
                line: 'default',
                ttl: 600,
                priority: null,
                remark: '',
                status: 99,
                updateTime: null,
              },
            ],
            total: '1',
            size: '20',
            current: '1',
            pages: '1',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDnsRecords({ domainId: 'abc123' });

      expect(result.records[0].status).toBe('unknown');
    });
  });

  describe('DNSNeko pagination mapping', () => {
    beforeEach(() => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
    });

    it('maps pagination from string-based API response', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domains: [],
            total: '100',
            size: '20',
            current: '3',
            pages: '5',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDomains({ page: 3, size: 20 });

      expect(result.pagination).toEqual({
        page: 3,
        size: 20,
        total: 100,
        pages: 5,
      });
    });

    it('handles DNS record list pagination', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domainId: 'abc123',
            domain: 'example.dnsneko.com',
            records: [],
            total: '15',
            size: '10',
            current: '2',
            pages: '2',
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const result = await provider.listDnsRecords({ domainId: 'abc123', page: 2, size: 10 });

      expect(result.pagination).toEqual({
        page: 2,
        size: 10,
        total: 15,
        pages: 2,
      });
    });
  });

  describe('getDomainDetail', () => {
    beforeEach(() => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
    });

    it('maps domain detail response with all fields', async () => {
      const apiResponse: ApiResponse<any> = {
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domain: {
              id: 'abc123',
              domain: 'example.dnsneko.com',
              rootDomain: 'dnsneko.com',
              status: 0,
              userRemark: 'My test domain',
              notice: '',
              rootStatus: 1,
              rootNotice: '',
              allowOperation: 1,
              createTime: '2024-01-15T10:00:00Z',
              expireTime: '2025-12-31T23:59:59Z',
              expired: false,
              expiredNotice: null,
              registerDuration: 365,
              renewDays: 30,
              recordCount: '5',
            },
          },
        },
        error: null,
        errorCode: null,
      };
      mockedRequest.mockResolvedValue(apiResponse);

      const domain = await provider.getDomainDetail('abc123');

      expect(domain).toEqual({
        id: 'abc123',
        name: 'example.dnsneko.com',
        provider: 'dnsneko',
        status: 'active',
        expireTime: '2025-12-31T23:59:59Z',
        recordCount: 5,
        createdAt: '2024-01-15T10:00:00Z',
        rootDomain: 'dnsneko.com',
        domainId: 'abc123',
        userRemark: 'My test domain',
        notice: '',
        allowOperation: true,
        registerDuration: 365,
        renewDays: 30,
      });
    });
  });

  describe('auth headers', () => {
    it('sends auth headers with credentials', async () => {
      provider.setCredentials({ username: 'myuser', apiKey: 'mykey' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: {
            domains: [],
            total: '0',
            size: '20',
            current: '1',
            pages: '1',
          },
        },
        error: null,
        errorCode: null,
      });

      await provider.listDomains({ page: 1, size: 20 });

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toHaveProperty('X-DNSNEKO-USERNAME', 'myuser');
      expect(calledOptions.headers).toHaveProperty('X-DNSNEKO-API-KEY', 'mykey');
    });
  });

  describe('batch operations', () => {
    beforeEach(() => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
    });

    it('batchUpdateStatus sends correct params', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: { code: 200, errorCode: null, message: 'success', data: {} },
        error: null,
        errorCode: null,
      });

      await provider.batchUpdateStatus!({
        domainId: 'abc123',
        ids: ['1', '2', '3'],
        status: 1,
      });

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledOptions.body as string);
      expect(body.domainId).toBe('abc123');
      expect(body.ids).toEqual([1, 2, 3]);
      expect(body.status).toBe(1);
    });

    it('batchDelete sends correct params', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: { code: 200, errorCode: null, message: 'success', data: {} },
        error: null,
        errorCode: null,
      });

      await provider.batchDelete!({
        domainId: 'abc123',
        ids: ['10', '20'],
      });

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledOptions.body as string);
      expect(body.domainId).toBe('abc123');
      expect(body.ids).toEqual([10, 20]);
    });

    it('batchUpdateTtl sends correct params', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: { code: 200, errorCode: null, message: 'success', data: {} },
        error: null,
        errorCode: null,
      });

      await provider.batchUpdateTtl!({
        domainId: 'abc123',
        ids: ['1', '2'],
        ttl: 300,
      });

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledOptions.body as string);
      expect(body.domainId).toBe('abc123');
      expect(body.ids).toEqual([1, 2]);
      expect(body.ttl).toBe(300);
    });

    it('batchUpdateLine sends correct params', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: { code: 200, errorCode: null, message: 'success', data: {} },
        error: null,
        errorCode: null,
      });

      await provider.batchUpdateLine!({
        domainId: 'abc123',
        ids: ['1', '2'],
        line: 'telecom',
      });

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledOptions.body as string);
      expect(body.domainId).toBe('abc123');
      expect(body.ids).toEqual([1, 2]);
      expect(body.line).toBe('telecom');
    });
  });

  describe('toggleDnsRecordStatus', () => {
    beforeEach(() => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
    });

    it('sends correct status payload when enabling', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: { code: 200, errorCode: null, message: 'success', data: {} },
        error: null,
        errorCode: null,
      });

      await provider.toggleDnsRecordStatus('rec001', true);

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledOptions.body as string);
      expect(body.status).toBe(1);
    });

    it('sends correct status payload when disabling', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: { code: 200, errorCode: null, message: 'success', data: {} },
        error: null,
        errorCode: null,
      });

      await provider.toggleDnsRecordStatus('rec001', false);

      const calledOptions = mockedRequest.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(calledOptions.body as string);
      expect(body.status).toBe(0);
    });
  });

  describe('testConnection', () => {
    it('returns false when no credentials set', async () => {
      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('returns true on successful connection', async () => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          code: 200,
          errorCode: null,
          message: 'success',
          data: { domains: [], total: '0', size: '1', current: '1', pages: '0' },
        },
        error: null,
        errorCode: null,
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
    });

    it('returns false on failed connection', async () => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          code: 401,
          errorCode: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          data: null,
        },
        error: null,
        errorCode: null,
      });

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('returns false on exception', async () => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
      mockedRequest.mockRejectedValue(new Error('Network error'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      provider.setCredentials({ username: 'user', apiKey: 'key' });
    });

    it('throws when DNSNeko API returns non-200 code', async () => {
      mockedRequest.mockResolvedValue({
        success: true,
        data: {
          code: 401,
          errorCode: 'UNAUTHORIZED',
          message: 'Invalid API key',
          data: null,
        },
        error: null,
        errorCode: null,
      });

      await expect(provider.listDomains({ page: 1, size: 10 })).rejects.toThrow('Invalid API key');
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
