import { useCallback, useSyncExternalStore } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'dns-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemeMode(stored)) return stored;
  } catch {
    // localStorage can be unavailable (private mode); fall back to system.
  }
  return 'system';
}

/** True when this browser already has an explicit choice, so server settings must not override it. */
export function hasStoredTheme(): boolean {
  try {
    return isThemeMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;
}

/** Applies the resolved theme to <html> so CSS variables and dark: variants update. */
export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

// Module-level store: a single source of truth shared by every `useTheme()` caller.
let currentMode: ThemeMode = typeof window === 'undefined' ? 'system' : getStoredTheme();

function emit(): void {
  for (const listener of listeners) listener();
}

export function setThemeMode(mode: ThemeMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures; the theme still applies for this session.
  }
  applyTheme(mode);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  // Follow the OS preference while the user has selected `system`.
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (currentMode !== 'system') return;
    applyTheme('system');
    emit();
  });
}

/** React binding for the theme; keeps <html> and every consumer in sync. */
export function useTheme(): {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
} {
  const mode = useSyncExternalStore(subscribe, () => currentMode, () => 'system' as ThemeMode);
  const setMode = useCallback((next: ThemeMode) => setThemeMode(next), []);
  const toggle = useCallback(() => {
    setThemeMode(resolveTheme(currentMode) === 'dark' ? 'light' : 'dark');
  }, []);
  return { mode, resolved: resolveTheme(mode), setMode, toggle };
}
