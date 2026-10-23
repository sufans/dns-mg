import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, Search } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { queryClient } from '../lib/query';
import { downloadText, expiryTone, formatDate } from '../lib/utils';
import type { DNSPlatform, UnifiedDomain } from '../types/models';

export function DomainsPage(): JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState<DNSPlatform | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'expired' | 'soon'>('all');
  const query = useQuery({ queryKey: ['domains'], queryFn: () => api.get<{ domains: UnifiedDomain[]; errors: Array<{ accountName: string; error: string }> }>('/api/domains') });
  const refresh = useMutation({
    mutationFn: () => api.post('/api/domains/refresh'),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['domains'] })
  });
  const filtered = useMemo(() => {
    return (query.data?.domains ?? []).filter((domain) => {
      if (platform !== 'all' && domain.platform !== platform) return false;
      if (keyword && !domain.name.toLowerCase().includes(keyword.toLowerCase())) return false;
      if (status === 'expired' && !(domain.expired || (domain.remainingDays !== null && domain.remainingDays < 0))) return false;
      if (status === 'active' && (domain.expired || (domain.remainingDays !== null && domain.remainingDays < 0))) return false;
      if (status === 'soon' && !(domain.remainingDays !== null && domain.remainingDays >= 0 && domain.remainingDays <= 30)) return false;
      return true;
    });
  }, [query.data?.domains, keyword, platform, status]);
  const exportCsv = useMutation({
    mutationFn: async () => {
      const csv = await api.get<string>('/api/domains/export');
      // The BOM keeps Excel from mangling UTF-8 domain names.
      downloadText(`domains-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
    }
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">域名统一管理中心</h1>
          <p className="mt-2 text-muted-foreground">按平台、关键词、状态聚合展示域名与到期风险。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}><RefreshCw className="mr-2 h-4 w-4" />刷新</Button>
          <Button variant="neon" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}><Download className="mr-2 h-4 w-4" />{exportCsv.isPending ? '导出中...' : '导出 CSV'}</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="搜索域名关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <Select value={platform} onChange={(event) => setPlatform(event.target.value as DNSPlatform | 'all')}>
            <option value="all">全部平台</option>
            <option value="dnshe">DNSHE</option>
            <option value="dnsneko">DNSNEKO</option>
            <option value="gleam">GLEAM</option>
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">全部状态</option>
            <option value="active">未过期</option>
            <option value="soon">30天内到期</option>
            <option value="expired">已过期</option>
          </Select>
        </CardContent>
      </Card>
      {query.error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">加载失败：{query.error.message}</div> : null}
      {refresh.error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">刷新失败：{refresh.error.message}</div> : null}
      {exportCsv.error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">导出失败：{exportCsv.error.message}</div> : null}
      {query.data?.errors?.length ? <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">部分账号拉取失败：{query.data.errors.map((e) => `${e.accountName}: ${e.error}`).join('；')}</div> : null}
      <Card>
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-6 text-sm text-muted-foreground">正在加载域名...</div> : filtered.length === 0 ? <div className="p-6"><EmptyState title={query.data?.domains.length ? '没有匹配的域名' : '暂无域名'} description={query.data?.domains.length ? '请调整筛选条件后重试。' : '请先添加并启用 DNS 平台 API 账号。'} /></div> : (
            <Table>
              <THead><TR><TH>域名</TH><TH>平台</TH><TH>账号/分组</TH><TH>状态</TH><TH>到期时间</TH><TH>剩余</TH><TH>记录</TH></TR></THead>
              <TBody>
                {filtered.map((domain) => {
                  const tone = expiryTone(domain);
                  const open = (): void => navigate(`/domains/${domain.accountId}/${domain.id}`);
                  return (
                    <TR
                      key={`${domain.accountId}:${domain.id}`}
                      onClick={open}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          open();
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`查看 ${domain.name} 的解析记录`}
                      className={tone === 'expired' ? 'cursor-pointer animate-blink bg-red-500/10' : 'cursor-pointer'}
                    >
                      <TD className="font-medium">{domain.name}</TD>
                      <TD><Badge variant="secondary">{domain.platform}</Badge></TD>
                      <TD><div>{domain.accountName}</div><div className="text-xs text-muted-foreground">{domain.groupName ?? '未分组'}</div></TD>
                      <TD>{domain.dnsStatus}</TD>
                      <TD>{formatDate(domain.expiresAt)}</TD>
                      <TD><Badge variant={tone === 'normal' ? 'success' : tone === 'warning' ? 'warning' : 'danger'}>{domain.remainingDays ?? '-'} 天</Badge></TD>
                      <TD>{domain.recordCount ?? '-'}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
