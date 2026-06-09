import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderType, PlatformCredential, AccountEntry, AccountStatus, UsageStats } from '../types';
import { encrypt, decrypt, isEncryptedData } from '../lib/crypto';
import type { EncryptedData } from '../lib/crypto';

// Application-level encryption key for credential storage.
// In production, this should be derived from the user's session password via PBKDF2.
const APP_KEY = 'dns-mgr-app-encryption-key-v1';

// Check if Web Crypto API is available (not available in jsdom/Node.js < 19)
const hasSubtleCrypto = typeof globalThis.crypto?.subtle !== 'undefined';

// Generate unique ID
function generateId(): string {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Mask secret for display
export function maskSecret(secret: string): string {
  if (!secret || secret.length === 0) return '';
  if (secret.length <= 8) return '****';
  return `${secret.slice(0, 4)}****${secret.slice(-4)}`;
}

// Base64 decode for migration from old format
function decodeSecret(encoded: string): string {
  return decodeURIComponent(escape(atob(encoded)));
}

function decodeCredentials(credentials: PlatformCredential, provider: ProviderType): PlatformCredential {
  if (provider === 'dnshe') {
    const c = credentials as { apiKey: string; apiSecret: string };
    return { apiKey: decodeSecret(c.apiKey), apiSecret: decodeSecret(c.apiSecret) };
  }
  const c = credentials as { username: string; apiKey: string };
  return { username: decodeSecret(c.username), apiKey: decodeSecret(c.apiKey) };
}

// Base64 encode for fallback when crypto.subtle is unavailable
function encodeSecret(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function encodeCredentials(credentials: PlatformCredential, provider: ProviderType): PlatformCredential {
  if (provider === 'dnshe') {
    const c = credentials as { apiKey: string; apiSecret: string };
    return { apiKey: encodeSecret(c.apiKey), apiSecret: encodeSecret(c.apiSecret) };
  }
  const c = credentials as { username: string; apiKey: string };
  return { username: encodeSecret(c.username), apiKey: encodeSecret(c.apiKey) };
}

function encodeEntry(entry: AccountEntry): AccountEntry {
  return { ...entry, credentials: encodeCredentials(entry.credentials, entry.provider) };
}

function decodeEntry(entry: AccountEntry): AccountEntry {
  return { ...entry, credentials: decodeCredentials(entry.credentials, entry.provider) };
}

// Check if a credential value looks like Base64
function isBase64Value(value: string): boolean {
  try {
    return btoa(atob(value)) === value;
  } catch {
    return false;
  }
}

// Check if credentials are in the old Base64 format
function isBase64Credentials(credentials: unknown, provider: ProviderType): boolean {
  if (typeof credentials !== 'object' || credentials === null) return false;
  if (isEncryptedData(credentials)) return false;

  if (provider === 'dnshe') {
    const c = credentials as Record<string, unknown>;
    return typeof c.apiKey === 'string' && typeof c.apiSecret === 'string' && isBase64Value(c.apiKey as string);
  }
  const c = credentials as Record<string, unknown>;
  return typeof c.username === 'string' && typeof c.apiKey === 'string' && isBase64Value(c.username as string);
}

const EMPTY_USAGE_STATS: UsageStats = {
  totalRequests: 0,
  lastRequestAt: null,
  dailyRequests: [],
  recentCalls: [],
};

interface CredentialsState {
  accounts: AccountEntry[];

  addAccount: (params: { provider: ProviderType; label: string; tags?: string[]; isDefault?: boolean; credentials: PlatformCredential }) => AccountEntry;
  updateAccount: (id: string, updates: Partial<Pick<AccountEntry, 'label' | 'tags' | 'credentials' | 'isDefault'>>) => void;
  removeAccount: (id: string) => void;
  getAccount: (id: string) => AccountEntry | undefined;
  getAccountsByProvider: (provider: ProviderType) => AccountEntry[];
  getAllAccounts: () => AccountEntry[];
  setDefaultAccount: (id: string) => void;
  getDefaultAccount: (provider: ProviderType) => AccountEntry | undefined;
  updateAccountStatus: (id: string, status: AccountStatus) => void;
  updateAccountUsage: (id: string, usage: Partial<UsageStats>) => void;
}

export const useCredentialsStore = create<CredentialsState>()(
  persist(
    (set, get) => ({
      accounts: [],

      addAccount: (params) => {
        const newAccount: AccountEntry = {
          id: generateId(),
          provider: params.provider,
          label: params.label,
          tags: params.tags ?? [],
          isDefault: params.isDefault ?? false,
          credentials: params.credentials,
          status: 'unverified',
          lastVerified: null,
          createdAt: new Date().toISOString(),
          usageStats: { ...EMPTY_USAGE_STATS },
        };

        set((state) => {
          // If this is the first account for this provider or isDefault, clear other defaults
          let accounts = [...state.accounts];
          if (newAccount.isDefault || !accounts.some(a => a.provider === params.provider)) {
            newAccount.isDefault = true;
            accounts = accounts.map(a => a.provider === params.provider ? { ...a, isDefault: false } : a);
          }
          return { accounts: [...accounts, newAccount] };
        });

        return newAccount;
      },

      updateAccount: (id, updates) => {
        set((state) => ({
          accounts: state.accounts.map(a => {
            if (a.id !== id) return a;
            // If setting isDefault, clear other defaults for same provider
            if (updates.isDefault) {
              return { ...a, ...updates };
            }
            return { ...a, ...updates };
          }),
        }));
        // Handle default clearing separately
        if (updates.isDefault) {
          const account = get().getAccount(id);
          if (account) {
            set((state) => ({
              accounts: state.accounts.map(a =>
                a.provider === account.provider && a.id !== id
                  ? { ...a, isDefault: false }
                  : a
              ),
            }));
          }
        }
      },

      removeAccount: (id) => {
        set((state) => {
          const removed = state.accounts.find(a => a.id === id);
          const accounts = state.accounts.filter(a => a.id !== id);
          // If removed account was default, set another as default
          if (removed?.isDefault) {
            const sameProvider = accounts.find(a => a.provider === removed.provider);
            if (sameProvider) {
              return { accounts: accounts.map(a => a.id === sameProvider.id ? { ...a, isDefault: true } : a) };
            }
          }
          return { accounts };
        });
      },

      getAccount: (id) => {
        return get().accounts.find(a => a.id === id);
      },

      getAccountsByProvider: (provider) => {
        return get().accounts.filter(a => a.provider === provider);
      },

      getAllAccounts: () => {
        return get().accounts;
      },

      setDefaultAccount: (id) => {
        const account = get().getAccount(id);
        if (!account) return;
        set((state) => ({
          accounts: state.accounts.map(a =>
            a.provider === account.provider
              ? { ...a, isDefault: a.id === id }
              : a
          ),
        }));
      },

      getDefaultAccount: (provider) => {
        return get().accounts.find(a => a.provider === provider && a.isDefault)
          ?? get().accounts.find(a => a.provider === provider);
      },

      updateAccountStatus: (id, status) => {
        set((state) => ({
          accounts: state.accounts.map(a =>
            a.id === id ? { ...a, status, lastVerified: new Date().toISOString() } : a
          ),
        }));
      },

      updateAccountUsage: (id, usage) => {
        set((state) => ({
          accounts: state.accounts.map(a =>
            a.id === id ? { ...a, usageStats: { ...a.usageStats, ...usage } } : a
          ),
        }));
      },
    }),
    {
      name: 'dns-mgr-accounts',
      storage: {
        getItem: async (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);

          if (!hasSubtleCrypto) {
            // Fallback: try Base64 decoding for environments without crypto.subtle
            try {
              return {
                ...parsed,
                state: {
                  ...parsed.state,
                  accounts: (parsed.state.accounts as AccountEntry[]).map(decodeEntry),
                },
              };
            } catch {
              return parsed;
            }
          }

          // AES-GCM decryption with Base64 migration
          const accounts = await Promise.all(
            (parsed.state.accounts as AccountEntry[]).map(async (entry) => {
              // New AES-GCM encrypted format
              if (isEncryptedData(entry.credentials)) {
                try {
                  const decrypted = await decrypt(entry.credentials as unknown as EncryptedData, APP_KEY);
                  return { ...entry, credentials: JSON.parse(decrypted) as PlatformCredential };
                } catch {
                  // Decryption failed — return entry as-is
                  return entry;
                }
              }

              // Old Base64 format — migrate
              if (isBase64Credentials(entry.credentials, entry.provider)) {
                try {
                  return { ...entry, credentials: decodeCredentials(entry.credentials, entry.provider) };
                } catch {
                  return entry;
                }
              }

              // Plain text (shouldn't normally happen)
              return entry;
            })
          );

          return { ...parsed, state: { ...parsed.state, accounts } };
        },
        setItem: async (name, value) => {
          if (!hasSubtleCrypto) {
            // Fallback: Base64 encoding for environments without crypto.subtle
            const encoded = {
              ...value,
              state: {
                ...value.state,
                accounts: (value.state.accounts as AccountEntry[]).map(encodeEntry),
              },
            };
            localStorage.setItem(name, JSON.stringify(encoded));
            return;
          }

          // AES-GCM encryption
          const accounts = await Promise.all(
            (value.state.accounts as AccountEntry[]).map(async (entry) => {
              const encrypted = await encrypt(JSON.stringify(entry.credentials), APP_KEY);
              return { ...entry, credentials: encrypted as unknown as PlatformCredential };
            })
          );

          localStorage.setItem(name, JSON.stringify({
            ...value,
            state: { ...value.state, accounts },
          }));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
