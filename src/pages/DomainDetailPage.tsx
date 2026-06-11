import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { queryClient } from '../lib/query';
import { formatDate } from '../lib/utils';
import type { UnifiedDomain, UnifiedRecord } from '../types/models';

const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'] as const;

export function DomainDetailPage({ accountId, domainId }: { accountId: string; domainId: string }): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '@', type: 'A', value: '', line: 'default', ttl: 600, priority: '', remark: '' });
  const query = useQuery({
    queryKey: ['domain-detail', accountId, domainId],
    queryFn: () => api.get<{ domain: UnifiedDomain; records: UnifiedRecord[] }>(`/api/domains/${accountId}/${domainId}`)
  });
  const create = useMutation({
    mutationFn: () => api.post(`/api/records/${accountId}/${domainId}`, {
      name: form.name,
      type: form.type,
      value: form.value,
      line: form.line || null,
      ttl: Number(form.ttl),
      priority: form.priority ? Number(form.priority) : null,
      remark: form.remark || null
    }),
    onSuccess: async () => {
      setShowForm(false);
      setForm({ name: '@', type: 'A', value: '', line: 'default', ttl: 600, priority: '', remark: '' });
      await queryClient.invalidateQueries({ queryKey: ['domain-detail', accountId, domainId] });
    }
  });
  const del = useMutation({
    mutationFn: (recordId: string) => api.del(`/api/records/${accountId}/${domainId}/${recordId}`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['domain-detail', accountId, domainId] })
  });

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    create.mutate();
  }

  const domain = query.data?.domain;
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/domains')}><ArrowLeft className="mr-2 h-4 w-4" />返回域名列表</Button>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{domain?.name ?? '域名详情'}</h1>
        <p className="mt-2 text-slate-400">{domain ? `${domain.platform} / ${domain.accountName} / 到期 ${formatDate(domain.expiresAt)}` : '加载中...'}</p>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>解析记录</CardTitle>
          <Button variant="neon" size="sm" onClick={() => setShowForm((v) => !v)}><Plus className="mr-2 h-4 w-4" />添加记录</Button>
        </CardHeader>
        <CardContent>
          {showForm ? (
            <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-6">
              <div className="space-y-2"><Label>主机</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>类型</Label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{recordTypes.map((type) => <option key={type}>{type}</option>)}</Select></div>
              <div className="space-y-2 md:col-span-2"><Label>记录值</Label><Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
              <div className="space-y-2"><Label>线路</Label><Input value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} /></div>
              <div className="space-y-2"><Label>TTL</Label><Input type="number" min={60} max={86400} value={form.ttl} onChange={(e) => setForm({ ...form, ttl: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>优先级</Label><Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-3"><Label>备注</Label><Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
              <div className="flex items-end md:col-span-2"><Button type="submit" disabled={create.isPending}>{create.isPending ? '提交中...' : '保存'}</Button></div>
              {create.error ? <div className="text-sm text-red-300 md:col-span-6">{create.error.message}</div> : null}
            </form>
          ) : null}
          <Table>
            <THead><TR><TH>主机</TH><TH>类型</TH><TH>记录值</TH><TH>线路</TH><TH>TTL</TH><TH>状态</TH><TH>更新时间</TH><TH>操作</TH></TR></THead>
            <TBody>
              {(query.data?.records ?? []).map((record) => (
                <TR key={record.id}>
                  <TD className="font-medium">{record.name}</TD>
                  <TD><Badge variant="secondary">{record.type}</Badge></TD>
                  <TD className="max-w-md truncate">{record.value}</TD>
                  <TD>{record.line ?? '-'}</TD>
                  <TD>{record.ttl}</TD>
                  <TD><Badge variant={record.status === 'active' ? 'success' : 'warning'}>{record.status === 'active' ? '启用' : '暂停'}</Badge></TD>
                  <TD>{formatDate(record.updatedAt)}</TD>
                  <TD><Button variant="ghost" size="sm" onClick={() => del.mutate(record.id)} disabled={del.isPending}><Trash2 className="h-4 w-4" /></Button></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
