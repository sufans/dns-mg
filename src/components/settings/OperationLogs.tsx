import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useOperationLogs, useCleanupLogs, type LogFilters } from '@/hooks/useSettings';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

const ACTION_TYPES = [
  { value: '', label: '全部操作' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'import', label: '导入' },
  { value: 'export', label: '导出' },
  { value: 'backup', label: '备份' },
  { value: 'restore', label: '恢复' },
];

const TARGET_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'account', label: 'API 账号' },
  { value: 'domain', label: '域名' },
  { value: 'record', label: 'DNS 记录' },
  { value: 'group', label: '分组' },
  { value: 'system', label: '系统' },
];

const RETENTION_OPTIONS = [
  { value: 30, label: '30 天' },
  { value: 60, label: '60 天' },
  { value: 90, label: '90 天' },
  { value: 180, label: '180 天' },
  { value: 365, label: '365 天' },
];

const PAGE_SIZE = 15;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getSettingValue(settings: Record<string, unknown> | undefined, key: string, fallback: string): string {
  if (!settings) return fallback;
  const val = settings[key];
  return typeof val === 'string' ? val : String(val ?? fallback);
}

export function OperationLogs() {
  const [filters, setFilters] = useState<LogFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);

  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data, isLoading } = useOperationLogs(filters);
  const cleanupLogs = useCleanupLogs();

  const currentRetention = Number(getSettingValue(settings, 'log_retention_days', '90'));

  useEffect(() => {
    setRetentionDays(currentRetention);
  }, [currentRetention]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setFilters((prev) => ({ ...prev }));
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchInput || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: 1,
    }));
  }, [searchInput, startDate, endDate]);

  const handleCleanup = useCallback(async () => {
    try {
      const result = await cleanupLogs.mutateAsync(retentionDays);
      toast.success(`已清理 ${result.deleted} 条日志`);
      setCleanupConfirmOpen(false);
      setFilters((prev) => ({ ...prev, page: 1 }));
    } catch {
      toast.error('清理日志失败');
    }
  }, [retentionDays, cleanupLogs]);

  const handleSaveRetention = useCallback(async () => {
    try {
      await updateSettings.mutateAsync({ log_retention_days: String(retentionDays) });
      toast.success('日志保留策略已保存');
    } catch {
      toast.error('保存失败');
    }
  }, [retentionDays, updateSettings]);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = data?.page ?? 1;

  const estimatedSizeKB = Math.round((total * 0.5));

  return (
    <div className="space-y-6">
      {/* Log Retention Configuration (14.5) */}
      <Card className="bg-slate-800/50 border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-foreground">日志保留配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground whitespace-nowrap">保留期限</Label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="h-8 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {RETENTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>当前日志数: <span className="text-foreground font-medium">{total}</span></span>
              <span>预估占用: <span className="text-foreground font-medium">~{estimatedSizeKB} KB</span></span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveRetention}
              disabled={updateSettings.isPending}
              className="ml-auto"
            >
              {updateSettings.isPending && <Loader2 className="size-3.5 animate-spin" />}
              保存策略
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCleanupConfirmOpen(true)}
            >
              <Trash2 className="size-3.5" />
              立即清理
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Operation Logs (14.1) */}
      <Card className="bg-slate-800/50 border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-foreground">操作日志</CardTitle>
          <CardAction>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-input accent-accent-indigo"
                />
                自动刷新
              </Label>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setFilters((prev) => ({ ...prev }))}
                className="text-muted-foreground"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">开始日期</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-[150px] bg-input/30 border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">结束日期</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-[150px] bg-input/30 border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">操作类型</Label>
              <select
                value={filters.action || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    action: e.target.value || undefined,
                    page: 1,
                  }))
                }
                className="h-8 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ACTION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">目标类型</Label>
              <select
                value={filters.targetType || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    targetType: e.target.value || undefined,
                    page: 1,
                  }))
                }
                className="h-8 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {TARGET_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">搜索</Label>
              <div className="relative">
                <Input
                  placeholder="搜索详情..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-8 w-[180px] pl-8 bg-input/30 border-input text-sm"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleSearch}>
              查询
            </Button>
          </div>

          {/* Log table */}
          <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-slate-900/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">时间</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">操作类型</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">目标类型</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">目标ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">详情</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">IP 地址</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">状态</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                      <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                      加载中...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                      暂无日志记录
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-foreground">
                        {log.action}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-foreground">
                        {log.targetType}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {log.targetId ?? '-'}
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px] truncate text-muted-foreground" title={log.detail ?? ''}>
                        {log.detail ?? '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {log.ipAddress}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Badge
                          variant={log.status === 'success' ? 'default' : 'destructive'}
                          className={
                            log.status === 'success'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                              : ''
                          }
                        >
                          {log.status === 'success' ? '成功' : '失败'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {total} 条记录，第 {currentPage}/{totalPages} 页
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: currentPage - 1 }))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      size="icon-sm"
                      variant={page === currentPage ? 'default' : 'outline'}
                      onClick={() => setFilters((prev) => ({ ...prev, page }))}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: currentPage + 1 }))}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Confirmation Dialog */}
      <Dialog open={cleanupConfirmOpen} onOpenChange={setCleanupConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              确认清理日志
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              此操作将删除超过 {retentionDays} 天的日志记录，且不可恢复。确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleanupLogs.isPending}
            >
              {cleanupLogs.isPending && <Loader2 className="size-3.5 animate-spin" />}
              确认清理
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
