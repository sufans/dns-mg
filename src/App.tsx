import type React from 'react';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePath, useRouteParams, navigate } from './lib/router';
import { Shell } from './components/layout/Shell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DomainsPage } from './pages/DomainsPage';
import { DomainDetailPage } from './pages/DomainDetailPage';
import { AccountsPage } from './pages/AccountsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogsPage } from './pages/LogsPage';
import { BackupPage } from './pages/BackupPage';

const domainDetailPattern = /^\/domains\/(?<accountId>[^/]+)\/(?<domainId>[^/]+)$/;

function Protected({ children, path }: { children: React.ReactNode; path: string }): JSX.Element {
  const auth = useAuth();
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) navigate('/login');
  }, [auth.isLoading, auth.isAuthenticated]);
  if (auth.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-slate-300">加载认证状态...</div>;
  if (!auth.isAuthenticated) return <div className="min-h-screen bg-[#0f172a]" />;
  return <Shell path={path}>{children}</Shell>;
}

export function App(): JSX.Element {
  const fullPath = usePath();
  const path = fullPath.split('?')[0];
  const params = useRouteParams(domainDetailPattern, path);
  if (path === '/login') return <LoginPage />;
  let page: JSX.Element;
  if (path === '/') page = <DashboardPage />;
  else if (path === '/domains') page = <DomainsPage />;
  else if (params) page = <DomainDetailPage accountId={params.accountId} domainId={params.domainId} />;
  else if (path === '/accounts') page = <AccountsPage />;
  else if (path === '/settings') page = <SettingsPage />;
  else if (path === '/logs') page = <LogsPage />;
  else if (path === '/backup') page = <BackupPage />;
  else page = <DashboardPage />;
  return <Protected path={path}>{page}</Protected>;
}
