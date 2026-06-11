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
import type { AppSettings } from '../types/models';

export function SettingsPage(): JSX.Element {
  const query = useQuery({ queryKey: ['settings'], queryFn: () => api.get<{ settings: AppSettings }>('/api/settings') });
  const [form, setForm] = useState<AppSettings>({ theme: 'system', refreshIntervalMinutes: 60, emailReminderEnabled: false, emailReminderDays: [30, 7, 0], logRetentionDays: 90 });
  useEffect(() => {
    if (query.data?.settings) setForm(query.data.settings);
  }, [query.data]);
  const save = useMutation({
    mutationFn: () => api.put('/api/settings', form),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  });
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    save.mutate();
  }
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold tracking-tight">系统设置</h1><p className="mt-2 text-slate-400">主题、自动刷新、邮件提醒与日志保留策略。</p></div>
      <Card>
        <CardHeader><CardTitle>基础设置</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>主题</Label><Select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value as AppSettings['theme'] })}><option value="system">跟随系统</option><option value="dark">深色</option><option value="light">浅色</option></Select></div>
            <div className="space-y-2"><Label>自动刷新间隔（分钟）</Label><Input type="number" min={15} max={1440} value={form.refreshIntervalMinutes} onChange={(e) => setForm({ ...form, refreshIntervalMinutes: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>日志保留天数</Label><Input type="number" min={7} max={3650} value={form.logRetentionDays} onChange={(e) => setForm({ ...form, logRetentionDays: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>提醒阈值（逗号分隔天数）</Label><Input value={form.emailReminderDays.join(',')} onChange={(e) => setForm({ ...form, emailReminderDays: e.target.value.split(',').map(Number).filter(Number.isFinite) })} /></div>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-sm md:col-span-2"><input type="checkbox" checked={form.emailReminderEnabled} onChange={(e) => setForm({ ...form, emailReminderEnabled: e.target.checked })} />启用邮件到期提醒（需配置 SEND_EMAIL 绑定与 EMAIL_FROM/EMAIL_TO）</label>
            {save.error ? <div className="text-sm text-red-300 md:col-span-2">{save.error.message}</div> : null}
            <div className="md:col-span-2"><Button type="submit" variant="neon" disabled={save.isPending}><Save className="mr-2 h-4 w-4" />保存设置</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
