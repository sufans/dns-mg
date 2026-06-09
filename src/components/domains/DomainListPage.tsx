import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  Search,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  RotateCcw,
  Trash2,
  X,
  Globe,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';

import type { UnifiedDomain } from '../../types';
import { mockDomains } from '../../lib/mock-data';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';
import { Select } from '../ui/select';
import { EmptyState } from '../ui/empty-state';
import { ConfirmDialog } from '../ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { useIsMobile } from '../../hooks';

// ── Helpers ──────────────────────────────────────────────────────────

function statusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'suspended':
      return 'warning' as const;
    case 'expired':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'active':
      return '活跃';
    case 'suspended':
      return '已暂停';
    case 'expired':
      return '已过期';
    default:
      return '未知';
  }
}

function providerLabel(provider: string) {
  return provider === 'dnshe' ? 'DNSHE' : 'DNSNeko';
}

function providerVariant(provider: string) {
  return provider === 'dnshe' ? 'default' : 'secondary';
}

function isNearExpiry(expireTime: string | null): boolean {
  if (!expireTime) return false;
  const diff = differenceInDays(parseISO(expireTime), new Date());
  return diff >= 0 && diff <= 30;
}

function isExpired(expireTime: string | null): boolean {
  if (!expireTime) return false;
  return differenceInDays(parseISO(expireTime), new Date()) < 0;
}

function formatExpiry(expireTime: string | null) {
  if (!expireTime) return '-';
  return format(parseISO(expireTime), 'yyyy-MM-dd');
}

function expiryHighlight(expireTime: string | null) {
  if (!expireTime) return '';
  if (isExpired(expireTime)) return 'text-red-500 dark:text-red-400 font-semibold';
  if (isNearExpiry(expireTime)) return 'text-amber-500 dark:text-amber-400 font-semibold';
  return '';
}

function expiryTag(expireTime: string | null) {
  if (!expireTime) return null;
  if (isExpired(expireTime)) return <Badge variant="destructive" className="ml-2 text-[10px]">已过期</Badge>;
  const diff = differenceInDays(parseISO(expireTime), new Date());
  if (diff <= 7) return <Badge variant="warning" className="ml-2 text-[10px]">{diff}天后到期</Badge>;
  if (diff <= 30) return <Badge variant="warning" className="ml-2 text-[10px]">即将到期</Badge>;
  return null;
}

// ── CSV Export ───────────────────────────────────────────────────────

function exportCSV(domains: UnifiedDomain[]) {
  const header = '域名,平台,状态,到期时间,记录数';
  const rows = domains.map((d) =>
    [d.name, providerLabel(d.provider), statusLabel(d.status), formatExpiry(d.expireTime), d.recordCount].join(',')
  );
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `domains_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Column Definitions ───────────────────────────────────────────────

function getColumns(
  onSelectDomain: (domain: UnifiedDomain) => void,
  onRenew: (domain: UnifiedDomain) => void,
  onDelete: (domain: UnifiedDomain) => void
): ColumnDef<UnifiedDomain>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          aria-label="全选"
          className="h-4 w-4 rounded border-input accent-primary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          aria-label="选择行"
          className="h-4 w-4 rounded border-input accent-primary"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'name',
      header: '域名',
      cell: ({ row }) => (
        <button
          type="button"
          className="text-primary hover:underline font-medium text-left"
          onClick={() => onSelectDomain(row.original)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'provider',
      header: '平台',
      cell: ({ row }) => (
        <Badge
          variant={providerVariant(row.original.provider)}
          className={cn(
            'font-mono text-xs',
            row.original.provider === 'dnshe' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
            row.original.provider === 'dnsneko' && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-transparent'
          )}
        >
          {providerLabel(row.original.provider)}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || filterValue === 'all') return true;
        return row.original.provider === filterValue;
      },
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || filterValue === 'all') return true;
        return row.original.status === filterValue;
      },
    },
    {
      accessorKey: 'expireTime',
      header: '到期时间',
      cell: ({ row }) => (
        <span className="inline-flex items-center">
          <span className={expiryHighlight(row.original.expireTime)}>
            {formatExpiry(row.original.expireTime)}
          </span>
          {expiryTag(row.original.expireTime)}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.expireTime;
        const b = rowB.original.expireTime;
        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b);
      },
    },
    {
      accessorKey: 'recordCount',
      header: '记录数',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.recordCount}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const domain = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectDomain(domain)}
              title="查看记录"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {domain.provider === 'dnshe' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRenew(domain)}
                title="续期"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(domain)}
              title="删除"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}

// ── Domain Detail Drawer ─────────────────────────────────────────────

function DomainDetailDrawer({
  domain,
  open,
  onOpenChange,
}: {
  domain: UnifiedDomain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  if (!domain) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {domain.name}
          </DialogTitle>
          <DialogDescription>域名详细信息</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm mt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">平台</span>
            <Badge
              className={cn(
                'font-mono text-xs',
                domain.provider === 'dnshe' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
                domain.provider === 'dnsneko' && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-transparent'
              )}
            >
              {providerLabel(domain.provider)}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">状态</span>
            <Badge variant={statusVariant(domain.status)}>
              {statusLabel(domain.status)}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">创建时间</span>
            <span>{domain.createdAt ? format(parseISO(domain.createdAt), 'yyyy-MM-dd') : '-'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">到期时间</span>
            <span className={cn('inline-flex items-center', expiryHighlight(domain.expireTime))}>
              {formatExpiry(domain.expireTime)}
              {expiryTag(domain.expireTime)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">根域名</span>
            <span>{domain.rootDomain || '-'}</span>
          </div>

          {domain.userRemark && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">备注</span>
              <span>{domain.userRemark}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">记录数</span>
            <span className="tabular-nums">{domain.recordCount}</span>
          </div>

          {/* Provider-specific fields */}
          {domain.provider === 'dnshe' && (
            <>
              <div className="border-t pt-3 mt-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">DNSHE 专属</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subdomain ID</span>
                <span className="font-mono">{domain.subdomainId ?? '-'}</span>
              </div>
            </>
          )}

          {domain.provider === 'dnsneko' && (
            <>
              <div className="border-t pt-3 mt-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">DNSNeko 专属</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Domain ID</span>
                <span className="font-mono">{domain.domainId ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">允许操作</span>
                <Badge variant={domain.allowOperation ? 'success' : 'secondary'}>
                  {domain.allowOperation ? '是' : '否'}
                </Badge>
              </div>
              {domain.registerDuration != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">注册时长</span>
                  <span>{domain.registerDuration} 天</span>
                </div>
              )}
              {domain.renewDays != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">续期天数</span>
                  <span>{domain.renewDays} 天</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              navigate(`/domains/${domain.id}/records`);
            }}
          >
            查看 DNS 记录
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sort Icon ────────────────────────────────────────────────────────

function SortIcon({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sort = column.getIsSorted();
  if (sort === 'asc') return <ChevronUp className="ml-1 h-4 w-4" />;
  if (sort === 'desc') return <ChevronDown className="ml-1 h-4 w-4" />;
  return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-40" />;
}

// ── Card View Item ───────────────────────────────────────────────────

function DomainCard({
  domain,
  onSelect,
  onRenew,
  onDelete,
}: {
  domain: UnifiedDomain;
  onSelect: (d: UnifiedDomain) => void;
  onRenew: (d: UnifiedDomain) => void;
  onDelete: (d: UnifiedDomain) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-primary hover:underline font-medium text-left"
            onClick={() => onSelect(domain)}
          >
            {domain.name}
          </button>
          <Badge variant={statusVariant(domain.status)}>
            {statusLabel(domain.status)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={providerVariant(domain.provider)}
            className={cn(
              'font-mono text-xs',
              domain.provider === 'dnshe' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
              domain.provider === 'dnsneko' && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-transparent'
            )}
          >
            {providerLabel(domain.provider)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {domain.recordCount} 条记录
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">到期: </span>
            <span className={cn('text-xs', expiryHighlight(domain.expireTime))}>
              {formatExpiry(domain.expireTime)}
            </span>
            {expiryTag(domain.expireTime)}
          </div>
        </div>
        <div className="flex items-center gap-1 pt-1 border-t">
          <Button variant="ghost" size="sm" onClick={() => onSelect(domain)} title="查看记录">
            <Eye className="h-4 w-4" />
          </Button>
          {domain.provider === 'dnshe' && (
            <Button variant="ghost" size="sm" onClick={() => onRenew(domain)} title="续期">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(domain)}
            title="删除"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function DomainListPage() {
  const data = React.useMemo(() => mockDomains, []);
  const isMobile = useIsMobile();

  // State
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [providerFilter, setProviderFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [expiryFilter, setExpiryFilter] = React.useState('all');
  const [cardView, setCardView] = React.useState(false);

  // Detail drawer
  const [detailDomain, setDetailDomain] = React.useState<UnifiedDomain | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Confirm dialogs
  const [renewDomain, setRenewDomain] = React.useState<UnifiedDomain | null>(null);
  const [deleteDomain, setDeleteDomain] = React.useState<UnifiedDomain | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  // Column defs
  const columns = React.useMemo(
    () =>
      getColumns(
        (d) => { setDetailDomain(d); setDetailOpen(true); },
        (d) => setRenewDomain(d),
        (d) => setDeleteDomain(d)
      ),
    []
  );

  // Table instance
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableGlobalFilter: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue).toLowerCase();
      return row.original.name.toLowerCase().includes(search);
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // Apply provider & status column filters
  React.useEffect(() => {
    const providerCol = table.getColumn('provider');
    providerCol?.setFilterValue(providerFilter);
  }, [providerFilter, table]);

  React.useEffect(() => {
    const statusCol = table.getColumn('status');
    statusCol?.setFilterValue(statusFilter);
  }, [statusFilter, table]);

  // Expiry filter (applied as a custom row filter via global filter refinement)
  const filteredRows = React.useMemo(() => {
    let rows = table.getFilteredRowModel().rows;
    if (expiryFilter !== 'all') {
      rows = rows.filter((row) => {
        const exp = row.original.expireTime;
        if (!exp) return false;
        const diff = differenceInDays(parseISO(exp), new Date());
        switch (expiryFilter) {
          case '7days': return diff >= 0 && diff <= 7;
          case '30days': return diff >= 0 && diff <= 30;
          case 'expired': return diff < 0;
          default: return true;
        }
      });
    }
    return rows;
  }, [table, expiryFilter]);

  // Paginate manually over the expiry-filtered rows
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const paginatedRows = filteredRows.slice(
    safePageIndex * pageSize,
    (safePageIndex + 1) * pageSize
  );

  // Selection helpers
  const selectedCount = Object.keys(rowSelection).length;
  const hasFilters = globalFilter || providerFilter !== 'all' || statusFilter !== 'all' || expiryFilter !== 'all';

  function clearFilters() {
    setGlobalFilter('');
    setProviderFilter('all');
    setStatusFilter('all');
    setExpiryFilter('all');
  }

  // CSV export of filtered data
  function handleExport() {
    const exportData = filteredRows.map((r) => r.original);
    exportCSV(exportData);
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-[1400px] mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">域名管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {data.length} 个域名
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Card view toggle - only on mobile */}
          {isMobile && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCardView(!cardView)}
              title={cardView ? '表格视图' : '卡片视图'}
            >
              {cardView ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
          )}
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            同步域名
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">导出 CSV</span>
            <span className="sm:hidden">导出</span>
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索域名..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-[140px]">
              <Select
                options={[
                  { value: 'all', label: '全部平台' },
                  { value: 'dnshe', label: 'DNSHE' },
                  { value: 'dnsneko', label: 'DNSNeko' },
                ]}
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[140px]">
              <Select
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'active', label: '活跃' },
                  { value: 'suspended', label: '已暂停' },
                  { value: 'expired', label: '已过期' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[160px]">
              <Select
                options={[
                  { value: 'all', label: '全部到期' },
                  { value: '7days', label: '7天内到期' },
                  { value: '30days', label: '30天内到期' },
                  { value: 'expired', label: '已过期' },
                ]}
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                清除筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Bulk Actions ────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            已选择 <strong className="text-foreground">{selectedCount}</strong> 项
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            批量删除
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
          >
            取消选择
          </Button>
        </div>
      )}

      {/* ── Table / Card View ───────────────────────────────── */}
      {isMobile && cardView ? (
        // Card view for mobile
        totalFiltered === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={<Filter className="h-10 w-10" />}
                title="没有找到域名"
                description="尝试调整筛选条件或搜索关键词"
                actionLabel="清除筛选"
                onAction={clearFilters}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1">
            {paginatedRows.map((row) => (
              <DomainCard
                key={row.id}
                domain={row.original}
                onSelect={(d) => { setDetailDomain(d); setDetailOpen(true); }}
                onRenew={(d) => setRenewDomain(d)}
                onDelete={(d) => setDeleteDomain(d)}
              />
            ))}
          </div>
        )
      ) : (
        // Table view
        <Card>
          <CardContent className="p-0">
            {totalFiltered === 0 ? (
              <EmptyState
                icon={<Filter className="h-10 w-10" />}
                title="没有找到域名"
                description="尝试调整筛选条件或搜索关键词"
                actionLabel="清除筛选"
                onAction={clearFilters}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                            className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center">
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && <SortIcon column={header.column} />}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((row) => (
                      <TableRow key={row.id} className={row.getIsSelected() ? 'bg-primary/5' : ''}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {totalFiltered > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            显示 {safePageIndex * pageSize + 1}-{Math.min((safePageIndex + 1) * pageSize, totalFiltered)} / 共 {totalFiltered} 条
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Select
                options={[
                  { value: '10', label: '10 条/页' },
                  { value: '20', label: '20 条/页' },
                  { value: '50', label: '50 条/页' },
                ]}
                value={String(pageSize)}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-1">
              {/* Desktop: full pagination with first/last */}
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                disabled={safePageIndex === 0}
                onClick={() => table.setPageIndex(0)}
              >
                首页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePageIndex === 0}
                onClick={() => table.setPageIndex(safePageIndex - 1)}
              >
                上一页
              </Button>
              <span className="px-3 text-sm tabular-nums">
                {safePageIndex + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => table.setPageIndex(safePageIndex + 1)}
              >
                下一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => table.setPageIndex(totalPages - 1)}
              >
                末页
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Domain Detail Drawer ────────────────────────────── */}
      <DomainDetailDrawer
        domain={detailDomain}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* ── Renew Confirm ───────────────────────────────────── */}
      <ConfirmDialog
        open={!!renewDomain}
        onOpenChange={(open) => { if (!open) setRenewDomain(null); }}
        title="确认续期"
        description={`确定要续期域名「${renewDomain?.name}」吗？`}
        confirmText="确认续期"
        onConfirm={() => { setRenewDomain(null); }}
      />

      {/* ── Delete Confirm ──────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteDomain}
        onOpenChange={(open) => { if (!open) setDeleteDomain(null); }}
        title="确认删除"
        description={`确定要删除域名「${deleteDomain?.name}」吗？此操作不可撤销。`}
        confirmText="确认删除"
        onConfirm={() => { setDeleteDomain(null); }}
      />

      {/* ── Bulk Delete Confirm ─────────────────────────────── */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="批量删除"
        description={`确定要删除选中的 ${selectedCount} 个域名吗？此操作不可撤销。`}
        confirmText="确认删除"
        onConfirm={() => { setRowSelection({}); setBulkDeleteOpen(false); }}
      />
    </div>
  );
}
