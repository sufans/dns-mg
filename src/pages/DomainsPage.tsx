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
import { expiryTone, formatDate } from '../lib/utils';
import type { DNSPlatform, UnifiedDomain } from '../types/models';

export function DomainsPage(): JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState<DNSPlatform | 'all'>('all');
  const query = useQuery({ queryKey: ['domains'], queryFn: () => api.get<{ domains: UnifiedDomain[]; errors: Array<{ accountName: string; error: string }> }>('/api/domains') });
  const refresh = useMutation({
    mutationFn: () => api.post('/api/domains/refresh'),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['domains'] })
  });
  const filtered = useMemo(() => {
    return (query.data?.domains ?? []).filter((domain) => {
      if (platform !== 'all' && domain.platform !== platform) return false;
      if (keyword && !domain.name.toLowerCase().includes(keyword.toLowerCase())) return false;
      return true;
    });
  }, [query.data?.domains, keyword, platform]);
  async function exportCsv(): Promise<void> {
    const csv = await api.get<string>('/api/domains/export');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domains-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">域名统一管理中心</h1>
          <p className="mt-2 text-slate-400">按平台、关键词、状态聚合展示域名与到期风险。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}><RefreshCw className="mr-2 h-4 w-4" />刷新</Button>
          <Button variant="neon" onClick={() => void exportCsv()}><Download className="mr-2 h-4 w-4" />导出 CSV</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input className="pl-9" placeholder="搜索域名关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <Select value={platform} onChange={(event) => setPlatform(event.target.value as DNSPlatform | 'all')}>
            <option value="all">全部平台</option>
            <option value="dnshe">DNSHE</option>
            <option value="dnsneko">DNSNEKO</option>
            <option value="gleam">GLEAM</option>
          </Select>
        </CardContent>
      </Card>
      {query.data?.errors?.length ? <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">部分账号拉取失败：{query.data.errors.map((e) => `${e.accountName}: ${e.error}`).join('；')}</div> : null}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? <div className="p-6"><EmptyState title="暂无域名" description="请先添加并启用 DNS 平台 API 账号。" /></div> : (
            <Table>
              <THead><TR><TH>域名</TH><TH>平台</TH><TH>账号/分组</TH><TH>状态</TH><TH>到期时间</TH><TH>剩余</TH><TH>记录</TH></TR></THead>
              <TBody>
                {filtered.map((domain) => {
                  const tone = expiryTone(domain);
                  return (
                    <TR key={`${domain.accountId}:${domain.id}`} onClick={() => navigate(`/domains/${domain.accountId}/${domain.id}`)} className={tone === 'expired' ? 'cursor-pointer animate-blink bg-red-500/10' : 'cursor-pointer'}>
                      <TD className="font-medium">{domain.name}</TD>
                      <TD><Badge variant="secondary">{domain.platform}</Badge></TD>
                      <TD><div>{domain.accountName}</div><div className="text-xs text-slate-500">{domain.groupName ?? '未分组'}</div></TD>
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
