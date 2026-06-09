import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  AlertTriangle,
  FileText,
  RefreshCw,
 Plus,
  Minus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  mockDomains,
  mockRecords,
  mockOperationLogs,
  mockSyncTasks,
  mockDnsheQuota,
  mockDomainTrend,
  mockRecordTypeDistribution,
} from '../../lib/mock-data';

function getDaysUntilExpiry(expireTime: string | null): number | null {
  if (!expireTime) return null;
  const diff = new Date(expireTime).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function getActionIcon(action: string) {
  if (action.includes('添加')) return <Plus className="h-4 w-4 text-success" />;
  if (action.includes('删除')) return <Trash2 className="h-4 w-4 text-destructive" />;
  if (action.includes('修改')) return <Edit3 className="h-4 w-4 text-primary" />;
  if (action.includes('同步')) return <RefreshCw className="h-4 w-4 text-accent" />;
  if (action.includes('暂停')) return <Minus className="h-4 w-4 text-warning" />;
  if (action.includes('验证')) return <CheckCircle2 className="h-4 w-4 text-primary" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function DashboardPage() {
  const stats = useMemo(() => {
    const totalDomains = mockDomains.length;
    const newThisMonth = mockDomains.filter((d) => {
      if (!d.createdAt) return false;
      const created = new Date(d.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const expiringDomains = mockDomains.filter((d) => {
      const days = getDaysUntilExpiry(d.expireTime);
      return days !== null && days >= 0 && days <= 30;
    });

    const totalRecords = mockRecords.length;
    const providers = new Set(mockDomains.map((d) => d.provider));

    const lastSync = mockSyncTasks.find((t) => t.status === 'completed');
    const lastSyncTimeAgo = lastSync?.completedAt ? formatTimeAgo(lastSync.completedAt) : '无';
    const hasFailedSync = mockSyncTasks.some((t) => t.status === 'failed');

    return {
      totalDomains,
      newThisMonth,
      expiringCount: expiringDomains.length,
      totalRecords,
      providerCount: providers.size,
      lastSyncTimeAgo,
      syncHealthy: !hasFailedSync,
    };
  }, [mockDomains, mockRecords, mockSyncTasks]);

  const expiringDomains = useMemo(() => {
    return mockDomains
      .map((d) => ({ ...d, daysLeft: getDaysUntilExpiry(d.expireTime) }))
      .filter((d) => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 30)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  }, [mockDomains]);

  const recentLogs = useMemo(() => mockOperationLogs.slice(0, 5), [mockOperationLogs]);

  const quotaPercent = useMemo(
    () => Math.round((mockDnsheQuota.used / mockDnsheQuota.total) * 100),
    [mockDnsheQuota]
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Domains */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">域名总数</p>
                <p className="text-3xl font-bold">{stats.totalDomains}</p>
                <p className="text-xs text-success font-medium">+{stats.newThisMonth} 本月新增</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">即将到期</p>
                <p className="text-3xl font-bold text-warning">{stats.expiringCount}</p>
                <p className="text-xs text-muted-foreground">30天内到期</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DNS Records */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">DNS 记录</p>
                <p className="text-3xl font-bold">{stats.totalRecords}</p>
                <p className="text-xs text-muted-foreground">跨 {stats.providerCount} 个平台</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', stats.syncHealthy ? 'bg-success/10' : 'bg-destructive/10')}>
                <RefreshCw className={cn('h-6 w-6', stats.syncHealthy ? 'text-success' : 'text-destructive')} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">同步状态</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={stats.syncHealthy ? 'success' : 'destructive'}>
                    {stats.syncHealthy ? '正常' : '异常'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">上次同步: {stats.lastSyncTimeAgo}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Quota Section: 1 col mobile, 2 col tablet+ */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">DNSHE 配额</CardTitle>
            <CardDescription>已使用 {mockDnsheQuota.used} / {mockDnsheQuota.total} 个域名</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={quotaPercent} variant={quotaPercent > 80 ? 'warning' : 'primary'} />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>基础配额: {mockDnsheQuota.base}</span>
              <span>邀请奖励: +{mockDnsheQuota.inviteBonus}</span>
              <span>可用: {mockDnsheQuota.available}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">DNSNeko</CardTitle>
            <CardDescription>DNSNeko 平台状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium">服务正常</p>
                <p className="text-xs text-muted-foreground">无配额限制</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              已接入 {mockDomains.filter((d) => d.provider === 'dnsneko').length} 个域名
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Warning + Recent Activity: 1 col mobile, 2 col desktop */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Expiry Warning */}
        {expiringDomains.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">到期预警</CardTitle>
                <Link to="/domains" className="text-sm text-primary hover:underline">查看全部</Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 overflow-x-auto -mx-1 px-1">
                {expiringDomains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between rounded-lg border p-3 min-w-[280px]">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{domain.name}</span>
                      <Badge variant={domain.provider === 'dnshe' ? 'default' : 'secondary'}>
                        {domain.provider === 'dnshe' ? 'DNSHE' : 'DNSNeko'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {domain.expireTime ? new Date(domain.expireTime).toLocaleDateString('zh-CN') : '-'}
                      </span>
                      <Badge
                        variant={(domain.daysLeft ?? 0) < 7 ? 'destructive' : 'warning'}
                      >
                        剩余 {domain.daysLeft} 天
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近操作</CardTitle>
              <Link to="/logs" className="text-sm text-primary hover:underline">查看全部</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-0.5">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.action}</span>
                      {log.result === 'failure' ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{log.target}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section: 1 col mobile, 2 col desktop */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Domain Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">域名趋势</CardTitle>
            <CardDescription>近6个月新增域名数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDomainTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="新增域名" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Record Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">记录类型分布</CardTitle>
            <CardDescription>DNS 记录类型占比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockRecordTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {mockRecordTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
