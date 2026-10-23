import { describe, expect, it, vi } from 'vitest';
import { assertLoginAllowed, clientIp, loginKey, LoginLockedError, reservePlatformRequest } from '../rate-limit';
import type { Env } from '../types';

/** Minimal D1 stand-in that records bound values and returns scripted results. */
function fakeEnv(first: unknown, run = vi.fn().mockResolvedValue({ success: true })) {
  const bound: unknown[] = [];
  const prepare = vi.fn(() => {
    const statement = {
      bind: (...values: unknown[]) => {
        bound.push(...values);
        return statement;
      },
      first: vi.fn().mockResolvedValue(first),
      run
    };
    return statement;
  });
  return { env: { DB: { prepare } } as unknown as Env, bound, prepare, run };
}

describe('clientIp', () => {
  it('prefers CF-Connecting-IP', () => {
    const request = new Request('https://example.com', {
      headers: { 'CF-Connecting-IP': '1.2.3.4', 'X-Forwarded-For': '9.9.9.9' }
    });
    expect(clientIp(request)).toBe('1.2.3.4');
  });

  it('falls back to the first X-Forwarded-For entry', () => {
    const request = new Request('https://example.com', { headers: { 'X-Forwarded-For': '5.6.7.8, 10.0.0.1' } });
    expect(clientIp(request)).toBe('5.6.7.8');
  });
});

describe('loginKey', () => {
  it('combines ip and normalized username so rotating IPs cannot reset a target account', () => {
    expect(loginKey('1.2.3.4', ' Admin ')).toBe('1.2.3.4|admin');
    expect(loginKey('5.6.7.8', 'admin')).not.toBe(loginKey('1.2.3.4', 'admin'));
  });
});

describe('assertLoginAllowed', () => {
  it('throws LoginLockedError while locked', async () => {
    const { env } = fakeEnv({ fail_count: 5, locked_until: Math.floor(Date.now() / 1000) + 120 });
    await expect(assertLoginAllowed(env, '1.1.1.1', 'admin')).rejects.toBeInstanceOf(LoginLockedError);
  });

  it('allows login once the lock has expired', async () => {
    const { env } = fakeEnv({ fail_count: 5, locked_until: Math.floor(Date.now() / 1000) - 1 });
    await expect(assertLoginAllowed(env, '1.1.1.1', 'admin')).resolves.toBeUndefined();
  });
});

describe('reservePlatformRequest', () => {
  it('throws when the atomic upsert is skipped because the bucket is exhausted', async () => {
    const { env } = fakeEnv(null);
    await expect(reservePlatformRequest(env, 1, 55, 60)).rejects.toThrow('限流');
  });

  it('passes when the atomic upsert returns a counter', async () => {
    const { env, bound } = fakeEnv({ request_count: 3 });
    await expect(reservePlatformRequest(env, 1, 55, 60)).resolves.toBeUndefined();
    expect(bound).toContain(55);
  });
});
