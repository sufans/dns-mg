import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Database, LockKeyhole, MoonStar, Sun } from 'lucide-react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { queryClient } from '../lib/query';
import { useTheme } from '../lib/theme';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function LoginPage(): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { resolved, toggle } = useTheme();
  const login = useMutation({
    mutationFn: () => api.post<{ username: string }>('/api/auth/login', { username, password }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      navigate('/');
    }
  });

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    login.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.26),transparent_32rem),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.22),transparent_28rem)]" />
      <div className="absolute right-4 top-4">
        <Button variant="outline" size="sm" onClick={toggle} aria-label="切换深色或浅色模式">
          {resolved === 'dark' ? <MoonStar className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
          {resolved === 'dark' ? '深色' : '浅色'}
        </Button>
      </div>
      <Card className="w-full max-w-md shadow-neon">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">
            <Database className="h-8 w-8" />
          </div>
          <CardTitle>管理员登录</CardTitle>
          <CardDescription>凭证仅在 Cloudflare 环境变量中校验，前端不参与密码验证。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">用户名</Label>
              <Input id="login-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <Input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </div>
            {login.error ? <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">{login.error.message}</div> : null}
            <Button type="submit" variant="neon" className="w-full" disabled={login.isPending}>
              <LockKeyhole className="mr-2 h-4 w-4" /> {login.isPending ? '正在登录...' : '登录控制台'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
