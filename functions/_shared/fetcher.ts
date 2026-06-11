export class UpstreamError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public retryAfter?: number
  ) {
    super(message);
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJsonWithRetry<T>(url: string, init: RequestInit, retries = 2): Promise<T> {
  let attempt = 0;
  while (true) {
    const response = await fetch(url, init);
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (response.ok) return payload as T;
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      const wait = retryAfter ? retryAfter * 1000 : Math.min(250 * 2 ** attempt, 1500);
      await sleep(wait);
      attempt += 1;
      continue;
    }
    const message = typeof payload === 'object' && payload && 'message' in payload ? String((payload as { message?: string }).message) : `HTTP ${response.status}`;
    throw new UpstreamError(message, response.status, undefined, retryAfter);
  }
}
