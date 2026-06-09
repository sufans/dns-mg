import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state and clear stored credentials
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitialized: false,
    });
    localStorage.removeItem('dns-mgr-credentials');
    localStorage.removeItem('dns-mgr-auth');
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('initialize creates admin account and sets authenticated and initialized', async () => {
    const store = useAuthStore.getState();
    const result = await store.initialize({
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
    expect(state.user!.username).toBe('admin');
    expect(state.user!.displayName).toBe('Admin User');
    expect(state.user!.email).toBe('admin@example.com');
    expect(state.user!.role).toBe('admin');
    expect(state.user!.initialized).toBe(true);
  });

  it('login with correct credentials succeeds', async () => {
    // First initialize to store credentials
    await useAuthStore.getState().initialize({
      username: 'admin',
      password: 'password123',
      displayName: 'Admin',
      email: 'admin@test.com',
    });

    // Logout to clear auth state
    useAuthStore.getState().logout();

    // Now login with correct credentials
    const result = await useAuthStore.getState().login('admin', 'password123');
    expect(result).toBe(true);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user!.username).toBe('admin');
  });

  it('login with wrong password fails', async () => {
    // First initialize to store credentials
    await useAuthStore.getState().initialize({
      username: 'admin',
      password: 'password123',
      displayName: 'Admin',
      email: 'admin@test.com',
    });

    // Logout
    useAuthStore.getState().logout();

    // Login with wrong password
    const result = await useAuthStore.getState().login('admin', 'wrongpassword');
    expect(result).toBe(false);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });

  it('login with wrong username fails', async () => {
    // First initialize to store credentials
    await useAuthStore.getState().initialize({
      username: 'admin',
      password: 'password123',
      displayName: 'Admin',
      email: 'admin@test.com',
    });

    // Logout
    useAuthStore.getState().logout();

    // Login with wrong username
    const result = await useAuthStore.getState().login('wronguser', 'password123');
    expect(result).toBe(false);
  });

  it('logout clears auth state', async () => {
    await useAuthStore.getState().initialize({
      username: 'admin',
      password: 'password123',
      displayName: 'Admin',
      email: 'admin@test.com',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    // isInitialized should remain true after logout
    expect(state.isInitialized).toBe(true);
  });

  it('checkTokenExpiry returns false for fresh token', async () => {
    await useAuthStore.getState().initialize({
      username: 'admin',
      password: 'password123',
      displayName: 'Admin',
      email: 'admin@test.com',
    });

    const isExpired = useAuthStore.getState().checkTokenExpiry();
    expect(isExpired).toBe(false);
  });

  it('checkTokenExpiry returns true for expired token', async () => {
    await useAuthStore.getState().initialize({
      username: 'admin',
      password: 'password123',
      displayName: 'Admin',
      email: 'admin@test.com',
    });

    // Manually set an expired token
    const expiredPayload = {
      sub: 'admin',
      username: 'admin',
      iss: 'dns-mgr',
      aud: 'dns-mgr-app',
      exp: Date.now() - 100000, // expired
      iat: Date.now() - 200000,
    };
    const expiredToken = `dns-mgr.${btoa(JSON.stringify(expiredPayload))}`;
    useAuthStore.setState({ token: expiredToken });

    const isExpired = useAuthStore.getState().checkTokenExpiry();
    expect(isExpired).toBe(true);
  });

  it('checkTokenExpiry returns true when no token exists', () => {
    const isExpired = useAuthStore.getState().checkTokenExpiry();
    expect(isExpired).toBe(true);
  });

  it('updateProfile updates displayName and email', async () => {
    await useAuthStore.getState().initialize({
      username: 'admin',
      password: 'password123',
      displayName: 'Admin',
      email: 'admin@test.com',
    });

    useAuthStore.getState().updateProfile({
      displayName: 'Super Admin',
      email: 'superadmin@test.com',
    });

    const state = useAuthStore.getState();
    expect(state.user!.displayName).toBe('Super Admin');
    expect(state.user!.email).toBe('superadmin@test.com');
  });

  it('updateProfile does nothing when no user is set', () => {
    // No user set, should not throw
    useAuthStore.getState().updateProfile({ displayName: 'Test' });
    expect(useAuthStore.getState().user).toBeNull();
  });
});
