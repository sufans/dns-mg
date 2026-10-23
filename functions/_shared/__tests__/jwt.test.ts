import { describe, expect, it } from 'vitest';
import { randomToken, signJwt, verifyJwt } from '../jwt';

const secret = 'test-secret-value-at-least-32-chars-long';

describe('jwt', () => {
  it('round-trips a valid token', async () => {
    const token = await signJwt({ username: 'admin', csrf: 'csrf-token' }, secret, 60);
    const payload = await verifyJwt(token, secret);
    expect(payload?.username).toBe('admin');
    expect(payload?.csrf).toBe('csrf-token');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signJwt({ username: 'admin', csrf: 'c' }, secret, 60);
    expect(await verifyJwt(token, 'another-secret')).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signJwt({ username: 'admin', csrf: 'c' }, secret, 60);
    const [header, , signature] = token.split('.');
    const forgedPayload = btoa(JSON.stringify({ username: 'root', csrf: 'c', iat: 0, exp: 9999999999 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    expect(await verifyJwt(`${header}.${forgedPayload}.${signature}`, secret)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signJwt({ username: 'admin', csrf: 'c' }, secret, -1);
    expect(await verifyJwt(token, secret)).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyJwt('not-a-jwt', secret)).toBeNull();
    expect(await verifyJwt('a.b', secret)).toBeNull();
  });

  it('produces unique random tokens', () => {
    expect(randomToken(16)).not.toBe(randomToken(16));
  });
});
