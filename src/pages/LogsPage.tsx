import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/empty';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import { formatDate } from '../lib/utils';
import type { OperationLog } from '../types/models';

export function LogsPage(): JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useQuery({ queryKey: ['logs'], queryFn: () => api.get<{ logs: OperationLog[] }>('/api/logs?limit=200') });
  const purge = useMutation({
    mutationFn: () => api.del('/api/logs'),
    onSuccess: async () => {
      setConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });
  const logs = query.data?.logs ?? [];
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><h1 className="text-3xl font-semibold tracking-tight">操作日志</h1><p className="mt-2 text-muted-foreground">记录管理员操作、IP、结果和错误信息。</p></div><Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={purge.isPending}><Trash2 className="mr-2 h-4 w-4" />{purge.isPending ? '清理中...' : '清理过期日志'}</Button></div>
      {query.error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">加载失败：{query.error.message}</div> : null}
      <Card>
        <CardHeader><CardTitle>最近日志</CardTitle></CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">正在加载日志...</div>
          ) : logs.length === 0 ? (
            <div className="p-6"><EmptyState title="暂无日志" description="管理员操作记录会显示在这里。" /></div>
          ) : (
            <Table>
              <THead><TR><TH>时间</TH><TH>IP</TH><TH>动作</TH><TH>目标</TH><TH>结果</TH><TH>错误</TH></TR></THead>
              <TBody>
                {logs.map((log) => <TR key={log.id}><TD>{formatDate(log.createdAt)}</TD><TD className="font-mono text-xs">{log.ip}</TD><TD>{log.action}</TD><TD>{log.targetType} {log.targetId}</TD><TD><Badge variant={log.success ? 'success' : 'danger'}>{log.success ? '成功' : '失败'}</Badge></TD><TD className="max-w-sm truncate" title={log.errorMessage ?? undefined}>{log.errorMessage ?? '-'}</TD></TR>)}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="清理过期日志"
        description="将按系统设置中的日志保留天数删除更早的记录，删除后不可恢复。"
        confirmLabel="确认清理"
        destructive
        loading={purge.isPending}
        error={purge.error?.message ?? null}
        onCancel={() => {
          setConfirmOpen(false);
          purge.reset();
        }}
        onConfirm={() => purge.mutate()}
      />
    </div>
  );
}
