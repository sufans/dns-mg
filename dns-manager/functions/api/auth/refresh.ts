import type { PagesFunction } from '../../_shared/types';
import { createResponse, withCors } from '../../_shared/utils';
import { verifyJWTWithGrace, signJWT } from '../../_shared/auth';

export const onRequest: PagesFunction = withCors(async (context) => {
  if (context.request.method !== 'POST') {
    return createResponse(null, 405, '方法不允许');
  }

  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse(null, 401, '缺少认证令牌');
  }

  const token = authHeader.slice(7);

  // Verify with grace period (allow expired tokens within 5 minutes)
  const payload = await verifyJWTWithGrace(token, context.env.JWT_SECRET, 300);
  if (!payload) {
    return createResponse(null, 401, '认证令牌无效或已过期');
  }

  // Sign a new JWT
  const newToken = await signJWT({ sub: payload.sub }, context.env.JWT_SECRET, '24h');

  return createResponse({ token: newToken, expiresIn: 86400 }, 200, '令牌刷新成功');
});
