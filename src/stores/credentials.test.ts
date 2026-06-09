import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCredentialsStore, maskSecret } from './credentials';
import type { DnsheCredential, DnsnekoCredential } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useCredentialsStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset the zustand store to initial state
    useCredentialsStore.setState({ entries: [] });
  });

  describe('addCredential', () => {
    it('adds a DNSHE credential entry', () => {
      const dnsheCreds: DnsheCredential = { apiKey: 'test-key', apiSecret: 'test-secret' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'My DNSHE',
        status: 'valid',
        lastVerified: null,
        credentials: dnsheCreds,
      });

      const entries = useCredentialsStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].provider).toBe('dnshe');
      expect(entries[0].label).toBe('My DNSHE');
      expect(entries[0].status).toBe('valid');
      expect(entries[0].createdAt).toBeDefined();
      expect(entries[0].credentials).toEqual(dnsheCreds);
    });

    it('adds a DNSNeko credential entry', () => {
      const nekoCreds: DnsnekoCredential = { username: 'user', apiKey: 'neko-key' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnsneko',
        label: 'My DNSNeko',
        status: 'unconfigured',
        lastVerified: null,
        credentials: nekoCreds,
      });

      const entries = useCredentialsStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].provider).toBe('dnsneko');
      expect(entries[0].credentials).toEqual(nekoCreds);
    });

    it('replaces existing entry for same provider', () => {
      const creds1: DnsheCredential = { apiKey: 'key1', apiSecret: 'secret1' };
      const creds2: DnsheCredential = { apiKey: 'key2', apiSecret: 'secret2' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'First',
        status: 'valid',
        lastVerified: null,
        credentials: creds1,
      });

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'Second',
        status: 'invalid',
        lastVerified: '2024-01-01T00:00:00Z',
        credentials: creds2,
      });

      const entries = useCredentialsStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].label).toBe('Second');
      expect(entries[0].credentials).toEqual(creds2);
    });

    it('allows multiple providers simultaneously', () => {
      const dnsheCreds: DnsheCredential = { apiKey: 'key1', apiSecret: 'secret1' };
      const nekoCreds: DnsnekoCredential = { username: 'user', apiKey: 'neko-key' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'DNSHE',
        status: 'valid',
        lastVerified: null,
        credentials: dnsheCreds,
      });

      useCredentialsStore.getState().addCredential({
        provider: 'dnsneko',
        label: 'DNSNeko',
        status: 'valid',
        lastVerified: null,
        credentials: nekoCreds,
      });

      const entries = useCredentialsStore.getState().entries;
      expect(entries).toHaveLength(2);
    });
  });

  describe('getCredential', () => {
    it('returns credential entry for a provider', () => {
      const dnsheCreds: DnsheCredential = { apiKey: 'test-key', apiSecret: 'test-secret' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'My DNSHE',
        status: 'valid',
        lastVerified: null,
        credentials: dnsheCreds,
      });

      const entry = useCredentialsStore.getState().getCredential('dnshe');
      expect(entry).toBeDefined();
      expect(entry?.provider).toBe('dnshe');
      expect(entry?.credentials).toEqual(dnsheCreds);
    });

    it('returns undefined for non-existent provider', () => {
      const entry = useCredentialsStore.getState().getCredential('dnshe');
      expect(entry).toBeUndefined();
    });
  });

  describe('updateCredential', () => {
    it('updates credentials for existing provider', () => {
      const oldCreds: DnsheCredential = { apiKey: 'old-key', apiSecret: 'old-secret' };
      const newCreds: DnsheCredential = { apiKey: 'new-key', apiSecret: 'new-secret' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'My DNSHE',
        status: 'valid',
        lastVerified: null,
        credentials: oldCreds,
      });

      useCredentialsStore.getState().updateCredential('dnshe', newCreds);

      const entry = useCredentialsStore.getState().getCredential('dnshe');
      expect(entry?.credentials).toEqual(newCreds);
    });

    it('does nothing for non-existent provider', () => {
      const newCreds: DnsheCredential = { apiKey: 'new-key', apiSecret: 'new-secret' };
      useCredentialsStore.getState().updateCredential('dnshe', newCreds);

      const entry = useCredentialsStore.getState().getCredential('dnshe');
      expect(entry).toBeUndefined();
    });
  });

  describe('removeCredential', () => {
    it('removes credential entry for a provider', () => {
      const dnsheCreds: DnsheCredential = { apiKey: 'test-key', apiSecret: 'test-secret' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'My DNSHE',
        status: 'valid',
        lastVerified: null,
        credentials: dnsheCreds,
      });

      expect(useCredentialsStore.getState().entries).toHaveLength(1);

      useCredentialsStore.getState().removeCredential('dnshe');

      expect(useCredentialsStore.getState().entries).toHaveLength(0);
      expect(useCredentialsStore.getState().getCredential('dnshe')).toBeUndefined();
    });

    it('does nothing for non-existent provider', () => {
      useCredentialsStore.getState().removeCredential('dnshe');
      expect(useCredentialsStore.getState().entries).toHaveLength(0);
    });

    it('only removes the specified provider', () => {
      const dnsheCreds: DnsheCredential = { apiKey: 'key1', apiSecret: 'secret1' };
      const nekoCreds: DnsnekoCredential = { username: 'user', apiKey: 'neko-key' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'DNSHE',
        status: 'valid',
        lastVerified: null,
        credentials: dnsheCreds,
      });

      useCredentialsStore.getState().addCredential({
        provider: 'dnsneko',
        label: 'DNSNeko',
        status: 'valid',
        lastVerified: null,
        credentials: nekoCreds,
      });

      useCredentialsStore.getState().removeCredential('dnshe');

      const entries = useCredentialsStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].provider).toBe('dnsneko');
    });
  });

  describe('updateStatus', () => {
    it('updates status and sets lastVerified', () => {
      const dnsheCreds: DnsheCredential = { apiKey: 'test-key', apiSecret: 'test-secret' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'My DNSHE',
        status: 'unconfigured',
        lastVerified: null,
        credentials: dnsheCreds,
      });

      useCredentialsStore.getState().updateStatus('dnshe', 'valid');

      const entry = useCredentialsStore.getState().getCredential('dnshe');
      expect(entry?.status).toBe('valid');
      expect(entry?.lastVerified).not.toBeNull();
    });

    it('updates status to invalid', () => {
      const dnsheCreds: DnsheCredential = { apiKey: 'test-key', apiSecret: 'test-secret' };

      useCredentialsStore.getState().addCredential({
        provider: 'dnshe',
        label: 'My DNSHE',
        status: 'valid',
        lastVerified: null,
        credentials: dnsheCreds,
      });

      useCredentialsStore.getState().updateStatus('dnshe', 'invalid');

      const entry = useCredentialsStore.getState().getCredential('dnshe');
      expect(entry?.status).toBe('invalid');
    });

    it('does nothing for non-existent provider', () => {
      useCredentialsStore.getState().updateStatus('dnshe', 'valid');
      // Should not throw
      expect(useCredentialsStore.getState().entries).toHaveLength(0);
    });
  });

  describe('maskSecret', () => {
    it('masks long secrets showing first 4 and last 4', () => {
      expect(maskSecret('abcdefghijklmnop')).toBe('abcd****mnop');
    });

    it('masks secrets of exactly 8 characters', () => {
      expect(maskSecret('12345678')).toBe('****');
    });

    it('returns **** for short secrets (less than 8 chars)', () => {
      expect(maskSecret('short')).toBe('****');
    });

    it('returns empty string for empty string', () => {
      expect(maskSecret('')).toBe('');
    });

    it('handles secrets just over 8 characters', () => {
      expect(maskSecret('123456789')).toBe('1234****6789');
    });
  });
});
