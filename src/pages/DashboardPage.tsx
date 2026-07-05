import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, Globe2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TD, TH, TR, TBody, THead, Table } from '../components/ui/table';
import { api } from '../lib/api';
import { expiryTone, formatDate } from '../lib/utils';
import type { PublicApiAccount, UnifiedDomain } from '../types/models';

export function DashboardPage(): JSX.Element {
  const domains = useQuery({ queryKey: ['domains'], queryFn: () => api.get<{ domains: UnifiedDomain[]; errors: unknown[] }>('/api/domains') });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.get<{ accounts: PublicApiAccount[] }>('/api/accounts') });
  const list = domains.data?.domains ?? [];
  const warning = list.filter((d) => d.remainingDays !== null && d.remainingDays <= 30 && d.remainingDays >= 0).length;
  const expired = list.filter((d) => d.expired || (d.remainingDays !== null && d.remainingDays < 0)).length;
  const activeAccounts = (accounts.data?.accounts ?? []).filter((a) => a.enabled).length;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">仪表盘</h1>
        <p className="mt-2 text-slate-400">跨 DNSHE、DNSNEKO 与 GLEAM 聚合展示域名、解析和 API 账号状态。</p>
      </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
