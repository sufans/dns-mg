import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ConfirmPasswordDialog } from '../components/ConfirmPasswordDialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import { formatDate } from '../lib/utils';
import type { ApiGroup, DNSPlatform, PublicApiAccount } from '../types/models';

export function AccountsPage(): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [form, setForm] = useState({ platform: 'dnshe' as DNSPlatform, name: '', groupId: '', apiKey: '', apiSecret: '', username: '' });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.get<{ accounts: PublicApiAccount[] }>('/api/accounts') });
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => api.get<{ groups: ApiGroup[] }>('/api/groups') });
  const create = useMutation({
    mutationFn: (verifyPassword: string) => api.post('/api/accounts', {
      platform: form.platform,
      name: form.name,
      groupId: form.groupId ? Number(form.groupId) : null,
      enabled: true,
      credentials: form.platform === 'dnshe' ? { apiKey: form.apiKey, apiSecret: form.apiSecret } : { username: form.username, apiKey: form.apiKey },
      verifyPassword,
      checkConnection: true
    }),
    onSuccess: async () => {
      setShowForm(false);
      setVerifyOpen(false);
      setForm({ platform: 'dnshe', name: '', groupId: '', apiKey: '', apiSecret: '', username: '' });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
  const check = useMutation({
    mutationFn: (id: number) => api.post(`/api/accounts/${id}/check`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['accounts'] })
  });
  const remove = useMutation({
    mutationFn: ({ id, verifyPassword }: { id: number; verifyPassword: string }) => api.del(`/api/accounts/${id}`, { verifyPassword }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setVerifyOpen(true);
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div><h1 className="text-3xl font-semibold tracking-tight">DNS 平台 API 账号</h1><p className="mt-2 text-slate-400">API 密钥使用 ENCRYPTION_KEY 加密后存入 D1。</p></div>
        <Button variant="neon" onClick={() => setShowForm((v) => !v)}><Plus className="mr-2 h-4 w-4" />添加账号</Button>
      </div>
      {showForm ? (
        <Card>
          <CardHeader><CardTitle>添加 API 账号</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>平台</Label><Select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as DNSPlatform })}><option value="dnshe">DNSHE</option><option value="dnsneko">DNSNEKO</option></Select></div>
              <div className="space-y-2"><Label>账号名称</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>分组</Label><Select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}><option value="">不分组</option>{(groups.data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
              {form.platform === 'dnsneko' ? <div className="space-y-2"><Label>DNSNEKO Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div> : null}
              <div className="space-y-2"><Label>API Key</Label><Input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} required /></div>
              {form.platform === 'dnshe' ? <div className="space-y-2"><Label>API Secret</Label><Input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} required /></div> : null}
              {create.error ? <div className="text-sm text-red-300 md:col-span-2">{create.error.message}</div> : null}
              <div className="md:col-span-2"><Button type="submit" variant="neon">保存并检测</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>名称</TH><TH>平台</TH><TH>分组</TH><TH>凭证</TH><TH>状态</TH><TH>最近检测</TH><TH>操作</TH></TR></THead>
            <TBody>
              {(accounts.data?.accounts ?? []).map((account) => (
                <TR key={account.id}>
                  <TD className="font-medium">{account.name}</TD>
                  <TD><Badge variant="secondary">{account.platform}</Badge></TD>
                  <TD>{account.groupName ?? '-'}</TD>
                  <TD className="font-mono text-xs">{account.maskedCredential}</TD>
                  <TD><Badge variant={account.enabled ? 'success' : 'warning'}>{account.enabled ? '启用' : '禁用'}</Badge></TD>
                  <TD><div>{formatDate(account.lastCheckAt)}</div>{account.lastError ? <div className="text-xs text-red-300">{account.lastError}</div> : null}</TD>
                  <TD className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => check.mutate(account.id)} disabled={check.isPending}><CheckCircle2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingDelete(account.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
      <ConfirmPasswordDialog open={verifyOpen} title="二次验证" description="添加 API 账号属于敏感操作，请再次输入管理员密码。" loading={create.isPending} onCancel={() => setVerifyOpen(false)} onConfirm={(password) => create.mutate(password)} />
      <ConfirmPasswordDialog open={pendingDelete !== null} title="删除账号" description="删除 API 账号不可恢复，请输入管理员密码确认。" loading={remove.isPending} onCancel={() => setPendingDelete(null)} onConfirm={(password) => pendingDelete && remove.mutate({ id: pendingDelete, verifyPassword: password })} />
    </div>
  );
}
