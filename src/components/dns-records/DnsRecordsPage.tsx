import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  type VisibilityState,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Settings2,
  X,
  Plus,
  Trash2,
  Clock,
  Route,
  ToggleLeft,
  Info,
  FileText,
  LayoutGrid,
  List,
} from 'lucide-react';

import type { UnifiedDnsRecord, UnifiedDomain } from '../../types';
import { mockRecords, mockDomains } from '../../lib/mock-data';
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
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Tooltip } from '../ui/tooltip';
import { useIsMobile } from '../../hooks';

// ── Helpers ──────────────────────────────────────────────────────────

function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) {
    const mins = seconds / 60;
    return mins % 1 === 0 ? `${mins}分钟` : `${mins.toFixed(1)}分钟`;
  }
  if (seconds < 86400) {
    const hours = seconds / 3600;
    return hours % 1 === 0 ? `${hours}小时` : `${hours.toFixed(1)}小时`;
  }
  const days = seconds / 86400;
  return days % 1 === 0 ? `${days}天` : `${days.toFixed(1)}天`;
}

const RECORD_TYPE_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
  AAAA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-transparent',
  CNAME: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-transparent',
  MX: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-transparent',
  TXT: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border-transparent',
  NS: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-transparent',
  SRV: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-transparent',
  CAA: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-transparent',
};

function providerLabel(provider: string) {
  return provider === 'dnshe' ? 'DNSHE' : 'DNSNeko';
}

const TTL_OPTIONS = [
  { value: '600', label: '10分钟' },
  { value: '1800', label: '30分钟' },
  { value: '3600', label: '1小时' },
  { value: '14400', label: '4小时' },
  { value: '86400', label: '1天' },
];

const LINE_OPTIONS = [
  { value: '默认', label: '默认' },
  { value: 'telecom', label: 'telecom' },
  { value: 'unicom', label: 'unicom' },
  { value: 'mobile', label: 'mobile' },
];

const TYPE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'AAAA', label: 'AAAA' },
  { value: 'CNAME', label: 'CNAME' },
  { value: 'MX', label: 'MX' },
  { value: 'TXT', label: 'TXT' },
  { value: 'NS', label: 'NS' },
  { value: 'SRV', label: 'SRV' },
  { value: 'CAA', label: 'CAA' },
];

const TYPE_PLACEHOLDER: Record<string, string> = {
  A: '例如: 192.168.1.1',
  AAAA: '例如: 2001:db8::1',
  CNAME: '例如: example.com',
  MX: '例如: mail.example.com',
  TXT: '例如: v=spf1 include:_spf.example.com ~all',
  NS: '例如: ns1.example.com',
  SRV: '例如: 10 60 5060 server.example.com',
  CAA: '例如: 0 issue "letsencrypt.org"',
};

// ── Sort Icon ────────────────────────────────────────────────────────

function SortIcon({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sort = column.getIsSorted();
  if (sort === 'asc') return <ChevronUp className="ml-1 h-4 w-4" />;
  if (sort === 'desc') return <ChevronDown className="ml-1 h-4 w-4" />;
  return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-40" />;
}

// ── Record Form Dialog ───────────────────────────────────────────────

interface RecordFormData {
  name: string;
  type: string;
  value: string;
  line: string;
  ttl: string;
  priority: string;
  remark: string;
}

const emptyForm: RecordFormData = {
  name: '',
  type: 'A',
  value: '',
  line: '默认',
  ttl: '600',
  priority: '',
  remark: '',
};

function RecordFormDialog({
  open,
  onOpenChange,
  record,
  provider,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: UnifiedDnsRecord | null;
  provider: ProviderType;
  onSubmit: (data: RecordFormData) => void;
}) {
  const isEdit = !!record;
  const [form, setForm] = React.useState<RecordFormData>(emptyForm);
  const [errors, setErrors] = React.useState<Partial<RecordFormData>>({});

  React.useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          name: record.name,
          type: record.type,
          value: record.value,
          line: record.line,
          ttl: String(record.ttl),
          priority: record.priority != null ? String(record.priority) : '',
          remark: record.remark || '',
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [open, record]);

  function validate(): boolean {
    const newErrors: Partial<RecordFormData> = {};
    if (!form.name.trim()) newErrors.name = '主机记录不能为空';
    if (!form.type) newErrors.type = '请选择记录类型';
    if (!form.value.trim()) newErrors.value = '记录值不能为空';
    if (provider === 'dnsneko' && !form.line) newErrors.line = '请选择解析线路';
    if ((form.type === 'MX' || form.type === 'SRV') && !form.priority.trim()) {
      newErrors.priority = '优先级不能为空';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(form);
    onOpenChange(false);
  }

  const showPriority = form.type === 'MX' || form.type === 'SRV';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑 DNS 记录' : '添加 DNS 记录'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改 DNS 记录信息' : '为当前域名添加新的 DNS 记录'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">主机记录</label>
            <Input
              placeholder="@ 或 www"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          <Select
            label="记录类型"
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium">记录值</label>
            <Input
              placeholder={TYPE_PLACEHOLDER[form.type] || ''}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              error={!!errors.value}
            />
            {errors.value && <p className="mt-1 text-xs text-destructive">{errors.value}</p>}
          </div>

          <Select
            label="解析线路"
            options={LINE_OPTIONS}
            value={form.line}
            onChange={(e) => setForm({ ...form, line: e.target.value })}
          />

          <Select
            label="TTL"
            options={TTL_OPTIONS}
            value={form.ttl}
            onChange={(e) => setForm({ ...form, ttl: e.target.value })}
          />

          {showPriority && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">优先级</label>
              <Input
                type="number"
                placeholder="例如: 10"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                error={!!errors.priority}
              />
              {errors.priority && <p className="mt-1 text-xs text-destructive">{errors.priority}</p>}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">备注（可选）</label>
            <Input
              placeholder="备注信息"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            {isEdit ? '保存' : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Batch TTL Dialog ─────────────────────────────────────────────────

function BatchTtlDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ttl: number) => void;
}) {
  const [ttl, setTtl] = React.useState('600');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>批量修改 TTL</DialogTitle>
          <DialogDescription>选择要应用的 TTL 值</DialogDescription>
        </DialogHeader>
        <Select
          label="TTL"
          options={TTL_OPTIONS}
          value={ttl}
          onChange={(e) => setTtl(e.target.value)}
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => { onConfirm(Number(ttl)); onOpenChange(false); }}>确认修改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Batch Line Dialog ────────────────────────────────────────────────

function BatchLineDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (line: string) => void;
}) {
  const [line, setLine] = React.useState('默认');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>批量修改线路</DialogTitle>
          <DialogDescription>选择要应用的解析线路</DialogDescription>
        </DialogHeader>
        <Select
          label="解析线路"
          options={LINE_OPTIONS}
          value={line}
          onChange={(e) => setLine(e.target.value)}
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => { onConfirm(line); onOpenChange(false); }}>确认修改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Column Settings Dropdown ─────────────────────────────────────────

function ColumnSettings({
  table,
}: {
  table: ReturnType<typeof useReactTable<UnifiedDnsRecord>>;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggleableColumns = table.getAllColumns().filter(
    (col) => col.getCanHide() && col.id !== 'select' && col.id !== 'actions'
  );

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Settings2 className="mr-1 h-4 w-4" />
        列设置
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-card p-2 shadow-lg">
          {toggleableColumns.map((column) => (
            <label
              key={column.id}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted cursor-pointer"
            >
              <input
                type="checkbox"
                checked={column.getIsVisible()}
                onChange={(e) => column.toggleVisibility(!!e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Column Definitions ───────────────────────────────────────────────

type ProviderType = 'dnshe' | 'dnsneko';

function getColumns(
  onEdit: (record: UnifiedDnsRecord) => void,
  onDelete: (record: UnifiedDnsRecord) => void,
  onToggleStatus: (record: UnifiedDnsRecord) => void,
): ColumnDef<UnifiedDnsRecord>[] {
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
      header: '主机记录',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => (
        <Badge className={cn('font-mono text-xs', RECORD_TYPE_COLORS[row.original.type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border-transparent')}>
          {row.original.type}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || filterValue === 'all') return true;
        return row.original.type === filterValue;
      },
    },
    {
      accessorKey: 'value',
      header: '记录值',
      cell: ({ row }) => (
        <span className="font-mono text-xs break-all">{row.original.value}</span>
      ),
    },
    {
      accessorKey: 'line',
      header: '线路',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.line}</span>
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || filterValue === 'all') return true;
        return row.original.line === filterValue;
      },
    },
    {
      accessorKey: 'ttl',
      header: 'TTL',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{formatTtl(row.original.ttl)}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: '优先级',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.priority != null ? row.original.priority : '-'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => {
        const isActive = row.original.status === 'active';
        return (
          <button
            type="button"
            onClick={() => onToggleStatus(row.original)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            )}
            title={isActive ? '点击暂停' : '点击启用'}
          >
            <span
              className={cn(
                'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                isActive ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        );
      },
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue || filterValue === 'all') return true;
        if (filterValue === 'active') return row.original.status === 'active';
        if (filterValue === 'paused') return row.original.status === 'paused';
        return true;
      },
    },
    {
      accessorKey: 'remark',
      header: '备注',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground max-w-[120px] truncate block">
          {row.original.remark || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(record)}>
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(record)}
              className="text-destructive hover:text-destructive"
            >
              删除
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    // Optional columns (hidden by default)
    {
      accessorKey: 'id',
      header: '记录ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: '更新时间',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.updatedAt ? format(parseISO(row.original.updatedAt), 'yyyy-MM-dd HH:mm') : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'provider',
      header: '平台',
      cell: ({ row }) => (
        <Badge
          className={cn(
            'font-mono text-xs',
            row.original.provider === 'dnshe' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
            row.original.provider === 'dnsneko' && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-transparent'
          )}
        >
          {providerLabel(row.original.provider)}
        </Badge>
      ),
    },
  ];
}

// ── Card View Item ───────────────────────────────────────────────────

function DnsRecordCard({
  record,
  onEdit,
  onDelete,
  onToggleStatus,
  provider: _provider,
}: {
  record: UnifiedDnsRecord;
  onEdit: (r: UnifiedDnsRecord) => void;
  onDelete: (r: UnifiedDnsRecord) => void;
  onToggleStatus: (r: UnifiedDnsRecord) => void;
  provider: ProviderType;
}) {
  const isActive = record.status === 'active';
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{record.name}</span>
          <Badge className={cn('font-mono text-xs', RECORD_TYPE_COLORS[record.type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border-transparent')}>
            {record.type}
          </Badge>
        </div>
        <div className="text-xs font-mono break-all text-muted-foreground">
          {record.value}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>线路: {record.line}</span>
          <span>·</span>
          <span>TTL: {formatTtl(record.ttl)}</span>
          {record.priority != null && (
            <>
              <span>·</span>
              <span>优先级: {record.priority}</span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between pt-1 border-t">
          <button
            type="button"
            onClick={() => onToggleStatus(record)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            )}
            title={isActive ? '点击暂停' : '点击启用'}
          >
            <span
              className={cn(
                'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                isActive ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(record)}>
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(record)}
              className="text-destructive hover:text-destructive"
            >
              删除
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function DnsRecordsPage() {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Find domain info
  const domain = React.useMemo<UnifiedDomain | undefined>(
    () => mockDomains.find((d) => d.id === domainId),
    [domainId]
  );

  const provider = domain?.provider ?? 'dnshe';

  // Records for this domain
  const allRecords = React.useMemo<UnifiedDnsRecord[]>(
    () => mockRecords.filter((r) => r.domainId === domainId),
    [domainId]
  );

  // Local mutable state for mock operations
  const [records, setRecords] = React.useState<UnifiedDnsRecord[]>(allRecords);

  React.useEffect(() => {
    setRecords(allRecords);
  }, [allRecords]);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [keyword, setKeyword] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [lineFilter, setLineFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    id: false,
    updatedAt: false,
    provider: false,
  });

  // Dialog state
  const [addOpen, setAddOpen] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState<UnifiedDnsRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = React.useState<UnifiedDnsRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [batchTtlOpen, setBatchTtlOpen] = React.useState(false);
  const [batchLineOpen, setBatchLineOpen] = React.useState(false);
  const [cardView, setCardView] = React.useState(false);

  // Toast state
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Column callbacks (stable references)
  const handleEdit = React.useCallback((r: UnifiedDnsRecord) => setEditRecord(r), []);
  const handleDelete = React.useCallback((r: UnifiedDnsRecord) => setDeleteRecord(r), []);
  const handleToggleStatus = React.useCallback(
    (r: UnifiedDnsRecord) => {
      if (provider === 'dnshe') {
        showToast('DNSHE 平台暂不支持暂停/启用记录', 'error');
        return;
      }
      const newStatus = r.status === 'active' ? 'paused' : 'active';
      setRecords((prev) =>
        prev.map((rec) => (rec.id === r.id ? { ...rec, status: newStatus } : rec))
      );
      showToast(newStatus === 'active' ? '记录已启用' : '记录已暂停');
    },
    [provider]
  );

  // Column defs
  const columns = React.useMemo(
    () => getColumns(handleEdit, handleDelete, handleToggleStatus),
    [handleEdit, handleDelete, handleToggleStatus]
  );

  // Table instance
  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableGlobalFilter: false,
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  // Apply column filters
  React.useEffect(() => {
    const typeCol = table.getColumn('type');
    typeCol?.setFilterValue(typeFilter);
  }, [typeFilter, table]);

  React.useEffect(() => {
    const lineCol = table.getColumn('line');
    lineCol?.setFilterValue(lineFilter);
  }, [lineFilter, table]);

  React.useEffect(() => {
    const statusCol = table.getColumn('status');
    statusCol?.setFilterValue(statusFilter);
  }, [statusFilter, table]);

  // Keyword filter (manual row filtering)
  const filteredRows = React.useMemo(() => {
    let rows = table.getFilteredRowModel().rows;
    if (keyword) {
      const search = keyword.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.original.name.toLowerCase().includes(search) ||
          row.original.value.toLowerCase().includes(search)
      );
    }
    return rows;
  }, [table, keyword]);

  // Paginate
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
  const selectedRecords = React.useMemo(
    () =>
      Object.keys(rowSelection)
        .map((idx) => records[Number(idx)])
        .filter(Boolean),
    [rowSelection, records]
  );
  const allSelectedDnsneko = selectedRecords.every((r) => r.provider === 'dnsneko');
  const hasFilters = keyword || typeFilter !== 'all' || lineFilter !== 'all' || statusFilter !== 'all';

  function clearFilters() {
    setKeyword('');
    setTypeFilter('all');
    setLineFilter('all');
    setStatusFilter('all');
  }

  // Handlers
  function handleAddRecord(data: RecordFormData) {
    const newRecord: UnifiedDnsRecord = {
      id: `r${Date.now()}`,
      domainId: domainId!,
      name: data.name,
      type: data.type,
      value: data.value,
      line: data.line,
      ttl: Number(data.ttl),
      priority: data.priority ? Number(data.priority) : null,
      status: 'active',
      remark: data.remark,
      updatedAt: new Date().toISOString(),
      provider: provider as ProviderType,
    };
    setRecords((prev) => [...prev, newRecord]);
    showToast('DNS 记录已添加');
  }

  function handleEditRecord(data: RecordFormData) {
    if (!editRecord) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === editRecord.id
          ? {
              ...r,
              name: data.name,
              type: data.type,
              value: data.value,
              line: data.line,
              ttl: Number(data.ttl),
              priority: data.priority ? Number(data.priority) : null,
              remark: data.remark,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
    setEditRecord(null);
    showToast('DNS 记录已更新');
  }

  function handleDeleteRecord() {
    if (!deleteRecord) return;
    setRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
    setDeleteRecord(null);
    showToast('DNS 记录已删除');
  }

  function handleBulkDelete() {
    const selectedIds = new Set(Object.keys(rowSelection).map((idx) => records[Number(idx)]?.id).filter(Boolean));
    setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setRowSelection({});
    setBulkDeleteOpen(false);
    showToast('已批量删除记录');
  }

  function handleBatchTtl(ttl: number) {
    const selectedIds = new Set(Object.keys(rowSelection).map((idx) => records[Number(idx)]?.id).filter(Boolean));
    setRecords((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, ttl } : r))
    );
    setRowSelection({});
    showToast('已批量修改 TTL');
  }

  function handleBatchLine(line: string) {
    const selectedIds = new Set(Object.keys(rowSelection).map((idx) => records[Number(idx)]?.id).filter(Boolean));
    setRecords((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, line } : r))
    );
    setRowSelection({});
    showToast('已批量修改线路');
  }

  function handleBatchStatus() {
    const selectedIds = new Set(Object.keys(rowSelection).map((idx) => records[Number(idx)]?.id).filter(Boolean));
    setRecords((prev) =>
      prev.map((r) => {
        if (selectedIds.has(r.id)) {
          return { ...r, status: r.status === 'active' ? 'paused' as const : 'active' as const };
        }
        return r;
      })
    );
    setRowSelection({});
    showToast('已批量切换状态');
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-[1400px] mx-auto">
      {/* ── Toast ────────────────────────────────────────────── */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-[100] rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all',
            toast.type === 'success' && 'bg-green-600 text-white',
            toast.type === 'error' && 'bg-red-600 text-white'
          )}
        >
          {toast.message}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/domains')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {domain?.name ?? '未知域名'} DNS 记录
              <Badge
                className={cn(
                  'font-mono text-xs',
                  provider === 'dnshe' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
                  provider === 'dnsneko' && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-transparent'
                )}
              >
                {providerLabel(provider)}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              共 {records.length} 条记录
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加记录
        </Button>
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
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索主机记录或记录值..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-[120px]">
              <Select
                options={[
                  { value: 'all', label: '全部类型' },
                  ...TYPE_OPTIONS,
                ]}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[140px]">
              <Select
                options={[
                  { value: 'all', label: '全部线路' },
                  ...LINE_OPTIONS,
                ]}
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[120px]">
              <Select
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'active', label: '启用' },
                  { value: 'paused', label: '暂停' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
            <ColumnSettings table={table} />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                清除筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Batch Actions ────────────────────────────────────── */}
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
          <div className="relative inline-flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!allSelectedDnsneko) return;
                setBatchTtlOpen(true);
              }}
              disabled={!allSelectedDnsneko}
            >
              <Clock className="mr-1 h-4 w-4" />
              批量修改 TTL
            </Button>
            {!allSelectedDnsneko && (
              <Tooltip content="批量操作仅支持 DNSNeko 记录">
                <span className="ml-1">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </span>
              </Tooltip>
            )}
          </div>
          <div className="relative inline-flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!allSelectedDnsneko) return;
                setBatchLineOpen(true);
              }}
              disabled={!allSelectedDnsneko}
            >
              <Route className="mr-1 h-4 w-4" />
              批量修改线路
            </Button>
            {!allSelectedDnsneko && (
              <Tooltip content="批量操作仅支持 DNSNeko 记录">
                <span className="ml-1">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </span>
              </Tooltip>
            )}
          </div>
          <div className="relative inline-flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!allSelectedDnsneko) return;
                handleBatchStatus();
              }}
              disabled={!allSelectedDnsneko}
            >
              <ToggleLeft className="mr-1 h-4 w-4" />
              批量暂停/启用
            </Button>
            {!allSelectedDnsneko && (
              <Tooltip content="批量操作仅支持 DNSNeko 记录">
                <span className="ml-1">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </span>
              </Tooltip>
            )}
          </div>
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
        totalFiltered === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={<FileText className="h-10 w-10" />}
                title="没有找到 DNS 记录"
                description={hasFilters ? '尝试调整筛选条件或搜索关键词' : '该域名暂无 DNS 记录'}
                actionLabel={hasFilters ? '清除筛选' : '添加记录'}
                onAction={hasFilters ? clearFilters : () => setAddOpen(true)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1">
            {paginatedRows.map((row) => (
              <DnsRecordCard
                key={row.id}
                record={row.original}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                provider={provider as ProviderType}
              />
            ))}
          </div>
        )
      ) : (
      <Card>
        <CardContent className="p-0">
          {totalFiltered === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="没有找到 DNS 记录"
              description={hasFilters ? '尝试调整筛选条件或搜索关键词' : '该域名暂无 DNS 记录'}
              actionLabel={hasFilters ? '清除筛选' : '添加记录'}
              onAction={hasFilters ? clearFilters : () => setAddOpen(true)}
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
                  { value: '20', label: '20 条/页' },
                  { value: '50', label: '50 条/页' },
                  { value: '100', label: '100 条/页' },
                ]}
                value={String(pageSize)}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-1">
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

      {/* ── Add Record Dialog ────────────────────────────────── */}
      <RecordFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        record={null}
        provider={provider as ProviderType}
        onSubmit={handleAddRecord}
      />

      {/* ── Edit Record Dialog ───────────────────────────────── */}
      <RecordFormDialog
        open={!!editRecord}
        onOpenChange={(open) => { if (!open) setEditRecord(null); }}
        record={editRecord}
        provider={provider as ProviderType}
        onSubmit={handleEditRecord}
      />

      {/* ── Delete Confirm ──────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteRecord}
        onOpenChange={(open) => { if (!open) setDeleteRecord(null); }}
        title="确认删除"
        description="确定要删除这条 DNS 记录吗？此操作不可撤销。"
        confirmText="确认删除"
        onConfirm={handleDeleteRecord}
      />

      {/* ── Bulk Delete Confirm ─────────────────────────────── */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="批量删除"
        description={`确定要删除选中的 ${selectedCount} 条 DNS 记录吗？此操作不可撤销。`}
        confirmText="确认删除"
        onConfirm={handleBulkDelete}
      />

      {/* ── Batch TTL Dialog ────────────────────────────────── */}
      <BatchTtlDialog
        open={batchTtlOpen}
        onOpenChange={setBatchTtlOpen}
        onConfirm={handleBatchTtl}
      />

      {/* ── Batch Line Dialog ───────────────────────────────── */}
      <BatchLineDialog
        open={batchLineOpen}
        onOpenChange={setBatchLineOpen}
        onConfirm={handleBatchLine}
      />
    </div>
  );
}
