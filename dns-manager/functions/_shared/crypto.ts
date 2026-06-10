// AES-256-GCM encryption/decryption using Web Crypto API
// Uses ENCRYPTION_KEY from environment variables

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(keyMaterial: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = encoder.encode(keyMaterial);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(plaintext: string, key: string): Promise<string> {
  const cryptoKey = await deriveKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded,
  );

  // Concatenate iv + ciphertext (which includes auth tag for AES-GCM)
  const ivBytes = new Uint8Array(iv);
  const cipherBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(ivBytes.length + cipherBytes.length);
  combined.set(ivBytes, 0);
  combined.set(cipherBytes, ivBytes.length);

  return arrayBufferToBase64(combined.buffer);
}

export async function decrypt(ciphertext: string, key: string): Promise<string> {
  const cryptoKey = await deriveKey(key);
  const combined = new Uint8Array(base64ToArrayBuffer(ciphertext));

  // Extract IV (first 12 bytes) and ciphertext + auth tag (rest)
  const iv = combined.slice(0, 12);
  const cipherData = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    cipherData,
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}
