import { describe, expect, it } from 'vitest';
import { buildAccountConfig, mergeAccountConfig } from '../account-config';

describe('buildAccountConfig', () => {
  it('builds a DNSHE config only when key and secret are present', () => {
    expect(buildAccountConfig('dnshe', { apiKey: 'test-key' })).toBeNull();
    expect(buildAccountConfig('dnshe', { apiKey: 'test-key', apiSecret: 'test-secret' })).toEqual({
      apiKey: 'test-key',
      apiSecret: 'test-secret'
    });
  });

  it('builds a DNSNEKO config only when username and key are present', () => {
    expect(buildAccountConfig('dnsneko', { apiKey: 'test-key' })).toBeNull();
    expect(buildAccountConfig('dnsneko', { username: 'admin', apiKey: 'test-key' })).toEqual({
      username: 'admin',
      apiKey: 'test-key'
    });
  });

  it('builds a GLEAM config from the api key alone and drops foreign fields', () => {
    expect(buildAccountConfig('gleam', {})).toBeNull();
    expect(buildAccountConfig('gleam', { apiKey: 'gleam-key', username: 'stale', apiSecret: 'stale' })).toEqual({
      apiKey: 'gleam-key'
    });
  });

  it('rejects unknown platforms instead of inventing a config', () => {
    expect(buildAccountConfig('unknown', { apiKey: 'test-key' })).toBeNull();
  });
});

describe('mergeAccountConfig', () => {
  it('returns the stored config untouched when no credentials are submitted', () => {
    const stored = { apiKey: 'old-key', apiSecret: 'old-secret' };
    expect(mergeAccountConfig('dnshe', stored)).toBe(stored);
  });

  it('keeps stored values for blank fields so the edit form cannot wipe secrets', () => {
    expect(mergeAccountConfig('dnshe', { apiKey: 'old-key', apiSecret: 'old-secret' }, { apiKey: 'new-key', apiSecret: '' })).toEqual({
      apiKey: 'new-key',
      apiSecret: 'old-secret'
    });
  });

  it('merges DNSNEKO username and key independently', () => {
    expect(mergeAccountConfig('dnsneko', { username: 'old-user', apiKey: 'old-key' }, { apiKey: 'new-key' })).toEqual({
      username: 'old-user',
      apiKey: 'new-key'
    });
  });
});
