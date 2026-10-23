import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { ConfirmPasswordDialog } from '../components/ConfirmPasswordDialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import { formatDate } from '../lib/utils';
import type { ApiGroup, DNSPlatform, PublicApiAccount } from '../types/models';

interface AccountForm {
  platform: DNSPlatform;
  name: string;
  groupId: string;
  apiKey: string;
  apiSecret: string;
  username: string;
}

type DialogState =
  | { kind: 'save' }
  | { kind: 'disable'; id: number }
  | { kind: 'delete'; id: number }
  | null;

const EMPTY_FORM: AccountForm = { platform: 'dnshe', name: '', groupId: '', apiKey: '', apiSecret: '', username: '' };

/**
 * Builds the platform credential payload. Blank fields are omitted so the server
 * keeps the stored secret; the API rejects empty strings by design.
 */
function buildCredentials(form: AccountForm, editing: boolean): Record<string, string> | undefined {
  if (editing && !form.apiKey && !form.apiSecret && !form.username) return undefined;
  const fields = form.platform === 'dnsneko'
    ? { username: form.username, apiKey: form.apiKey }
    : form.platform === 'gleam'
      ? { apiKey: form.apiKey }
      : { apiKey: form.apiKey, apiSecret: form.apiSecret };
  const filled = Object.entries(fields).filter(([, value]) => value.trim() !== '');
  return filled.length ? Object.fromEntries(filled) : undefined;
}

export function AccountsPage(): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.get<{ accounts: PublicApiAccount[] }>('/api/accounts') });
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => api.get<{ groups: ApiGroup[] }>('/api/groups') });

  function resetForm(): void {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(account: PublicApiAccount): void {
    setEditingId(account.id);
    setShowForm(true);
    setForm({
      platform: account.platform,
      name: account.name,
      groupId: account.groupId === null ? '' : String(account.groupId),
      apiKey: '',
      apiSecret: '',
      username: ''
    });
  }

  const editingAccount = editingId === null ? null : (accounts.data?.accounts ?? []).find((item) => item.id === editingId) ?? null;
  // Switching platform invalidates the stored credential shape, so new secrets are mandatory.
  const platformChanged = Boolean(editingAccount && editingAccount.platform !== form.platform);
  const needsCredentials = editingId === null || platformChanged;
  const credentialsMissing = needsCredentials && (form.platform === 'gleam' ? !form.apiKey : form.platform === 'dnsneko' ? !form.apiKey || !form.username : !form.apiKey || !form.apiSecret);

  const save = useMutation({
    mutationFn: async (verifyPassword: string) => {
      const credentials = buildCredentials(form, editingId !== null);
      const groupId = form.groupId ? Number(form.groupId) : null;
      if (editingId === null) {
        return api.post('/api/accounts', {
          platform: form.platform,
          name: form.name,
          groupId,
          enabled: true,
          credentials,
          verifyPassword,
          checkConnection: true
        });
      }
      return api.put(`/api/accounts/${editingId}`, {
        platform: form.platform,
        name: form.name,
        groupId,
        ...(credentials ? { credentials } : {}),
        verifyPassword
      });
    },
    onSuccess: async () => {
      setDialog(null);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const toggle = useMutation({
    mutationFn: (id: number) => api.put(`/api/accounts/${id}`, { enabled: true }),
    onSuccess: async () => {
      setDialog(null);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const disable = useMutation({
    mutationFn: ({ id, verifyPassword }: { id: number; verifyPassword: string }) => api.put(`/api/accounts/${id}`, { enabled: false, verifyPassword }),
    onSuccess: async () => {
      setDialog(null);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const remove = useMutation({
    mutationFn: ({ id, verifyPassword }: { id: number; verifyPassword: string }) => api.del(`/api/accounts/${id}`, { verifyPassword }),
    onSuccess: async () => {
      setDialog(null);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const check = useMutation({
    mutationFn: (id: number) => api.post(`/api/accounts/${id}/check`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['accounts'] })
  });

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (credentialsMissing) return;
    setDialog({ kind: 'save' });
  }

  function confirmDialog(password: string): void {
    if (!dialog) return;
    if (dialog.kind === 'save') save.mutate(password);
    else if (dialog.kind === 'disable') disable.mutate({ id: dialog.id, verifyPassword: password });
    else remove.mutate({ id: dialog.id, verifyPassword: password });
  }

  const dialogLoading = save.isPending || disable.isPending || remove.isPending;
  const dialogError = dialog?.kind === 'save' ? save.error : dialog?.kind === 'disable' ? disable.error : dialog?.kind === 'delete' ? remove.error : null;
  const dialogText = dialog?.kind === 'save'
    ? { title: editingId === null ? '添加 API 账号' : '更新 API 账号', description: '该操作会写入加密凭证，请输入管理员密码确认。' }
    : dialog?.kind === 'disable'
      ? { title: '禁用账号', description: '禁用后该账号的域名将不再参与聚合与刷新，请输入管理员密码确认。' }
      : { title: '删除账号', description: '删除 API 账号不可恢复，请输入管理员密码确认。' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div><h1 className="text-3xl font-semibold tracking-tight">DNS 平台 API 账号</h1><p className="mt-2 text-muted-foreground">API 密钥使用 ENCRYPTION_KEY 加密后存入 D1。</p></div>
        <Button
          variant="neon"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
        >
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? '取消' : '添加账号'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle>{editingId === null ? '添加 API 账号' : '编辑 API 账号'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="account-platform">平台</Label><Select id="account-platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as DNSPlatform })}><option value="dnshe">DNSHE</option><option value="dnsneko">DNSNEKO</option><option value="gleam">GLEAM</option></Select></div>
              <div className="space-y-2"><Label htmlFor="account-name">账号名称</Label><Input id="account-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="account-group">分组</Label><Select id="account-group" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}><option value="">不分组</option>{(groups.data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
              {form.platform === 'dnsneko' ? <div className="space-y-2"><Label htmlFor="account-username">DNSNEKO Username</Label><Input id="account-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required={needsCredentials} placeholder={needsCredentials ? '' : '留空表示不修改'} /></div> : null}
              {form.platform !== 'gleam' ? <div className="space-y-2"><Label htmlFor="account-key">API Key</Label><Input id="account-key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} required={needsCredentials} placeholder={needsCredentials ? '' : '留空表示不修改'} /></div> : null}
              {form.platform === 'dnshe' ? <div className="space-y-2"><Label htmlFor="account-secret">API Secret</Label><Input id="account-secret" type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} required={needsCredentials} placeholder={needsCredentials ? '' : '留空表示不修改'} /></div> : null}
              {form.platform === 'gleam' ? <div className="space-y-2"><Label htmlFor="account-gleam-key">GLEAM API Key</Label><Input id="account-gleam-key" type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} required={needsCredentials} placeholder={needsCredentials ? 'hl6_xxxxxxxxxxxx' : '留空表示不修改'} /></div> : null}
              {editingId !== null && !platformChanged ? <p className="text-xs text-muted-foreground md:col-span-2">凭证字段留空时保留原有加密凭证。</p> : null}
              {platformChanged ? <p className="text-xs text-amber-600 dark:text-amber-400 md:col-span-2">切换平台后必须重新填写该平台的全部凭证。</p> : null}
              <div className="md:col-span-2"><Button type="submit" variant="neon" disabled={save.isPending || credentialsMissing}>{editingId === null ? '保存并检测' : '保存修改'}</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {accounts.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">正在加载账号...</div>
          ) : (accounts.data?.accounts ?? []).length === 0 ? (
            <div className="p-6"><EmptyState title="暂无 API 账号" description="添加 DNSHE、DNSNEKO 或 GLEAM 的 API 凭证后即可聚合域名。" /></div>
          ) : (
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
                    <TD><div>{formatDate(account.lastCheckAt)}</div>{account.lastError ? <div className="text-xs text-red-600 dark:text-red-400">{account.lastError}</div> : null}</TD>
                    <TD className="space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" aria-label={`检测 ${account.name}`} title="检测连接" onClick={() => check.mutate(account.id)} disabled={check.isPending}><CheckCircle2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" aria-label={`编辑 ${account.name}`} title="编辑" onClick={() => startEdit(account)}><Pencil className="h-4 w-4" /></Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`${account.enabled ? '禁用' : '启用'} ${account.name}`}
                        title={account.enabled ? '禁用账号' : '启用账号'}
                        disabled={toggle.isPending || disable.isPending}
                        onClick={() => {
                          if (account.enabled) setDialog({ kind: 'disable', id: account.id });
                          else toggle.mutate(account.id);
                        }}
                      >
                        <Power className={account.enabled ? 'h-4 w-4 text-emerald-600 dark:text-emerald-400' : 'h-4 w-4 text-muted-foreground'} />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`删除 ${account.name}`} title="删除" onClick={() => setDialog({ kind: 'delete', id: account.id })}><Trash2 className="h-4 w-4" /></Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmPasswordDialog
        open={dialog !== null}
        title={dialogText.title}
        description={dialogText.description}
        loading={dialogLoading}
        error={dialogError?.message ?? null}
        onCancel={() => {
          if (dialogLoading) return;
          setDialog(null);
          save.reset();
          disable.reset();
          remove.reset();
        }}
        onConfirm={confirmDialog}
      />
    </div>
  );
}
