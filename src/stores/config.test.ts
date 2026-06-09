import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from './config';

describe('useConfigStore', () => {
  beforeEach(() => {
    useConfigStore.getState().resetConfig();
  });

  it('has correct default values', () => {
    const state = useConfigStore.getState();
    expect(state.rateLimitPerMinute).toBe(50);
    expect(state.requestTimeout).toBe(10000);
    expect(state.autoRetry).toBe(true);
    expect(state.maxRetries).toBe(2);
    expect(state.credentialStorage).toBe('local');
    expect(state.systemName).toBe('DNS Manager');
    expect(state.timezone).toBe('Asia/Shanghai');
    expect(state.language).toBe('zh-CN');
  });

  it('updateConfig updates single field', () => {
    useConfigStore.getState().updateConfig({ rateLimitPerMinute: 100 });
    expect(useConfigStore.getState().rateLimitPerMinute).toBe(100);
    // Other fields unchanged
    expect(useConfigStore.getState().requestTimeout).toBe(10000);
  });

  it('updateConfig updates multiple fields', () => {
    useConfigStore.getState().updateConfig({
      rateLimitPerMinute: 30,
      autoRetry: false,
      systemName: 'My DNS',
    });
    const state = useConfigStore.getState();
    expect(state.rateLimitPerMinute).toBe(30);
    expect(state.autoRetry).toBe(false);
    expect(state.systemName).toBe('My DNS');
  });

  it('resetConfig restores defaults', () => {
    useConfigStore.getState().updateConfig({ rateLimitPerMinute: 999, timezone: 'UTC' });
    useConfigStore.getState().resetConfig();
    expect(useConfigStore.getState().rateLimitPerMinute).toBe(50);
    expect(useConfigStore.getState().timezone).toBe('Asia/Shanghai');
  });
});
