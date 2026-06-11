import { useEffect, useMemo, useState } from 'react';

export function navigate(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event('app:navigate'));
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const update = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', update);
    window.addEventListener('app:navigate', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('app:navigate', update);
    };
  }, []);
  return path;
}

export function useRouteParams(pattern: RegExp, path: string): Record<string, string> | null {
  return useMemo(() => {
    const match = pattern.exec(path.split('?')[0]);
    if (!match?.groups) return null;
    return match.groups;
  }, [path, pattern]);
}
