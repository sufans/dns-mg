const SALT = new TextEncoder().encode('dns-mgr-credential-salt');
const ITERATIONS = 100000;

async function deriveKey(password: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedData {
  iv: string;
  ciphertext: string;
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedData> {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    ciphertext: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join(''),
  };
}

export async function decrypt(data: EncryptedData, password: string): Promise<string> {
  const key = await deriveKey(password);
  const iv = new Uint8Array(data.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const ciphertext = new Uint8Array(data.ciphertext.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

export function isEncryptedData(value: unknown): value is EncryptedData {
  return typeof value === 'object' && value !== null && 'iv' in value && 'ciphertext' in value;
}
