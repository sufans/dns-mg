import { useMutation, useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import { formatDate } from '../lib/utils';
import type { OperationLog } from '../types/models';

export function LogsPage(): JSX.Element {
  const query = useQuery({ queryKey: ['logs'], queryFn: () => api.get<{ logs: OperationLog[] }>('/api/logs?limit=200') });
  const purge = useMutation({ mutationFn: () => api.del('/api/logs'), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['logs'] }) });
  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-3"><div><h1 className="text-3xl font-semibold tracking-tight">操作日志</h1><p className="mt-2 text-slate-400">记录管理员操作、IP、结果和错误信息。</p></div><Button variant="outline" onClick={() => purge.mutate()}><Trash2 className="mr-2 h-4 w-4" />清理过期日志</Button></div>
      <Card>
        <CardHeader><CardTitle>最近日志</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>时间</TH><TH>IP</TH><TH>动作</TH><TH>目标</TH><TH>结果</TH><TH>错误</TH></TR></THead>
            <TBody>
              {(query.data?.logs ?? []).map((log) => <TR key={log.id}><TD>{formatDate(log.createdAt)}</TD><TD className="font-mono text-xs">{log.ip}</TD><TD>{log.action}</TD><TD>{log.targetType} {log.targetId}</TD><TD><Badge variant={log.success ? 'success' : 'danger'}>{log.success ? '成功' : '失败'}</Badge></TD><TD className="max-w-sm truncate">{log.errorMessage ?? '-'}</TD></TR>)}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
