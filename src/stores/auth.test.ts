import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './auth';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset the zustand store to initial state
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitialized: false,
    });
  });

  describe('initial state', () => {
    it('starts with not authenticated', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('starts with not initialized', () => {
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(false);
    });

    it('starts with null token', () => {
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
    });

    it('starts with null user', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('initialize', () => {
    it('creates account and sets authenticated', async () => {
      const result = await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin User',
        email: 'admin@example.com',
      });

      expect(result).toBe(true);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
      expect(state.token).not.toBeNull();
      expect(state.user).not.toBeNull();
      expect(state.user?.username).toBe('admin');
      expect(state.user?.displayName).toBe('Admin User');
      expect(state.user?.email).toBe('admin@example.com');
      expect(state.user?.role).toBe('admin');
      expect(state.user?.initialized).toBe(true);
    });

    it('stores credentials in localStorage', async () => {
      await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin',
        email: 'admin@test.com',
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const credentialsCall = setItemCalls.find((call) => call[0] === 'dns-mgr-credentials');
      expect(credentialsCall).toBeDefined();
    });
  });

  describe('login with correct credentials', () => {
    it('returns true and sets authenticated on correct credentials', async () => {
      // First initialize to store credentials
      await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin',
        email: 'admin@test.com',
      });

      // Reset auth state but keep localStorage
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitialized: false,
      });

      // Now login with correct credentials
      const result = await useAuthStore.getState().login('admin', 'password123');

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.username).toBe('admin');
    });
  });

  describe('login with wrong credentials', () => {
    it('returns false on wrong password', async () => {
      // First initialize to store credentials
      await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin',
        email: 'admin@test.com',
      });

      // Reset auth state but keep localStorage
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitialized: false,
      });

      // Login with wrong password
      const result = await useAuthStore.getState().login('admin', 'wrongpassword');

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('returns false on wrong username', async () => {
      // First initialize to store credentials
      await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin',
        email: 'admin@test.com',
      });

      // Reset auth state but keep localStorage
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitialized: false,
      });

      // Login with wrong username
      const result = await useAuthStore.getState().login('wronguser', 'password123');

      expect(result).toBe(false);
    });

    it('returns false when no credentials stored', async () => {
      // No initialization, so no credentials stored
      const result = await useAuthStore.getState().login('admin', 'password123');

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears auth state on logout', async () => {
      // First initialize
      await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin',
        email: 'admin@test.com',
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('checkTokenExpiry', () => {
    it('returns true (expired) when no token', () => {
      const isExpired = useAuthStore.getState().checkTokenExpiry();
      expect(isExpired).toBe(true);
    });

    it('returns false (not expired) for fresh token', async () => {
      await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin',
        email: 'admin@test.com',
      });

      const isExpired = useAuthStore.getState().checkTokenExpiry();
      expect(isExpired).toBe(false);
    });

    it('returns true (expired) for expired token', () => {
      // Manually set an expired token
      const expiredPayload = {
        sub: 'admin',
        username: 'admin',
        exp: Date.now() - 100000, // expired in the past
        iat: Date.now() - 200000,
      };
      const expiredToken = `dns-mgr.${btoa(JSON.stringify(expiredPayload))}`;

      useAuthStore.setState({ token: expiredToken });

      const isExpired = useAuthStore.getState().checkTokenExpiry();
      expect(isExpired).toBe(true);
    });

    it('returns true (expired) for invalid token format', () => {
      useAuthStore.setState({ token: 'invalid-token' });

      const isExpired = useAuthStore.getState().checkTokenExpiry();
      expect(isExpired).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('updates displayName and email', async () => {
      await useAuthStore.getState().initialize({
        username: 'admin',
        password: 'password123',
        displayName: 'Admin',
        email: 'admin@test.com',
      });

      useAuthStore.getState().updateProfile({
        displayName: 'New Name',
        email: 'new@test.com',
      });

      const state = useAuthStore.getState();
      expect(state.user?.displayName).toBe('New Name');
      expect(state.user?.email).toBe('new@test.com');
    });

    it('does nothing when no user is set', () => {
      // No user set, should not throw
      expect(() => {
        useAuthStore.getState().updateProfile({ displayName: 'Test' });
      }).not.toThrow();
    });
  });
});
