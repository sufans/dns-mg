import type { AuthContext } from './types';

const enc = new TextEncoder();

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', asArrayBuffer(enc.encode(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signJwt(payload: Omit<AuthContext, 'iat' | 'exp'>, secret: string, ttlSeconds = 86400): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body: AuthContext = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const unsigned = `${base64Url(enc.encode(JSON.stringify(header)))}.${base64Url(enc.encode(JSON.stringify(body)))}`;
  const signature = await crypto.subtle.sign('HMAC', await getKey(secret), enc.encode(unsigned));
  return `${unsigned}.${base64Url(signature)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<AuthContext | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const verified = await crypto.subtle.verify('HMAC', await getKey(secret), asArrayBuffer(fromBase64Url(encodedSignature)), enc.encode(unsigned));
  if (!verified) return null;
  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as AuthContext;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64Url(buf);
}
