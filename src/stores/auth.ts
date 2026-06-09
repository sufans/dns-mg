import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// NOTE: This is a frontend-only demo. In production, password hashing and
// credential storage should be handled by a proper backend with server-side
// session management. The approaches used here (SHA-256 with username as salt,
// base64 encoding) are NOT suitable for production use.

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'admin';
  initialized: boolean;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  initialize: (data: { username: string; password: string; displayName: string; email: string }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateProfile: (data: Partial<Pick<User, 'displayName' | 'email'>>) => void;
  checkTokenExpiry: () => boolean;
}

interface TokenPayload {
  sub: string;
  username: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

interface StoredCredentials {
  username: string;
  passwordHash: string;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Base64 encoding for localStorage obfuscation (NOT encryption)
function encodeCredential(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeCredential(encoded: string): string {
  return decodeURIComponent(escape(atob(encoded)));
}

const CREDENTIALS_KEY = 'dns-mgr-credentials';

function storeCredentials(username: string, passwordHash: string): void {
  const data = JSON.stringify({ username, passwordHash });
  localStorage.setItem(CREDENTIALS_KEY, encodeCredential(data));
}

function getStoredCredentials(): StoredCredentials | null {
  const encoded = localStorage.getItem(CREDENTIALS_KEY);
  if (!encoded) return null;
  try {
    const data = decodeCredential(encoded);
    const parsed = JSON.parse(data);
    if (typeof parsed.username === 'string' && typeof parsed.passwordHash === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function createToken(userId: string, username: string): string {
  const payload: TokenPayload = {
    sub: userId,
    username,
    iss: 'dns-mgr',
    aud: 'dns-mgr-app',
    exp: Date.now() + 86400000, // 24 hours
    iat: Date.now(),
  };
  return `dns-mgr.${btoa(JSON.stringify(payload))}`;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    if (!token.startsWith('dns-mgr.')) return null;
    const payloadBase64 = token.slice(8);
    return JSON.parse(atob(payloadBase64)) as TokenPayload;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitialized: false,

      login: async (username: string, password: string): Promise<boolean> => {
        // Simulate async login
        await new Promise((resolve) => setTimeout(resolve, 500));

        const stored = getStoredCredentials();
        if (!stored) return false;

        if (stored.username !== username) return false;

        const inputHash = await hashPassword(password, username);
        if (stored.passwordHash !== inputHash) return false;

        const userId = stored.username;
        const token = createToken(userId, username);
        const user: User = {
          id: userId,
          username,
          displayName: username,
          email: '',
          role: 'admin',
          initialized: true,
          createdAt: new Date().toISOString(),
        };

        set({
          token,
          user,
          isAuthenticated: true,
          isInitialized: true,
        });

        return true;
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },

      initialize: async (data: {
        username: string;
        password: string;
        displayName: string;
        email: string;
      }): Promise<boolean> => {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const userId = data.username;
        const passwordHash = await hashPassword(data.password, data.username);
        storeCredentials(data.username, passwordHash);

        const token = createToken(userId, data.username);
        const user: User = {
          id: userId,
          username: data.username,
          displayName: data.displayName,
          email: data.email,
          role: 'admin',
          initialized: true,
          createdAt: new Date().toISOString(),
        };

        set({
          token,
          user,
          isAuthenticated: true,
          isInitialized: true,
        });

        return true;
      },

      changePassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
        const stored = getStoredCredentials();
        if (!stored) return false;

        // Verify current password
        const currentHash = await hashPassword(currentPassword, stored.username);
        if (currentHash !== stored.passwordHash) return false;

        // Update with new password
        const newPasswordHash = await hashPassword(newPassword, stored.username);
        storeCredentials(stored.username, newPasswordHash);

        return true;
      },

      updateProfile: (data: Partial<Pick<User, 'displayName' | 'email'>>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set({
          user: {
            ...currentUser,
            ...data,
          },
        });
      },

      checkTokenExpiry: (): boolean => {
        const token = get().token;
        if (!token) return true;

        const payload = decodeToken(token);
        if (!payload) return true;

        return payload.exp < Date.now();
      },
    }),
    {
      name: 'dns-mgr-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
