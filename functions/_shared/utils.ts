import type { Env, PagesFunction } from './types';

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

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
      ...CORS_HEADERS,
    },
  });
}

export function withCors(handler: PagesFunction): PagesFunction {
  return async (context) => {
    if (context.request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(context);

    // Ensure CORS headers are present on all responses
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      newHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
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
