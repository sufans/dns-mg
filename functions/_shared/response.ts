export interface ApiEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  code: string | null;
  requestId: string;
}

export const secureHeaders = (): HeadersInit => ({
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
});

const requestId = (): string => crypto.randomUUID();

export function jsonResponse<T>(data: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  Object.entries(secureHeaders()).forEach(([key, value]) => headers.set(key, String(value)));
  const body: ApiEnvelope<T> = { ok: true, data, error: null, code: null, requestId: requestId() };
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function errorResponse(
  message: string,
  status = 400,
  code = 'bad_request',
  extraHeaders: HeadersInit = {}
): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  Object.entries(secureHeaders()).forEach(([key, value]) => headers.set(key, String(value)));
  const body: ApiEnvelope<never> = { ok: false, data: null, error: message, code, requestId: requestId() };
  return new Response(JSON.stringify(body), { status, headers });
}

export function noContent(init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  Object.entries(secureHeaders()).forEach(([key, value]) => headers.set(key, String(value)));
  return new Response(null, { ...init, status: init.status ?? 204, headers });
}

export function notFound(): Response {
  return errorResponse('资源不存在', 404, 'not_found');
}
