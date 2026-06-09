import { describe, it, expect, beforeEach } from 'vitest';
import { useCredentialsStore, maskSecret } from './credentials';
import type { DnsheCredential, DnsnekoCredential } from '../types';

describe('maskSecret', () => {
  it('returns empty string for empty input', () => {
    expect(maskSecret('')).toBe('');
  });

  it('returns **** for short strings (<=8 chars)', () => {
    expect(maskSecret('abc')).toBe('****');
    expect(maskSecret('12345678')).toBe('****');
  });

  it('masks normal strings showing first4****last4', () => {
    expect(maskSecret('abcdefghijklmnop')).toBe('abcd****mnop');
    expect(maskSecret('1234567890')).toBe('1234****7890');
  });
});

describe('useCredentialsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCredentialsStore.setState({ accounts: [] });
  });

  describe('addAccount', () => {
    it('adds a DNSHE account', () => {
      const store = useCredentialsStore.getState();
      const cred: DnsheCredential = { apiKey: 'test-key', apiSecret: 'test-secret' };
      const account = store.addAccount({ provider: 'dnshe', label: 'My DNSHE', credentials: cred });

      expect(account.provider).toBe('dnshe');
      expect(account.label).toBe('My DNSHE');
      expect(account.credentials).toEqual(cred);
      expect(account.status).toBe('unverified');
      expect(account.lastVerified).toBeNull();
      expect(account.tags).toEqual([]);
      expect(account.id).toBeTruthy();

      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe(account.id);
    });

    it('adds a DNSNeko account', () => {
      const store = useCredentialsStore.getState();
      const cred: DnsnekoCredential = { username: 'user1', apiKey: 'neko-key' };
      const account = store.addAccount({ provider: 'dnsneko', label: 'My Neko', credentials: cred });

      expect(account.provider).toBe('dnsneko');
      expect(account.label).toBe('My Neko');
      expect(account.credentials).toEqual(cred);

      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts).toHaveLength(1);
    });

    it('first account per provider is auto-set as default', () => {
      const store = useCredentialsStore.getState();
      const account = store.addAccount({
        provider: 'dnshe',
        label: 'First',
        credentials: { apiKey: 'k', apiSecret: 's' },
      });

      expect(account.isDefault).toBe(true);
      expect(useCredentialsStore.getState().accounts[0].isDefault).toBe(true);
    });

    it('adding second account for same provider does not auto-set as default', () => {
      const store = useCredentialsStore.getState();
      store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      const second = store.addAccount({ provider: 'dnshe', label: 'Second', credentials: { apiKey: 'k2', apiSecret: 's2' } });

      expect(second.isDefault).toBe(false);
      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts.find(a => a.label === 'First')?.isDefault).toBe(true);
      expect(accounts.find(a => a.label === 'Second')?.isDefault).toBe(false);
    });

    it('adding account with isDefault=true clears other defaults for same provider', () => {
      const store = useCredentialsStore.getState();
      store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      const second = store.addAccount({
        provider: 'dnshe',
        label: 'Second',
        credentials: { apiKey: 'k2', apiSecret: 's2' },
        isDefault: true,
      });

      expect(second.isDefault).toBe(true);
      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts.find(a => a.label === 'First')?.isDefault).toBe(false);
      expect(accounts.find(a => a.label === 'Second')?.isDefault).toBe(true);
    });

    it('adding account with isDefault=true does not affect other providers', () => {
      const store = useCredentialsStore.getState();
      const dnsheAcc = store.addAccount({ provider: 'dnshe', label: 'DNSHE', credentials: { apiKey: 'k', apiSecret: 's' } });
      const nekoAcc = store.addAccount({
        provider: 'dnsneko',
        label: 'Neko',
        credentials: { username: 'u', apiKey: 'k' },
        isDefault: true,
      });

      expect(dnsheAcc.isDefault).toBe(true);
      expect(nekoAcc.isDefault).toBe(true);
    });
  });

  describe('getAccount', () => {
    it('returns account by id', () => {
      const store = useCredentialsStore.getState();
      const added = store.addAccount({ provider: 'dnshe', label: 'Test', credentials: { apiKey: 'k', apiSecret: 's' } });

      const found = useCredentialsStore.getState().getAccount(added.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(added.id);
    });

    it('returns undefined for non-existent id', () => {
      const found = useCredentialsStore.getState().getAccount('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAccountsByProvider', () => {
    it('returns only accounts for specified provider', () => {
      const store = useCredentialsStore.getState();
      store.addAccount({ provider: 'dnshe', label: 'H1', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      store.addAccount({ provider: 'dnsneko', label: 'N1', credentials: { username: 'u1', apiKey: 'k1' } });
      store.addAccount({ provider: 'dnshe', label: 'H2', credentials: { apiKey: 'k2', apiSecret: 's2' } });

      const dnsheAccounts = useCredentialsStore.getState().getAccountsByProvider('dnshe');
      const nekoAccounts = useCredentialsStore.getState().getAccountsByProvider('dnsneko');

      expect(dnsheAccounts).toHaveLength(2);
      expect(nekoAccounts).toHaveLength(1);
      expect(dnsheAccounts.every(a => a.provider === 'dnshe')).toBe(true);
    });
  });

  describe('getAllAccounts', () => {
    it('returns all accounts', () => {
      const store = useCredentialsStore.getState();
      store.addAccount({ provider: 'dnshe', label: 'H1', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      store.addAccount({ provider: 'dnsneko', label: 'N1', credentials: { username: 'u1', apiKey: 'k1' } });

      const all = useCredentialsStore.getState().getAllAccounts();
      expect(all).toHaveLength(2);
    });
  });

  describe('setDefaultAccount', () => {
    it('sets specified account as default and clears other defaults for same provider', () => {
      const store = useCredentialsStore.getState();
      const first = store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      const second = store.addAccount({ provider: 'dnshe', label: 'Second', credentials: { apiKey: 'k2', apiSecret: 's2' } });

      useCredentialsStore.getState().setDefaultAccount(second.id);

      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts.find(a => a.id === first.id)?.isDefault).toBe(false);
      expect(accounts.find(a => a.id === second.id)?.isDefault).toBe(true);
    });

    it('does not affect defaults of other providers', () => {
      const store = useCredentialsStore.getState();
      const dnsheAcc = store.addAccount({ provider: 'dnshe', label: 'DNSHE', credentials: { apiKey: 'k', apiSecret: 's' } });
      const nekoAcc = store.addAccount({ provider: 'dnsneko', label: 'Neko', credentials: { username: 'u', apiKey: 'k' } });

      useCredentialsStore.getState().setDefaultAccount(dnsheAcc.id);

      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts.find(a => a.id === nekoAcc.id)?.isDefault).toBe(true);
    });
  });

  describe('getDefaultAccount', () => {
    it('returns default account for provider', () => {
      const store = useCredentialsStore.getState();
      const first = store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      store.addAccount({ provider: 'dnshe', label: 'Second', credentials: { apiKey: 'k2', apiSecret: 's2' } });

      const defaultAcc = useCredentialsStore.getState().getDefaultAccount('dnshe');
      expect(defaultAcc).toBeDefined();
      expect(defaultAcc!.id).toBe(first.id);
    });

    it('returns first account if no default is set', () => {
      const store = useCredentialsStore.getState();
      const first = store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });

      // Manually clear the default flag
      useCredentialsStore.setState({
        accounts: useCredentialsStore.getState().accounts.map(a => ({ ...a, isDefault: false })),
      });

      const defaultAcc = useCredentialsStore.getState().getDefaultAccount('dnshe');
      expect(defaultAcc).toBeDefined();
      expect(defaultAcc!.id).toBe(first.id);
    });

    it('returns undefined if no accounts exist for provider', () => {
      const defaultAcc = useCredentialsStore.getState().getDefaultAccount('dnshe');
      expect(defaultAcc).toBeUndefined();
    });
  });

  describe('updateAccount', () => {
    it('updates label', () => {
      const store = useCredentialsStore.getState();
      const account = store.addAccount({ provider: 'dnshe', label: 'Old', credentials: { apiKey: 'k', apiSecret: 's' } });

      useCredentialsStore.getState().updateAccount(account.id, { label: 'New' });

      const updated = useCredentialsStore.getState().getAccount(account.id);
      expect(updated!.label).toBe('New');
    });

    it('updates tags', () => {
      const store = useCredentialsStore.getState();
      const account = store.addAccount({ provider: 'dnshe', label: 'Test', credentials: { apiKey: 'k', apiSecret: 's' } });

      useCredentialsStore.getState().updateAccount(account.id, { tags: ['prod', 'primary'] });

      const updated = useCredentialsStore.getState().getAccount(account.id);
      expect(updated!.tags).toEqual(['prod', 'primary']);
    });

    it('updates credentials', () => {
      const store = useCredentialsStore.getState();
      const account = store.addAccount({ provider: 'dnshe', label: 'Test', credentials: { apiKey: 'old', apiSecret: 'old' } });

      useCredentialsStore.getState().updateAccount(account.id, { credentials: { apiKey: 'new', apiSecret: 'new' } });

      const updated = useCredentialsStore.getState().getAccount(account.id);
      expect(updated!.credentials).toEqual({ apiKey: 'new', apiSecret: 'new' });
    });

    it('setting isDefault via updateAccount clears other defaults', () => {
      const store = useCredentialsStore.getState();
      const first = store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      const second = store.addAccount({ provider: 'dnshe', label: 'Second', credentials: { apiKey: 'k2', apiSecret: 's2' } });

      useCredentialsStore.getState().updateAccount(second.id, { isDefault: true });

      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts.find(a => a.id === first.id)?.isDefault).toBe(false);
      expect(accounts.find(a => a.id === second.id)?.isDefault).toBe(true);
    });
  });

  describe('removeAccount', () => {
    it('removes account', () => {
      const store = useCredentialsStore.getState();
      const account = store.addAccount({ provider: 'dnshe', label: 'To Remove', credentials: { apiKey: 'k', apiSecret: 's' } });

      useCredentialsStore.getState().removeAccount(account.id);

      expect(useCredentialsStore.getState().accounts).toHaveLength(0);
      expect(useCredentialsStore.getState().getAccount(account.id)).toBeUndefined();
    });

    it('if removed was default, another becomes default', () => {
      const store = useCredentialsStore.getState();
      const first = store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      const second = store.addAccount({ provider: 'dnshe', label: 'Second', credentials: { apiKey: 'k2', apiSecret: 's2' } });

      // Remove the default (first)
      useCredentialsStore.getState().removeAccount(first.id);

      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe(second.id);
      expect(accounts[0].isDefault).toBe(true);
    });

    it('removing non-default does not change defaults', () => {
      const store = useCredentialsStore.getState();
      const first = store.addAccount({ provider: 'dnshe', label: 'First', credentials: { apiKey: 'k1', apiSecret: 's1' } });
      const second = store.addAccount({ provider: 'dnshe', label: 'Second', credentials: { apiKey: 'k2', apiSecret: 's2' } });

      // Remove the non-default (second)
      useCredentialsStore.getState().removeAccount(second.id);

      const accounts = useCredentialsStore.getState().accounts;
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe(first.id);
      expect(accounts[0].isDefault).toBe(true);
    });
  });

  describe('updateAccountStatus', () => {
    it('updates status and lastVerified timestamp', () => {
      const store = useCredentialsStore.getState();
      const account = store.addAccount({ provider: 'dnshe', label: 'Test', credentials: { apiKey: 'k', apiSecret: 's' } });

      expect(account.status).toBe('unverified');
      expect(account.lastVerified).toBeNull();

      useCredentialsStore.getState().updateAccountStatus(account.id, 'valid');

      const updated = useCredentialsStore.getState().getAccount(account.id);
      expect(updated!.status).toBe('valid');
      expect(updated!.lastVerified).not.toBeNull();
    });
  });

  describe('updateAccountUsage', () => {
    it('updates usage stats', () => {
      const store = useCredentialsStore.getState();
      const account = store.addAccount({ provider: 'dnshe', label: 'Test', credentials: { apiKey: 'k', apiSecret: 's' } });

      expect(account.usageStats.totalRequests).toBe(0);
      expect(account.usageStats.lastRequestAt).toBeNull();

      const now = new Date().toISOString();
      useCredentialsStore.getState().updateAccountUsage(account.id, {
        totalRequests: 5,
        lastRequestAt: now,
      });

      const updated = useCredentialsStore.getState().getAccount(account.id);
      expect(updated!.usageStats.totalRequests).toBe(5);
      expect(updated!.usageStats.lastRequestAt).toBe(now);
      // Other fields should remain at defaults
      expect(updated!.usageStats.dailyRequests).toEqual([]);
      expect(updated!.usageStats.recentCalls).toEqual([]);
    });
  });
});
