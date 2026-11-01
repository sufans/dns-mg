import type { ApiAccountConfig } from './types';

export type CredentialInput = Record<string, string>;

/**
 * Builds a complete config for one platform from user input.
 * Returns null when a required credential is missing, so callers can reject the
 * request instead of persisting a config shaped for a different platform.
 */
export function buildAccountConfig(platform: string, credentials: CredentialInput): ApiAccountConfig | null {
  if (platform === 'dnshe') {
    const apiKey = credentials.apiKey;
    const apiSecret = credentials.apiSecret;
    return apiKey && apiSecret ? { apiKey, apiSecret } : null;
  }
  if (platform === 'dnsneko') {
    const username = credentials.username;
    const apiKey = credentials.apiKey;
    return username && apiKey ? { username, apiKey } : null;
  }
  if (platform === 'gleam') {
    const apiKey = credentials.apiKey;
    return apiKey ? { apiKey } : null;
  }
  return null;
}

/**
 * Merges partially submitted credentials into the stored config. The edit form
 * never echoes secrets back, so untouched fields arrive blank and must be kept.
 */
export function mergeAccountConfig(platform: string, oldConfig: ApiAccountConfig, credentials?: CredentialInput): ApiAccountConfig {
  if (!credentials) return oldConfig;
  const pick = (next: string | undefined, previous: string | undefined): string => (next ? next : (previous ?? ''));
  if (platform === 'dnshe') {
    return { apiKey: pick(credentials.apiKey, oldConfig.apiKey), apiSecret: pick(credentials.apiSecret, oldConfig.apiSecret) };
  }
  return { username: pick(credentials.username, oldConfig.username), apiKey: pick(credentials.apiKey, oldConfig.apiKey) };
}
