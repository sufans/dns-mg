import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AddRecordDialog,
  EditRecordDialog,
  DeleteRecordDialog,
  type RecordFormData,
} from '@/components/domains/RecordDialog';
import { useDomainDetail } from '@/hooks/useDomains';
import { useAccounts } from '@/hooks/useAccounts';
import {
  useRecords,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useToggleRecordStatus,
  useBatchOperation,
} from '@/hooks/useRecords';
import type { Domain, DnsRecord } from '@/types';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysRemaining(expireTime?: string): number | null {
  if (!expireTime) return null;
  const expiry = new Date(expireTime).getTime();
  const now = Date.now();
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

function getDomainStatus(domain: Domain): 'active' | 'expired' | 'suspended' {
  if (domain.expired) return 'expired';
  if (domain.status === 'suspended') return 'suspended';
  const days = getDaysRemaining(domain.expireTime);
  if (days !== null && days <= 0) return 'expired';
  return 'active';
}

function getPlatformBadge(platform: string) {
  if (platform === 'dnshe') {
    return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">DNSHE</Badge>;
  }
  return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20">DNSNEKO</Badge>;
}

function getStatusBadge(status: 'active' | 'expired' | 'suspended') {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">活跃</Badge>;
    case 'expired':
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/20">已过期</Badge>;
    case 'suspended':
      return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20">已暂停</Badge>;
  }
}

function getRecordStatusBadge(status: string | number) {
  if (status === 'active' || status === 1) {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">启用</Badge>;
  }
  return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/20">暂停</Badge>;
}

function getExpiryCountdown(expireTime?: string): string {
  const days = getDaysRemaining(expireTime);
  if (days === null) return '-';
  if (days <= 0) return `已过期 ${Math.abs(days)} 天`;
  if (days <= 30) return `${days} 天后到期`;
  return `${days} 天`;
}

function getExpiryColor(expireTime?: string): string {
  const days = getDaysRemaining(expireTime);
  if (days === null) return 'text-muted-foreground';
  if (days <= 0) return 'text-red-500 font-medium';
  if (days <= 7) return 'text-red-400 font-medium';
  if (days <= 30) return 'text-amber-400 font-medium';
  return 'text-foreground';
}

export function DomainDetailPage() {
  const { accountId, domainId } = useParams<{ accountId: string; domainId: string }>();
  const navigate = useNavigate();

  // Data
  const { data: domain, isLoading: domainLoading } = useDomainDetail(accountId!, domainId!);
  const { data: records, isLoading: recordsLoading } = useRecords(accountId!, domainId!);
  const { data: accounts } = useAccounts();

  const unifiedDomain = domain;
  const unifiedRecords = records || [];

  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const platform = unifiedDomain?.platform || 'dnshe';
  const isDnsneko = platform === 'dnsneko';

  // Mutations
  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const toggleStatus = useToggleRecordStatus();
  const batchOp = useBatchOperation();

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DnsRecord | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch operation states
  const [batchTtlValue, setBatchTtlValue] = useState(600);
  const [batchLineValue, setBatchLineValue] = useState('default');

  const isLoading = domainLoading || recordsLoading;

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === unifiedRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unifiedRecords.map((r) => r.id)));
    }
  }, [selectedIds.size, unifiedRecords]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Record CRUD handlers
  const handleAddRecord = useCallback(
    async (data: RecordFormData) => {
      try {
        await createRecord.mutateAsync({
          accountId: accountId!,
          domainId: domainId!,
          name: data.name,
          type: data.type,
          value: data.value,
          ttl: data.ttl,
          priority: data.priority || undefined,
          line: data.line || undefined,
          remark: data.remark || undefined,
        });
        toast.success('记录添加成功');
        setAddDialogOpen(false);
      } catch {
        toast.error('记录添加失败');
      }
    },
    [accountId, domainId, createRecord]
  );

  const handleEditRecord = useCallback(
    async (data: RecordFormData) => {
      if (!editingRecord) return;
      try {
        await updateRecord.mutateAsync({
          accountId: accountId!,
          domainId: domainId!,
          recordId: editingRecord.id,
          name: data.name,
          type: data.type,
          value: data.value,
          ttl: data.ttl,
          priority: data.priority || undefined,
          line: data.line || undefined,
          remark: data.remark || undefined,
        });
        toast.success('记录更新成功');
        setEditDialogOpen(false);
        setEditingRecord(null);
      } catch {
        toast.error('记录更新失败');
      }
    },
    [accountId, domainId, editingRecord, updateRecord]
  );

  const handleDeleteRecord = useCallback(async () => {
    if (!deletingRecord) return;
    try {
      await deleteRecord.mutateAsync({
        accountId: accountId!,
        domainId: domainId!,
        recordId: deletingRecord.id,
      });
      toast.success('记录删除成功');
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
    } catch {
      toast.error('记录删除失败');
    }
  }, [accountId, domainId, deletingRecord, deleteRecord]);

  const handleToggleStatus = useCallback(
    async (record: DnsRecord) => {
      try {
        await toggleStatus.mutateAsync({
          accountId: accountId!,
          domainId: domainId!,
          recordId: record.id,
        });
        toast.success('状态切换成功');
      } catch {
        toast.error('状态切换失败');
      }
    },
    [accountId, domainId, toggleStatus]
  );

  // Batch operations
  const handleBatchEnable = useCallback(async () => {
    try {
      await batchOp.mutateAsync({
        accountId: accountId!,
        domainId: domainId!,
        operation: 'enable',
        recordIds: Array.from(selectedIds),
      });
      toast.success('批量启用成功');
      clearSelection();
    } catch {
      toast.error('批量启用失败');
    }
  }, [accountId, domainId, selectedIds, batchOp, clearSelection]);

  const handleBatchDisable = useCallback(async () => {
    try {
      await batchOp.mutateAsync({
        accountId: accountId!,
        domainId: domainId!,
        operation: 'disable',
        recordIds: Array.from(selectedIds),
      });
      toast.success('批量暂停成功');
      clearSelection();
    } catch {
      toast.error('批量暂停失败');
    }
  }, [accountId, domainId, selectedIds, batchOp, clearSelection]);

  const handleBatchDelete = useCallback(async () => {
    try {
      await batchOp.mutateAsync({
        accountId: accountId!,
        domainId: domainId!,
        operation: 'delete',
        recordIds: Array.from(selectedIds),
      });
      toast.success('批量删除成功');
      clearSelection();
    } catch {
      toast.error('批量删除失败');
    }
  }, [accountId, domainId, selectedIds, batchOp, clearSelection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!unifiedDomain) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">域名不存在或加载失败</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/domains')}>
            返回域名列表
          </Button>
        </div>
      </div>
    );
  }

  const domainStatus = getDomainStatus(unifiedDomain);

  return (
    <div className="space-y-6">
      {/* Back button & title */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/domains')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">{unifiedDomain.domain}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">域名详情与解析记录管理</p>
        </div>
      </div>

      {/* Domain Info Card */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-lg">{unifiedDomain.domain}</span>
            {getPlatformBadge(platform)}
            {getStatusBadge(domainStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">API 账号</p>
              <p className="text-sm font-medium">{accountsMap.get(unifiedDomain.accountId) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">注册时间</p>
              <p className="text-sm">{formatDate(unifiedDomain.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">到期时间</p>
              <p className="text-sm">{formatDate(unifiedDomain.expireTime)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">到期倒计时</p>
              <p className={`text-sm ${getExpiryColor(unifiedDomain.expireTime)}`}>
                {getExpiryCountdown(unifiedDomain.expireTime)}
              </p>
            </div>
            {unifiedDomain.rootDomain && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">根域名</p>
                <p className="text-sm">{unifiedDomain.rootDomain}</p>
              </div>
            )}
            {unifiedDomain.userRemark && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">备注</p>
                <p className="text-sm">{unifiedDomain.userRemark}</p>
              </div>
            )}
            {unifiedDomain.recordCount != null && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">记录数</p>
                <p className="text-sm">{unifiedDomain.recordCount}</p>
              </div>
            )}
            {unifiedDomain.notice && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">通知</p>
                <p className="text-sm">{unifiedDomain.notice}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DNS Records Section */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>DNS 解析记录</CardTitle>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="size-4" />
              添加记录
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Batch Operations Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-700/20">
              <span className="text-sm text-muted-foreground">
                已选择 {selectedIds.size} 条记录
              </span>
              {isDnsneko ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleBatchEnable} disabled={batchOp.isPending}>
                    批量启用
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBatchDisable} disabled={batchOp.isPending}>
                    批量暂停
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBatchDelete} disabled={batchOp.isPending}>
                    批量删除
                  </Button>
                  <div className="flex items-center gap-2 ml-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">批量改TTL:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={batchTtlValue}
                      onChange={(e) => setBatchTtlValue(Number(e.target.value))}
                      className="w-20 h-7 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={batchOp.isPending}
                      onClick={async () => {
                        try {
                          await batchOp.mutateAsync({
                            accountId: accountId!,
                            domainId: domainId!,
                            operation: 'ttl' as const,
                            recordIds: Array.from(selectedIds),
                            ttl: batchTtlValue,
                          });
                          toast.success('批量修改TTL成功');
                          clearSelection();
                        } catch {
                          toast.error('批量修改TTL失败');
                        }
                      }}
                    >
                      应用
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">批量改线路:</Label>
                    <Input
                      value={batchLineValue}
                      onChange={(e) => setBatchLineValue(e.target.value)}
                      className="w-24 h-7 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={batchOp.isPending}
                      onClick={async () => {
                        try {
                          await batchOp.mutateAsync({
                            accountId: accountId!,
                            domainId: domainId!,
                            operation: 'line' as const,
                            recordIds: Array.from(selectedIds),
                            line: batchLineValue,
                          });
                          toast.success('批量修改线路成功');
                          clearSelection();
                        } catch {
                          toast.error('批量修改线路失败');
                        }
                      }}
                    >
                      应用
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-amber-400">
                  <Info className="size-4" />
                  <span className="text-xs">DNSHE 不支持批量操作</span>
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto">
                取消选择
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={unifiedRecords.length > 0 && selectedIds.size === unifiedRecords.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>主机记录</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>记录值</TableHead>
                <TableHead>线路</TableHead>
                <TableHead>TTL</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    暂无解析记录
                  </TableCell>
                </TableRow>
              ) : (
                unifiedRecords.map((record) => (
                  <TableRow
                    key={record.id}
                    className={`border-slate-700/30 hover:bg-slate-700/30 ${
                      selectedIds.has(record.id) ? 'bg-slate-700/20' : ''
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => toggleSelect(record.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {record.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={record.value}>
                      {record.value}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.line || 'default'}</TableCell>
                    <TableCell className="text-muted-foreground">{record.ttl}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.priority != null ? record.priority : '-'}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleStatus(record)}
                        className="cursor-pointer"
                        title="点击切换状态"
                      >
                        {getRecordStatusBadge(record.status)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setEditingRecord(record);
                            setEditDialogOpen(true);
                          }}
                          title="编辑"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setDeletingRecord(record);
                            setDeleteDialogOpen(true);
                          }}
                          title="删除"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddRecordDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddRecord}
        loading={createRecord.isPending}
      />
      <EditRecordDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        record={editingRecord}
        onSubmit={handleEditRecord}
        loading={updateRecord.isPending}
      />
      <DeleteRecordDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        record={deletingRecord}
        onConfirm={handleDeleteRecord}
        loading={deleteRecord.isPending}
      />
    </div>
  );
}
