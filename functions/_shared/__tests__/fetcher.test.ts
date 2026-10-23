import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJsonWithRetry, UpstreamError } from '../fetcher';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchJsonWithRetry host allow-list', () => {
  it('rejects a host outside the allow-list without issuing a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJsonWithRetry('https://evil.example.com/steal', {})).rejects.toBeInstanceOf(UpstreamError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid URL', async () => {
    await expect(fetchJsonWithRetry('not a url', {})).rejects.toBeInstanceOf(UpstreamError);
  });

  it('allows a whitelisted upstream host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJsonWithRetry('https://www.dnsneko.com/api/v1/dns/domains', {})).resolves.toEqual({ ok: true });
  });

  it('retries 5xx responses then throws a descriptive UpstreamError', async () => {
    // A fresh Response per call is required: response bodies can only be read once.
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJsonWithRetry('https://api005.dnshe.com/x', {}, 1)).rejects.toThrow('boom');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
