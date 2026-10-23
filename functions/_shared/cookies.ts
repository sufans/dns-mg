// `__Host-` cookies require Secure + no Domain + Path=/. Browsers silently drop
// them over plain HTTP (e.g. local `wrangler pages dev` on http://localhost),
// which breaks local login. Use the prefixed name only on HTTPS, and fall back
// to a plain name for local HTTP development.
export const SESSION_COOKIE_HOST = '__Host-dns_session';
export const SESSION_COOKIE_INSECURE = 'dns_session';
export const CSRF_COOKIE = 'dns_csrf';

/**
 * Resolves the session cookie name for the given request. HTTPS deployments get
 * the hardened `__Host-` name; plain-HTTP local development gets a plain name.
 */
export function sessionCookieName(request: Request): string {
  return new URL(request.url).protocol === 'https:' ? SESSION_COOKIE_HOST : SESSION_COOKIE_INSECURE;
}

export function parseCookies(request: Request): Record<string, string> {
  const cookie = request.headers.get('Cookie') ?? '';
  return cookie.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[decodeURIComponent(rawKey)] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

/**
 * Reads the session token, tolerating both cookie names so an existing HTTPS
 * session is not lost and local HTTP development still works.
 */
export function readSessionToken(request: Request): string | undefined {
  const cookies = parseCookies(request);
  return cookies[SESSION_COOKIE_HOST] ?? cookies[SESSION_COOKIE_INSECURE];
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  maxAge?: number;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure ?? true) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite ?? 'Strict'}`);
  return parts.join('; ');
}

export function clearCookie(name: string, secure = true): string {
  // `secure` must match how the cookie was set, otherwise browsers silently
  // ignore the deletion over plain HTTP and the local session survives logout.
  return serializeCookie(name, '', { maxAge: 0, httpOnly: name !== CSRF_COOKIE, secure });
}
