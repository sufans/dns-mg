import type { ApiEnvelope } from '../types/models';
import { navigate } from './router';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string | null,
    public requestId: string | null
  ) {
    super(message);
  }
}

function csrfToken(): string | null {
  return document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('dns_csrf='))
    ?.split('=')[1] ?? null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = csrfToken();
  if (token && init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) headers.set('X-CSRF-Token', decodeURIComponent(token));
  const response = await fetch(path, { ...init, headers, credentials: 'include' });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('text/csv')) {
    // Check the status first: an error page must never be saved as a CSV file.
    if (!response.ok) throw new ApiError(`导出失败（HTTP ${response.status}）`, response.status, null, null);
    return (await response.text()) as T;
  }
  const envelope = await readEnvelope<T>(response);
  if (!response.ok || !envelope?.ok) {
    // Navigate through the router so the SPA re-renders; a bare replaceState
    // would change the URL but leave the app showing the previous (blank) view.
    if (response.status === 401 && location.pathname !== '/login') navigate('/login');
    throw new ApiError(
      envelope?.error ?? `请求失败（HTTP ${response.status}）`,
      response.status,
      envelope?.code ?? null,
      envelope?.requestId ?? null
    );
  }
  return envelope.data as T;
}

/** Tolerates non-JSON error bodies (HTML from a proxy, empty 5xx) instead of throwing SyntaxError. */
async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  if (!(response.headers.get('Content-Type') ?? '').includes('application/json')) return null;
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) })
};
