import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import { hasStoredTheme, useTheme } from '../lib/theme';
import type { AppSettings } from '../types/models';

export function SettingsPage(): JSX.Element {
  const query = useQuery({ queryKey: ['settings'], queryFn: () => api.get<{ settings: AppSettings }>('/api/settings') });
  const { mode, setMode } = useTheme();
  const [form, setForm] = useState<AppSettings>({ theme: 'system', refreshIntervalMinutes: 60, emailReminderEnabled: false, emailReminderDays: [30, 7, 0], logRetentionDays: 90 });
  useEffect(() => {
    if (!query.data?.settings) return;
    setForm(query.data.settings);
    // Only adopt the server-side theme on a browser that has no local choice yet.
    if (!hasStoredTheme()) setMode(query.data.settings.theme);
  }, [query.data, setMode]);
  const save = useMutation({
    // The header toggle is the source of truth for the theme, so read it at submit time.
    mutationFn: () => api.put('/api/settings', { ...form, theme: mode }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // The theme is applied by changeTheme/header toggle already; re-applying form.theme
    // here would undo a header-toggle choice that was never written into the form.
    save.mutate();
  }
  function changeTheme(theme: AppSettings['theme']): void {
    setForm((prev) => ({ ...prev, theme }));
    setMode(theme);
  }
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold tracking-tight">系统设置</h1><p className="mt-2 text-muted-foreground">主题、自动刷新、邮件提醒与日志保留策略。</p></div>
      <Card>
        <CardHeader><CardTitle>基础设置</CardTitle></CardHeader>
        <CardContent>
          {query.isLoading ? <div className="text-sm text-muted-foreground">正在加载设置...</div> : null}
          {query.error ? <div className="text-sm text-red-600 dark:text-red-400">设置加载失败：{query.error.message}</div> : null}
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="theme-select">主题</Label><Select id="theme-select" value={mode} onChange={(e) => changeTheme(e.target.value as AppSettings['theme'])}><option value="system">跟随系统</option><option value="dark">深色</option><option value="light">浅色</option></Select><p className="text-xs text-muted-foreground">主题保存在当前浏览器，选择后立即生效；保存后作为其他设备与新浏览器的默认主题。当前浏览器一旦手动选过主题，就不再被服务端值覆盖。</p></div>
            <div className="space-y-2"><Label>自动刷新间隔（分钟）</Label><Input type="number" min={15} max={1440} value={form.refreshIntervalMinutes} onChange={(e) => setForm({ ...form, refreshIntervalMinutes: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>日志保留天数</Label><Input type="number" min={7} max={3650} value={form.logRetentionDays} onChange={(e) => setForm({ ...form, logRetentionDays: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>提醒阈值（逗号分隔天数）</Label><Input value={form.emailReminderDays.join(',')} onChange={(e) => setForm({ ...form, emailReminderDays: e.target.value.split(',').map(Number).filter(Number.isFinite) })} /></div>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm md:col-span-2"><input type="checkbox" checked={form.emailReminderEnabled} onChange={(e) => setForm({ ...form, emailReminderEnabled: e.target.checked })} />启用邮件到期提醒（需配置 SEND_EMAIL 绑定与 EMAIL_FROM/EMAIL_TO）</label>
            {save.error ? <div className="text-sm text-red-600 dark:text-red-400 md:col-span-2">{save.error.message}</div> : null}
            {save.isSuccess && !save.isPending ? <div className="text-sm text-emerald-600 dark:text-emerald-400 md:col-span-2">设置已保存。</div> : null}
            <div className="md:col-span-2"><Button type="submit" variant="neon" disabled={save.isPending || query.isLoading}><Save className="mr-2 h-4 w-4" />{save.isPending ? '保存中...' : '保存设置'}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
