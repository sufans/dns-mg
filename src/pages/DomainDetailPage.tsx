import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RecordBatchBar } from '../components/RecordBatchBar';
import type { BatchResult } from '../components/RecordBatchBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { runWithConcurrency } from '../lib/batch';
import { navigate } from '../lib/router';
import { queryClient } from '../lib/query';
import { formatDate } from '../lib/utils';
import type { UnifiedDomain, UnifiedRecord } from '../types/models';

const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'] as const;

interface RecordForm {
  name: string;
  type: string;
  value: string;
  line: string;
  ttl: number;
  priority: string;
  remark: string;
}

const EMPTY_FORM: RecordForm = { name: '@', type: 'A', value: '', line: 'default', ttl: 600, priority: '', remark: '' };

export function DomainDetailPage({ accountId, domainId }: { accountId: string; domainId: string }): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UnifiedRecord | null>(null);
  const [form, setForm] = useState<RecordForm>(EMPTY_FORM);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchPending, setBatchPending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const queryKey = ['domain-detail', accountId, domainId];
  const query = useQuery({
    queryKey,
    queryFn: () => api.get<{ domain: UnifiedDomain; records: UnifiedRecord[] }>(`/api/domains/${accountId}/${domainId}`)
  });

  function resetForm(): void {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startCreate(): void {
    if (showForm && editingId === null) {
      resetForm();
      return;
    }
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(record: UnifiedRecord): void {
    setEditingId(record.id);
    setForm({
      name: record.name,
      type: record.type,
      value: record.value,
      line: record.line ?? 'default',
      ttl: record.ttl,
      priority: record.priority === null ? '' : String(record.priority),
      remark: record.remark ?? ''
    });
    setShowForm(true);
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        type: form.type,
        value: form.value,
        line: form.line || null,
        ttl: Number(form.ttl),
        priority: form.priority ? Number(form.priority) : null,
        remark: form.remark || null
      };
      return editingId === null
        ? api.post(`/api/records/${accountId}/${domainId}`, body)
        : api.put(`/api/records/${accountId}/${domainId}/${editingId}`, body);
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey });
    }
  });

  const status = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.post(`/api/records/${accountId}/${domainId}/${id}/status`, { enabled }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey })
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/records/${accountId}/${domainId}/${id}`),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey });
    }
  });

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    save.mutate();
  }

  const domain = query.data?.domain;
  const records = query.data?.records ?? [];
  const supportsServerBatch = domain?.platform === 'dnsneko';
  const selectedRecords = records.filter((record) => selected.has(record.id));

  // Drop selections that no longer exist after a refresh or deletion.
  useEffect(() => {
    const live = new Set((query.data?.records ?? []).map((record) => record.id));
    setSelected((current) => {
      if (current.size === 0) return current;
      const next = new Set([...current].filter((id) => live.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [query.data]);

  function toggleSelected(id: string): void {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(): void {
    setSelected((current) => (current.size === records.length ? new Set() : new Set(records.map((record) => record.id))));
  }

  async function runBatch(operation: 'status' | 'delete' | 'ttl' | 'line', value?: string | number | boolean): Promise<void> {
    const targets = selectedRecords;
    if (targets.length === 0) return;
    setBatchPending(true);
    setBatchResult(null);
    setBatchProgress(null);
    try {
      if (supportsServerBatch) {
        await api.post('/api/records/batch', {
          accountId: Number(accountId),
          domainId,
          operation,
          ids: targets.map((record) => record.id),
          value
        });
        setBatchResult({ ok: targets.length, failed: [] });
      } else {
        setBatchProgress({ done: 0, total: targets.length });
        const outcome = await runWithConcurrency(
          targets,
          2,
          async (record) => {
            if (operation === 'status') {
              await api.post(`/api/records/${accountId}/${domainId}/${record.id}/status`, { enabled: Boolean(value) });
              return;
            }
            if (operation === 'delete') {
              await api.del(`/api/records/${accountId}/${domainId}/${record.id}`);
              return;
            }
            // TTL/line edits need the full record body; the upstream PUT is a replace.
            await api.put(`/api/records/${accountId}/${domainId}/${record.id}`, {
              name: record.name,
              type: record.type,
              value: record.value,
              line: operation === 'line' ? String(value ?? '') : record.line,
              ttl: operation === 'ttl' ? Number(value) : record.ttl,
              priority: record.priority,
              remark: record.remark
            });
          },
          (done, total) => setBatchProgress({ done, total })
        );
        setBatchResult({ ok: outcome.ok.length, failed: outcome.failed.map((item) => ({ name: `${item.item.name} ${item.item.type}`, error: item.error })) });
      }
      setBatchDeleteOpen(false);
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      setBatchResult({ ok: 0, failed: [{ name: '整体请求', error: error instanceof Error ? error.message : String(error) }] });
    } finally {
      setBatchPending(false);
      setBatchProgress(null);
    }
  }
  const subtitle = domain
    ? `${domain.platform} / ${domain.accountName} / 到期 ${formatDate(domain.expiresAt)}`
    : query.error
      ? '域名信息加载失败'
      : '加载中...';
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/domains')}><ArrowLeft className="mr-2 h-4 w-4" />返回域名列表</Button>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{domain?.name ?? '域名详情'}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>
      {query.error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">加载失败：{query.error.message}</div> : null}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>解析记录{records.length ? `（${records.length}）` : ''}</CardTitle>
          {domain ? (
            <Button variant={showForm ? 'ghost' : 'neon'} size="sm" onClick={startCreate}>
              {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {showForm ? '取消' : '添加记录'}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {showForm ? (
            <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-border bg-muted/40 p-4 md:grid-cols-6">
              <div className="space-y-2"><Label htmlFor="record-name">主机</Label><Input id="record-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="record-type">类型</Label><Select id="record-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{recordTypes.map((type) => <option key={type}>{type}</option>)}</Select></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="record-value">记录值</Label><Input id="record-value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="record-line">线路</Label><Input id="record-line" value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="record-ttl">TTL</Label><Input id="record-ttl" type="number" min={60} max={86400} value={form.ttl} onChange={(e) => setForm({ ...form, ttl: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label htmlFor="record-priority">优先级</Label><Input id="record-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-3"><Label htmlFor="record-remark">备注</Label><Input id="record-remark" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
              <div className="flex items-end md:col-span-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? '提交中...' : editingId === null ? '保存' : '保存修改'}</Button></div>
              {save.error ? <div className="text-sm text-red-600 dark:text-red-400 md:col-span-6">{save.error.message}</div> : null}
            </form>
          ) : null}
          {query.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">正在加载解析记录...</div>
          ) : query.error ? (
            <div className="p-6 text-sm text-muted-foreground">无法读取解析记录，请返回域名列表重试。</div>
          ) : records.length === 0 ? (
            <EmptyState title="暂无解析记录" description="点击「添加记录」创建第一条 A、CNAME 或 TXT 记录。" />
          ) : (
            <>
            <RecordBatchBar
              selectedCount={selected.size}
              supportsServerBatch={supportsServerBatch}
              pending={batchPending}
              progress={batchProgress}
              result={batchResult}
              onClear={() => { setSelected(new Set()); setBatchResult(null); }}
              onRun={(operation, value) => { void runBatch(operation, value); }}
              onRequestDelete={() => setBatchDeleteOpen(true)}
            />
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="全选当前页解析记录"
                      checked={records.length > 0 && selected.size === records.length}
                      onChange={toggleSelectAll}
                    />
                  </TH>
                  <TH>主机</TH><TH>类型</TH><TH>记录值</TH><TH>线路</TH><TH>TTL</TH><TH>状态</TH><TH>更新时间</TH><TH>操作</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((record) => (
                  <TR key={record.id}>
                    <TD>
                      <input type="checkbox" aria-label={`选择 ${record.name} ${record.type}`} checked={selected.has(record.id)} onChange={() => toggleSelected(record.id)} />
                    </TD>
                    <TD className="font-medium">{record.name}</TD>
                    <TD><Badge variant="secondary">{record.type}</Badge></TD>
                    <TD className="max-w-md truncate" title={record.value}>{record.value}</TD>
                    <TD>{record.line ?? '-'}</TD>
                    <TD>{record.ttl}</TD>
                    <TD><Badge variant={record.status === 'active' ? 'success' : 'warning'}>{record.status === 'active' ? '启用' : '暂停'}</Badge></TD>
                    <TD>{formatDate(record.updatedAt)}</TD>
                    <TD className="space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" aria-label={`编辑 ${record.name}`} title="编辑" onClick={() => startEdit(record)}><Pencil className="h-4 w-4" /></Button>
                      {domain?.platform === 'dnsneko' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`${record.status === 'active' ? '暂停' : '启用'} ${record.name}`}
                          title={record.status === 'active' ? '暂停解析' : '启用解析'}
                          disabled={status.isPending}
                          onClick={() => status.mutate({ id: record.id, enabled: record.status !== 'active' })}
                        >
                          {record.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" aria-label={`删除 ${record.name}`} title="删除" onClick={() => setPendingDelete(record)}><Trash2 className="h-4 w-4" /></Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            </>
          )}
          {status.error ? <div className="mt-3 text-sm text-red-600 dark:text-red-400">{status.error.message}</div> : null}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除解析记录"
        description={pendingDelete ? `确定删除 ${pendingDelete.name} ${pendingDelete.type} ${pendingDelete.value} 吗？该操作会立即同步到 DNS 平台。` : ''}
        confirmLabel="删除"
        destructive
        loading={remove.isPending}
        error={remove.error?.message ?? null}
        onCancel={() => {
          setPendingDelete(null);
          remove.reset();
        }}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
      <ConfirmDialog
        open={batchDeleteOpen}
        title="批量删除解析记录"
        description={`将删除已选中的 ${selected.size} 条记录，操作不可撤销，且会立即同步到 DNS 平台。`}
        confirmLabel={`删除 ${selected.size} 条`}
        destructive
        loading={batchPending}
        error={batchResult?.failed.length ? batchResult.failed[0].error : null}
        onCancel={() => {
          if (batchPending) return;
          setBatchDeleteOpen(false);
          setBatchResult(null);
        }}
        onConfirm={() => { void runBatch('delete'); }}
      />
    </div>
  );
}
