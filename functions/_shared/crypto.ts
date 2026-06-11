const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function keyBytes(secret: string): Promise<Uint8Array> {
  try {
    const decoded = fromBase64Url(secret);
    if (decoded.byteLength === 32) return decoded;
  } catch {
    // fall back to digest
  }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(secret)));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', asArrayBuffer(await keyBytes(secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptJson(value: unknown, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(secret);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asArrayBuffer(iv) }, key, enc.encode(JSON.stringify(value)));
  return `v1:${toBase64Url(iv)}:${toBase64Url(new Uint8Array(cipher))}`;
}

export async function decryptJson<T>(payload: string, secret: string): Promise<T> {
  const [version, ivPart, cipherPart] = payload.split(':');
  if (version !== 'v1' || !ivPart || !cipherPart) throw new Error('Invalid encrypted payload');
  const key = await importAesKey(secret);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: asArrayBuffer(fromBase64Url(ivPart)) }, key, asArrayBuffer(fromBase64Url(cipherPart)));
  return JSON.parse(dec.decode(plain)) as T;
}

export function maskSecret(value: string | undefined): string {
  if (!value) return '未配置';
  if (value.length <= 8) return `${value.slice(0, 2)}****${value.slice(-2)}`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
