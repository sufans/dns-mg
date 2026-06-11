import type React from 'react';
import { Activity, Database, FileClock, HardDriveDownload, LayoutDashboard, LogOut, Menu, MoonStar, Settings, Shield, UploadCloud } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const nav = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/domains', label: '域名中心', icon: Activity },
  { path: '/accounts', label: 'API账号', icon: Shield },
  { path: '/logs', label: '操作日志', icon: FileClock },
  { path: '/backup', label: '备份恢复', icon: HardDriveDownload },
  { path: '/settings', label: '系统设置', icon: Settings }
];

export function Shell({ children, path }: { children: React.ReactNode; path: string }): JSX.Element {
  const logout = useMutation({
    mutationFn: () => api.post('/api/auth/logout'),
    onSettled: () => navigate('/login')
  });
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.24),transparent_32rem),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.20),transparent_28rem)]" />
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-72 border-r border-white/10 bg-slate-950/80 p-4 backdrop-blur xl:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-neon">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold">DNS Manager</div>
            <div className="text-xs text-slate-400">Cloudflare Pages + D1</div>
          </div>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = path === item.path || (item.path !== '/' && path.startsWith(item.path));
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                  active ? 'bg-white/10 text-white shadow-neon' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="xl:hidden">
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <div className="text-sm text-slate-400">单管理员安全控制台</div>
                <div className="font-medium">DNSHE / DNSNEKO 统一管理</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => document.documentElement.classList.toggle('dark')}>
                <MoonStar className="mr-2 h-4 w-4" /> 主题
              </Button>
              <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
                <LogOut className="mr-2 h-4 w-4" /> 退出
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</main>
        <div className="fixed bottom-5 right-5 hidden rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs text-slate-400 shadow-neon md:block">
          <UploadCloud className="mr-2 inline h-4 w-4 text-indigo-300" /> 全部 API 通过 Pages Functions 代理
        </div>
      </div>
    </div>
  );
}
