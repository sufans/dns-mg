// CORS middleware for all API endpoints
// Handles OPTIONS preflight requests and adds CORS headers to all responses
import type { PagesFunction } from '../_shared/types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export const onRequest: PagesFunction = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const response = await context.next();

  // Add CORS headers to all responses
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    if (key !== 'Access-Control-Max-Age') {
      newResponse.headers.set(key, value);
    }
  }

  return newResponse;
};
