import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, Globe2, RefreshCw } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import { expiryTone, formatDate } from '../lib/utils';
import type { AppSettings, PublicApiAccount, UnifiedDomain } from '../types/models';

interface AccountError {
  accountId: number;
  accountName: string;
  error: string;
}

export function DashboardPage(): JSX.Element {
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<{ settings: AppSettings }>('/api/settings') });
  const domains = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get<{ domains: UnifiedDomain[]; errors: AccountError[] }>('/api/domains'),
    refetchInterval: (settings.data?.settings.refreshIntervalMinutes ?? 60) * 60_000
  });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.get<{ accounts: PublicApiAccount[] }>('/api/accounts') });
  const refresh = useMutation({
    mutationFn: () => api.post('/api/domains/refresh'),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['domains'] })
  });

  const list = domains.data?.domains ?? [];
  const errors = domains.data?.errors ?? [];
  const warning = list.filter((d) => d.remainingDays !== null && d.remainingDays <= 30 && d.remainingDays >= 0).length;
  const expired = list.filter((d) => d.expired || (d.remainingDays !== null && d.remainingDays < 0)).length;
  const activeAccounts = (accounts.data?.accounts ?? []).filter((a) => a.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">仪表盘</h1>
          <p className="mt-2 text-muted-foreground">跨 DNSHE、DNSNEKO 与 GLEAM 聚合展示域名、解析和 API 账号状态。</p>
        </div>
        <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending || domains.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refresh.isPending || domains.isFetching ? 'animate-spin' : ''}`} />
          {refresh.isPending || domains.isFetching ? '刷新中...' : '刷新数据'}
        </Button>
      </div>

      {domains.error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">加载失败：{domains.error.message}</div> : null}
      {errors.length ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">部分账号拉取失败：{errors.map((e) => `${e.accountName}: ${e.error}`).join('；')}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="域名总数" value={list.length} note="来自所有启用账号" icon={Globe2} />
        <StatCard title="启用账号" value={activeAccounts} note="API 账号连接池" icon={CheckCircle2} />
        <StatCard title="30天内到期" value={warning} note="黄色预警" icon={Clock3} />
        <StatCard title="已过期" value={expired} note="红色告警" icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>到期风险 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <EmptyState title="暂无域名数据" description={domains.isLoading ? '正在加载...' : '请先在 API 账号页添加并启用账号，然后点击刷新数据。'} />
          ) : (
            <Table>
              <THead><TR><TH>域名</TH><TH>平台</TH><TH>API账号</TH><TH>到期时间</TH><TH>剩余</TH></TR></THead>
              <TBody>
                {list.slice(0, 10).map((domain) => {
                  const tone = expiryTone(domain);
                  return (
                    <TR key={`${domain.accountId}:${domain.id}`} className={tone === 'expired' ? 'animate-blink bg-red-500/10' : ''}>
                      <TD className="font-medium">{domain.name}</TD>
                      <TD><Badge variant="secondary">{domain.platform}</Badge></TD>
                      <TD>{domain.accountName}</TD>
                      <TD>{formatDate(domain.expiresAt)}</TD>
                      <TD>
                        <Badge variant={tone === 'normal' ? 'success' : tone === 'warning' ? 'warning' : 'danger'}>
                          {domain.remainingDays ?? '-'} 天
                        </Badge>
                      </TD>
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
