import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderType, DnsheCredential, DnsnekoCredential } from '../types';

interface CredentialEntry {
  provider: ProviderType;
  label: string;
  status: 'valid' | 'invalid' | 'unconfigured';
  lastVerified: string | null;
  createdAt: string;
  credentials: DnsheCredential | DnsnekoCredential;
}

interface CredentialsState {
  entries: CredentialEntry[];
  addCredential: (entry: Omit<CredentialEntry, 'createdAt'>) => void;
  updateCredential: (provider: ProviderType, credentials: DnsheCredential | DnsnekoCredential) => void;
  removeCredential: (provider: ProviderType) => void;
  getCredential: (provider: ProviderType) => CredentialEntry | undefined;
  updateStatus: (provider: ProviderType, status: 'valid' | 'invalid') => void;
}

export function maskSecret(secret: string): string {
  if (!secret || secret.length === 0) return '';
  if (secret.length <= 8) return '****';
  const first4 = secret.slice(0, 4);
  const last4 = secret.slice(-4);
  return `${first4}****${last4}`;
}

// NOTE: Base64 encoding is NOT encryption. This is used only for obfuscation
// in this frontend-only demo. In production, credentials should be stored
// server-side with proper encryption.
function encodeSecret(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function decodeSecret(encoded: string): string {
  return decodeURIComponent(escape(atob(encoded)));
}

function encodeEntry(entry: CredentialEntry): CredentialEntry {
  const credentials = { ...entry.credentials };
  if (entry.provider === 'dnshe') {
    const dnshe = credentials as DnsheCredential;
    return { ...entry, credentials: { ...dnshe, apiKey: encodeSecret(dnshe.apiKey), apiSecret: encodeSecret(dnshe.apiSecret) } };
  } else {
    const neko = credentials as DnsnekoCredential;
    return { ...entry, credentials: { ...neko, username: encodeSecret(neko.username), apiKey: encodeSecret(neko.apiKey) } };
  }
}

function decodeEntry(entry: CredentialEntry): CredentialEntry {
  const credentials = { ...entry.credentials };
  if (entry.provider === 'dnshe') {
    const dnshe = credentials as DnsheCredential;
    return { ...entry, credentials: { ...dnshe, apiKey: decodeSecret(dnshe.apiKey), apiSecret: decodeSecret(dnshe.apiSecret) } };
  } else {
    const neko = credentials as DnsnekoCredential;
    return { ...entry, credentials: { ...neko, username: decodeSecret(neko.username), apiKey: decodeSecret(neko.apiKey) } };
  }
}

export const useCredentialsStore = create<CredentialsState>()(
  persist(
    (set, get) => ({
      entries: [],

      addCredential: (entry: Omit<CredentialEntry, 'createdAt'>) => {
        const newEntry: CredentialEntry = {
          ...entry,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          entries: [...state.entries.filter((e) => e.provider !== entry.provider), newEntry],
        }));
      },

      updateCredential: (provider: ProviderType, credentials: DnsheCredential | DnsnekoCredential) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.provider === provider ? { ...entry, credentials } : entry
          ),
        }));
      },

      removeCredential: (provider: ProviderType) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.provider !== provider),
        }));
      },

      getCredential: (provider: ProviderType) => {
        return get().entries.find((entry) => entry.provider === provider);
      },

      updateStatus: (provider: ProviderType, status: 'valid' | 'invalid') => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.provider === provider
              ? { ...entry, status, lastVerified: new Date().toISOString() }
              : entry
          ),
        }));
      },
    }),
    {
      name: 'dns-mgr-credentials',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              entries: (parsed.state.entries as CredentialEntry[]).map(decodeEntry),
            },
          };
        },
        setItem: (name, value) => {
          const encoded = {
            ...value,
            state: {
              ...value.state,
              entries: (value.state.entries as CredentialEntry[]).map(encodeEntry),
            },
          };
          localStorage.setItem(name, JSON.stringify(encoded));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
