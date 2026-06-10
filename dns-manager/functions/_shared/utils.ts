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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function withCors(handler: PagesFunction): PagesFunction {
  return async (context) => {
    if (context.request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    return handler(context);
  };
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) {
    return realIP.trim();
  }
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP.trim();
  }
  return 'unknown';
}
