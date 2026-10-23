import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import type { ApiGroup } from '../types/models';

const DEFAULT_COLOR = '#6366f1';

export function GroupsPage(): JSX.Element {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [pendingDelete, setPendingDelete] = useState<ApiGroup | null>(null);

  const groups = useQuery({ queryKey: ['groups'], queryFn: () => api.get<{ groups: ApiGroup[] }>('/api/groups') });

  function reset(): void {
    setEditingId(null);
    setName('');
    setColor(DEFAULT_COLOR);
  }

  const save = useMutation({
    mutationFn: () => (editingId === null
      ? api.post('/api/groups', { name: name.trim(), color })
      : api.put(`/api/groups/${editingId}`, { name: name.trim(), color })),
    onSuccess: async () => {
      reset();
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/api/groups/${id}`),
    onSuccess: async () => {
      setPendingDelete(null);
      reset();
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    save.mutate();
  }

  function startEdit(group: ApiGroup): void {
    setEditingId(group.id);
    setName(group.name);
    setColor(group.color);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">分组管理</h1>
        <p className="mt-2 text-muted-foreground">用分组整理 API 账号，便于按业务线筛选域名。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId === null ? '新建分组' : '编辑分组'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_160px_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="group-name">分组名称</Label>
              <Input id="group-name" value={name} maxLength={48} onChange={(event) => setName(event.target.value)} placeholder="例如：生产环境" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-color">标识颜色</Label>
              <div className="flex items-center gap-2">
                <input
                  id="group-color"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                />
                <Input value={color} maxLength={7} onChange={(event) => setColor(event.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="neon" disabled={save.isPending || !name.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                {save.isPending ? '保存中...' : editingId === null ? '创建' : '保存'}
              </Button>
            </div>
            <div className="flex items-end">
              {editingId !== null ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  <X className="mr-2 h-4 w-4" />取消
                </Button>
              ) : null}
            </div>
            {save.error ? <div className="text-sm text-red-500 md:col-span-4">{save.error.message}</div> : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {groups.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">正在加载分组...</div>
          ) : (groups.data?.groups ?? []).length === 0 ? (
            <div className="p-6"><EmptyState title="暂无分组" description="创建分组后可在 API 账号中归类。" /></div>
          ) : (
            <Table>
              <THead><TR><TH>名称</TH><TH>颜色</TH><TH>更新时间</TH><TH>操作</TH></TR></THead>
              <TBody>
                {(groups.data?.groups ?? []).map((group) => (
                  <TR key={group.id}>
                    <TD className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                        {group.name}
                      </span>
                    </TD>
                    <TD><Badge variant="outline" className="font-mono">{group.color}</Badge></TD>
                    <TD>{group.updatedAt ? new Date(group.updatedAt).toLocaleString('zh-CN') : '-'}</TD>
                    <TD className="space-x-2">
                      <Button size="sm" variant="outline" aria-label={`编辑 ${group.name}`} onClick={() => startEdit(group)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`删除 ${group.name}`}
                        onClick={() => setPendingDelete(group)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除分组"
        description={`确定删除分组「${pendingDelete?.name ?? ''}」？该分组下的账号会变为未分组，域名本身不受影响。`}
        confirmLabel="删除"
        destructive
        loading={remove.isPending}
        error={remove.error?.message ?? null}
        onCancel={() => {
          if (!remove.isPending) {
            remove.reset();
            setPendingDelete(null);
          }
        }}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}
