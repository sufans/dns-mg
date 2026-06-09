import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, isEncryptedData } from './crypto';

const hasSubtleCrypto = typeof globalThis.crypto?.subtle !== 'undefined';

describe.skipIf(!hasSubtleCrypto)('crypto', () => {
  it('encrypts and decrypts a string roundtrip', async () => {
    const plaintext = 'hello world';
    const password = 'test-password';
    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for different plaintexts', async () => {
    const password = 'test-password';
    const encrypted1 = await encrypt('hello', password);
    const encrypted2 = await encrypt('world', password);
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
  });

  it('produces different ciphertext for same plaintext with different passwords', async () => {
    const plaintext = 'hello world';
    const encrypted1 = await encrypt(plaintext, 'password1');
    const encrypted2 = await encrypt(plaintext, 'password2');
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
  });

  it('produces different IV each time even for same plaintext and password', async () => {
    const plaintext = 'hello world';
    const password = 'test-password';
    const encrypted1 = await encrypt(plaintext, password);
    const encrypted2 = await encrypt(plaintext, password);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  it('fails to decrypt with wrong password', async () => {
    const plaintext = 'hello world';
    const encrypted = await encrypt(plaintext, 'correct-password');
    await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow();
  });

  it('handles unicode characters', async () => {
    const plaintext = '你好世界 🌍 café';
    const password = 'test-password';
    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('handles empty string', async () => {
    const plaintext = '';
    const password = 'test-password';
    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  describe('isEncryptedData', () => {
    it('returns true for valid EncryptedData', () => {
      expect(isEncryptedData({ iv: 'abc', ciphertext: 'def' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isEncryptedData(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isEncryptedData(undefined)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isEncryptedData('string')).toBe(false);
    });

    it('returns false for object with only iv', () => {
      expect(isEncryptedData({ iv: 'abc' })).toBe(false);
    });

    it('returns false for object with only ciphertext', () => {
      expect(isEncryptedData({ ciphertext: 'def' })).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isEncryptedData({})).toBe(false);
    });

    it('returns false for PlatformCredential-like object', () => {
      expect(isEncryptedData({ apiKey: 'test', apiSecret: 'test' })).toBe(false);
    });
  });
});
