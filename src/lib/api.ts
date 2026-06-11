import type { ApiEnvelope } from '../types/models';

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
  if (contentType.includes('text/csv')) return (await response.text()) as T;
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.ok) {
    if (response.status === 401 && location.pathname !== '/login') window.history.replaceState(null, '', '/login');
    throw new ApiError(envelope.error ?? '请求失败', response.status, envelope.code, envelope.requestId);
  }
  return envelope.data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) })
};
