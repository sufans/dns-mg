import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  Key,
  ScrollText,
  Shield,
  Sun,
  Moon,
  Bell,
  Menu,
  LogOut,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const navItems: { label: string; icon: typeof LayoutDashboard; path: string; disabled?: boolean }[] = [
  { label: '仪表盘', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'API 账号', icon: Key, path: '/accounts' },
  { label: '操作日志', icon: ScrollText, path: '/logs' },
  { label: '安全设置', icon: Shield, path: '/settings' },
];

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);
  return { isDark, toggle };
}

function getPageTitle(pathname: string): string {
  const item = navItems.find((n) => n.path === pathname);
  return item?.label ?? '仪表盘';
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.username
      ? user.username.slice(0, 2).toUpperCase()
      : 'U';

  const closeSidebar = () => setSidebarOpen(false);

  const openSidebar = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSidebarOpen(true);
  };

  // Focus trap for mobile sidebar
  useEffect(() => {
    if (!sidebarOpen) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Focus the sidebar when it opens
    const firstFocusable = sidebar.querySelector<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeSidebar();
        previousFocusRef.current?.focus();
        return;
      }

      if (e.key !== 'Tab') return;

      const currentSidebar = sidebarRef.current;
      if (!currentSidebar) return;

      const focusableElements = currentSidebar.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay - closes when clicking outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        role="navigation"
        aria-label="主导航"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + Close button for mobile */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Globe className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold tracking-tight">DNS Manager</span>
          </div>
          <button
            type="button"
            className="lg:hidden rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            onClick={closeSidebar}
            aria-label="关闭侧边栏"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.disabled) {
              return (
                <div
                  key={item.path}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-40 cursor-not-allowed"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </div>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-[hsl(var(--sidebar-foreground))]/70 hover:bg-white/10 hover:text-[hsl(var(--sidebar-foreground))]'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {user?.displayName || user?.username || '用户'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-[hsl(var(--sidebar-foreground))]/60 hover:text-[hsl(var(--sidebar-foreground))] transition-colors"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={openSidebar}
              aria-label="打开侧边栏"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={isDark ? '切换亮色' : '切换暗色'}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" className="relative" title="通知">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]">3</Badge>
            </Button>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="用户菜单"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {userInitials}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-popover p-1 shadow-md">
                    <div className="px-3 py-2 border-b mb-1">
                      <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || 'admin'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
