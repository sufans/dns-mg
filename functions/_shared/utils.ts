import type { Env, PagesFunction } from './types';

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export function createResponse<T = unknown>(
  data: T | null = null,
  status: number = 200,
  message: string = 'ok',
): Response {
  const body: ApiResponse<T> = { code: status, message, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// CORS is handled by api/_middleware.ts; this is now a passthrough
export function withCors(handler: PagesFunction): PagesFunction {
  return handler;
}

export function getClientIP(request: Request): string {
  // CF-Connecting-IP is the most reliable in Cloudflare Workers -
  // it is set by Cloudflare's edge and cannot be spoofed by clients.
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP.trim();
  }
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) {
    return realIP.trim();
  }
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
