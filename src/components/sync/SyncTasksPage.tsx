import { useState, useEffect, useRef, useCallback } from 'react';
import type { SyncTask, ProviderType } from '../../types';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Tooltip,
} from '../ui';

// --- Mock data for task history ---
const MOCK_TASKS: SyncTask[] = [
  {
    id: 'task-001',
    type: 'full',
    provider: 'all',
    status: 'completed',
    progress: 100,
    startedAt: '2026-06-08T10:00:00Z',
    completedAt: '2026-06-08T10:05:23Z',
    error: null,
  },
  {
    id: 'task-002',
    type: 'incremental',
    provider: 'dnshe',
    status: 'completed',
    progress: 100,
    startedAt: '2026-06-08T14:30:00Z',
    completedAt: '2026-06-08T14:31:05Z',
    error: null,
  },
  {
    id: 'task-003',
    type: 'full',
    provider: 'dnsneko',
    status: 'failed',
    progress: 45,
    startedAt: '2026-06-08T18:00:00Z',
    completedAt: '2026-06-08T18:02:12Z',
    error: '连接超时: DNSNeko API 请求超时',
  },
  {
    id: 'task-004',
    type: 'incremental',
    provider: 'dnshe',
    status: 'completed',
    progress: 100,
    startedAt: '2026-06-07T09:15:00Z',
    completedAt: '2026-06-07T09:15:48Z',
    error: null,
  },
  {
    id: 'task-005',
    type: 'full',
    provider: 'all',
    status: 'completed',
    progress: 100,
    startedAt: '2026-06-06T08:00:00Z',
    completedAt: '2026-06-06T08:06:11Z',
    error: null,
  },
  {
    id: 'task-006',
    type: 'incremental',
    provider: 'dnsneko',
    status: 'completed',
    progress: 100,
    startedAt: '2026-06-05T12:00:00Z',
    completedAt: '2026-06-05T12:01:22Z',
    error: null,
  },
  {
    id: 'task-007',
    type: 'full',
    provider: 'all',
    status: 'failed',
    progress: 72,
    startedAt: '2026-06-04T16:00:00Z',
    completedAt: '2026-06-04T16:04:33Z',
    error: 'DNSHE API 认证失败: 无效的 API Key',
  },
];

function ProviderBadge({ provider }: { provider: ProviderType | 'all' }) {
  switch (provider) {
    case 'dnshe':
      return <Badge variant="default">DNSHE</Badge>;
    case 'dnsneko':
      return <Badge variant="secondary">DNSNeko</Badge>;
    case 'all':
      return <Badge variant="outline">全部</Badge>;
  }
}

function StatusBadge({ status }: { status: SyncTask['status'] }) {
  switch (status) {
    case 'queued':
      return <Badge variant="secondary">排队中</Badge>;
    case 'running':
      return (
        <Badge className="bg-blue-500 text-white border-transparent animate-pulse">
          执行中
        </Badge>
      );
    case 'completed':
      return <Badge variant="success">已完成</Badge>;
    case 'failed':
      return <Badge variant="destructive">失败</Badge>;
  }
}

function TaskTypeLabel({ type }: { type: SyncTask['type'] }) {
  return type === 'full' ? '全量同步' : '增量同步';
}

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN');
}

const PAGE_SIZE = 5;

export function SyncTasksPage() {
  const [tasks, setTasks] = useState<SyncTask[]>(MOCK_TASKS);
  const [page, setPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeTask = tasks.find((t) => t.status === 'running' || t.status === 'queued');
  const historyTasks = tasks.filter((t) => t.status !== 'running' && t.status !== 'queued');

  const totalPages = Math.max(1, Math.ceil(historyTasks.length / PAGE_SIZE));
  const paginatedTasks = historyTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [dropdownOpen]);

  // Cleanup all intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(clearInterval);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Simulated sync flow
  const startSync = useCallback((provider: ProviderType | 'all') => {
    setDropdownOpen(false);
    const newTask: SyncTask = {
      id: `task-${Date.now()}`,
      type: 'full',
      provider,
      status: 'queued',
      progress: 0,
      startedAt: null,
      completedAt: null,
      error: null,
    };
    setTasks((prev) => [newTask, ...prev]);

    const taskId = newTask.id;

    // After 1s, change to running
    const startTimeout = setTimeout(() => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task || task.status !== 'queued') return prev;
        return prev.map((t) =>
          t.id === taskId
            ? { ...t, status: 'running', startedAt: new Date().toISOString(), progress: 0 }
            : t
        );
      });

      // Animate progress from 0 to 100 over 5 seconds
      const progressInterval = setInterval(() => {
        setTasks((prev) => {
          const task = prev.find((t) => t.id === taskId);
          if (!task || task.status !== 'running') {
            clearInterval(progressInterval);
            intervalsRef.current = intervalsRef.current.filter((id) => id !== progressInterval);
            return prev;
          }
          const nextProgress = Math.min(task.progress + 5, 100);
          if (nextProgress >= 100) {
            clearInterval(progressInterval);
            intervalsRef.current = intervalsRef.current.filter((id) => id !== progressInterval);
            return prev.map((t) =>
              t.id === taskId
                ? { ...t, progress: 100, status: 'completed', completedAt: new Date().toISOString() }
                : t
            );
          }
          return prev.map((t) =>
            t.id === taskId ? { ...t, progress: nextProgress } : t
          );
        });
      }, 250);
      intervalsRef.current.push(progressInterval);

      // Safety: complete after 6s if interval didn't finish
      const safetyTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        intervalsRef.current = intervalsRef.current.filter((id) => id !== progressInterval);
        setTasks((prev) => {
          const task = prev.find((t) => t.id === taskId);
          if (task && task.status === 'running') {
            return prev.map((t) =>
              t.id === taskId
                ? { ...t, progress: 100, status: 'completed', completedAt: new Date().toISOString() }
                : t
            );
          }
          return prev;
        });
      }, 6000);
      timeoutsRef.current.push(safetyTimeout);
    }, 1000);
    timeoutsRef.current.push(startTimeout);
  }, []);

  const cancelTask = useCallback(() => {
    if (!activeTask) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTask.id
          ? { ...t, status: 'failed', error: '用户取消', completedAt: new Date().toISOString() }
          : t
      )
    );
  }, [activeTask]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">同步任务</h1>
          <p className="text-muted-foreground">管理域名数据同步</p>
        </div>
        <div className="relative" ref={dropdownRef}>
          <Button onClick={() => setDropdownOpen(!dropdownOpen)}>立即同步</Button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-40 rounded-lg border bg-card shadow-lg">
              <button
                type="button"
                className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent transition-colors rounded-t-lg"
                onClick={() => startSync('all')}
              >
                全量同步
              </button>
              <button
                type="button"
                className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => startSync('dnshe')}
              >
                DNSHE 同步
              </button>
              <button
                type="button"
                className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent transition-colors rounded-b-lg"
                onClick={() => startSync('dnsneko')}
              >
                DNSNeko 同步
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Task Card */}
      {activeTask && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">
                  <TaskTypeLabel type={activeTask.type} />
                </CardTitle>
                <ProviderBadge provider={activeTask.provider} />
                <StatusBadge status={activeTask.status} />
              </div>
              {activeTask.status === 'running' && (
                <Button variant="outline" size="sm" onClick={cancelTask}>
                  取消
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={activeTask.progress} label={`进度`} />
            {activeTask.startedAt && (
              <div className="text-sm text-muted-foreground">
                开始时间: {formatTime(activeTask.startedAt)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">任务历史</CardTitle>
        </CardHeader>
        <CardContent>
          {historyTasks.length === 0 ? (
            <EmptyState
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              title="暂无同步任务"
              description="点击「立即同步」按钮开始第一次同步"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务类型</TableHead>
                    <TableHead>平台</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>进度</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>完成时间</TableHead>
                    <TableHead>错误信息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <TaskTypeLabel type={task.type} />
                      </TableCell>
                      <TableCell>
                        <ProviderBadge provider={task.provider} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress
                            value={task.progress}
                            variant={
                              task.status === 'failed'
                                ? 'destructive'
                                : task.status === 'completed'
                                ? 'success'
                                : 'primary'
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatTime(task.startedAt)}</TableCell>
                      <TableCell className="text-sm">{formatTime(task.completedAt)}</TableCell>
                      <TableCell>
                        {task.error ? (
                          <Tooltip content={task.error} placement="left">
                            <span className="inline-flex items-center gap-1 text-sm text-destructive cursor-help">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              查看
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    共 {historyTasks.length} 条记录
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      上一页
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
