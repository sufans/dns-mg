import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Globe,
  FileX2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDomains } from '@/hooks/useDomains';
import { useAccounts } from '@/hooks/useAccounts';
import { useGroups } from '@/hooks/useGroups';
import type { Domain } from '@/types';

type SortField = 'domain' | 'expireTime' | 'platform';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'expired' | 'suspended';

const PAGE_SIZE = 20;

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

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getRowClassName(domain: Domain): string {
  const status = getDomainStatus(domain);
  if (status === 'expired') return 'animate-blink-red bg-red-500/10';
  const days = getDaysRemaining(domain.expireTime);
  if (days !== null && days <= 7) return 'bg-red-500/10';
  if (days !== null && days <= 30) return 'bg-amber-500/10';
  return '';
}

function getDaysBadge(days: number | null) {
  if (days === null) return <span className="text-muted-foreground">-</span>;
  if (days <= 0) return <span className="text-red-500 font-medium">{days} 天</span>;
  if (days <= 7) return <span className="text-red-400 font-medium">{days} 天</span>;
  if (days <= 30) return <span className="text-amber-400 font-medium">{days} 天</span>;
  return <span className="text-foreground">{days} 天</span>;
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

function getPlatformBadge(platform: string) {
  if (platform === 'dnshe') {
    return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">DNSHE</Badge>;
  }
  return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20">DNSNEKO</Badge>;
}

function exportCSV(domains: Domain[], accountsMap: Map<string, string>) {
  const BOM = '\uFEFF';
  const headers = ['域名名称', '平台', 'API账号', '注册时间', '到期时间', '剩余天数', '状态', '记录数'];
  const rows = domains.map((d) => {
    const days = getDaysRemaining(d.expireTime);
    const status = getDomainStatus(d);
    const statusText = status === 'active' ? '活跃' : status === 'expired' ? '已过期' : '已暂停';
    return [
      d.domain,
      d.platform === 'dnshe' ? 'DNSHE' : 'DNSNEKO',
      accountsMap.get(d.accountId) || '-',
      formatDate(d.createdAt),
      formatDate(d.expireTime),
      days !== null ? String(days) : '-',
      statusText,
      d.recordCount != null ? String(d.recordCount) : '-',
    ];
  });

  const csvContent = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `domains-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-40 bg-muted/50 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-5 w-16 bg-muted/50 rounded-full animate-pulse" /></TableCell>
      <TableCell><div className="h-4 w-20 bg-muted/50 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 w-24 bg-muted/50 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 w-12 bg-muted/50 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 w-10 bg-muted/50 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-5 w-14 bg-muted/50 rounded-full animate-pulse" /></TableCell>
    </TableRow>
  );
}

export function DomainsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('domain');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Data
  const { data: domainsData, isLoading } = useDomains({
    platform: platformFilter !== 'all' ? platformFilter : undefined,
    groupId: groupFilter !== 'all' ? groupFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: accounts } = useAccounts();
  const { data: groups } = useGroups();

  // Build maps
  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  // All domains from API (server-side filtering now handles status)
  const domainsFromApi = domainsData?.domains;
  const total = domainsData?.total || 0;

  // Sort only (filtering is server-side)
  const filteredDomains = useMemo(() => {
    const result = domainsFromApi ?? [];
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'domain':
          cmp = (a.domain || '').localeCompare(b.domain || '');
          break;
        case 'expireTime':
          cmp = (a.expireTime || '').localeCompare(b.expireTime || '');
          break;
        case 'platform':
          cmp = (a.platform || '').localeCompare(b.platform || '');
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [domainsFromApi, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortOrder('asc');
      }
      return field;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['domains'] });
  }, [queryClient]);

  const handleExport = useCallback(() => {
    exportCSV(filteredDomains, accountsMap);
  }, [filteredDomains, accountsMap]);

  const handleDomainClick = useCallback(
    (domain: Domain) => {
      navigate(`/domains/${domain.accountId}/${domain.id}`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">域名管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理所有平台的域名与解析记录</p>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Platform Tabs */}
            <Tabs
              value={platformFilter}
              onValueChange={(v) => {
                setPlatformFilter(v);
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="dnshe">DNSHE</TabsTrigger>
                <TabsTrigger value="dnsneko">DNSNEKO</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Group Filter */}
            <Select
              value={groupFilter}
              onValueChange={(v) => {
                setGroupFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部分组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分组</SelectItem>
                {groups?.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
                <SelectItem value="suspended">已暂停</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="搜索域名..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="default" onClick={handleSearch}>
                搜索
              </Button>
            </div>

            {/* Actions */}
            <Button variant="outline" size="icon" onClick={handleRefresh} title="刷新">
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="default" onClick={handleExport} disabled={filteredDomains.length === 0}>
              <Download className="size-4" />
              导出 CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Domain Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('domain')}
                >
                  <span className="flex items-center gap-1">
                    域名名称
                    <ArrowUpDown className="size-3" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('platform')}
                >
                  <span className="flex items-center gap-1">
                    所属平台
                    <ArrowUpDown className="size-3" />
                  </span>
                </TableHead>
                <TableHead>API 账号</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('expireTime')}
                >
                  <span className="flex items-center gap-1">
                    到期时间
                    <ArrowUpDown className="size-3" />
                  </span>
                </TableHead>
                <TableHead>剩余天数</TableHead>
                <TableHead>记录数</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredDomains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileX2 className="size-10" />
                      <p>暂无域名数据</p>
                      <p className="text-xs">请添加 API 账号后刷新</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDomains.map((domain) => {
                  const days = getDaysRemaining(domain.expireTime);
                  const status = getDomainStatus(domain);
                  return (
                    <TableRow
                      key={domain.id}
                      className={`cursor-pointer border-slate-700/30 hover:bg-slate-700/30 ${getRowClassName(domain)}`}
                      onClick={() => handleDomainClick(domain)}
                    >
                      <TableCell>
                        <span className="font-medium text-foreground hover:text-accent-indigo transition-colors flex items-center gap-2">
                          <Globe className="size-4 text-muted-foreground" />
                          {domain.domain}
                        </span>
                      </TableCell>
                      <TableCell>{getPlatformBadge(domain.platform)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {accountsMap.get(domain.accountId) || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(domain.expireTime)}
                      </TableCell>
                      <TableCell>{getDaysBadge(days)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {domain.recordCount != null ? domain.recordCount : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && filteredDomains.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {total} 个域名，第 {page}/{totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
