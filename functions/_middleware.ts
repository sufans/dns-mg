import { secureHeaders } from './_shared/response';
import type { Env } from './_shared/types';

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: secureHeaders() });
  }
  const response = await context.next();
  const headers = new Headers(response.headers);
  Object.entries(secureHeaders()).forEach(([key, value]) => headers.set(key, String(value)));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
