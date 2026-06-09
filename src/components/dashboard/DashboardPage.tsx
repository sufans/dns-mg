import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  Clock,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Minus,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { CardSkeleton } from '../../components/feedback';
import { RateLimitsPanel } from '../rate-limits';
import { useCredentialsStore } from '../../stores/credentials';
import { useLogsStore } from '../../stores/logs';
import { useDnsheQuota } from '../../hooks/useDashboardData';
import { mockDnsheQuota } from '../../lib/mock-data';

// ── Helpers ──────────────────────────────────────────────────────────

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
  if (action.includes('add')) return <Plus className="h-4 w-4 text-success" />;
  if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-destructive" />;
  if (action.includes('edit')) return <Edit3 className="h-4 w-4 text-primary" />;
  if (action.includes('test')) return <RefreshCw className="h-4 w-4 text-cyan-500" />;
  if (action.includes('set_default')) return <Minus className="h-4 w-4 text-warning" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    add_account: '添加账号',
    edit_account: '编辑账号',
    delete_account: '删除账号',
    test_connection: '测试连接',
    set_default: '设为默认',
    login: '登录',
    logout: '登出',
    change_password: '修改密码',
    update_settings: '更新设置',
  };
  return labels[action] ?? action;
}

// ── Pie chart colours ────────────────────────────────────────────────

const PIE_COLORS: Record<string, string> = {
  valid: '#22c55e',
  invalid: '#ef4444',
  unverified: '#9ca3af',
};

const PIE_LABELS: Record<string, string> = {
  valid: '有效',
  invalid: '无效',
  unverified: '未验证',
};

// ── Component ────────────────────────────────────────────────────────

export function DashboardPage() {
  const accounts = useCredentialsStore((s) => s.accounts);

  // ── Derived stats ──────────────────────────────────────────────────

  const dailyRequests = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const account of accounts) {
      for (const dr of account.usageStats.dailyRequests) {
        dayMap.set(dr.date, (dayMap.get(dr.date) || 0) + dr.count);
      }
    }
    if (dayMap.size === 0) {
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      return days.map(d => ({ day: d, requests: 0 }));
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, count]) => ({ day: date, requests: count }));
  }, [accounts]);

  const stats = useMemo(() => {
    const totalAccounts = accounts.length;
    const validAccounts = accounts.filter((a) => a.status === 'valid').length;
    const invalidAccounts = accounts.filter((a) => a.status === 'invalid').length;
    const unverifiedAccounts = accounts.filter((a) => a.status === 'unverified').length;
    const todayRequests = dailyRequests.reduce((sum, d) => sum + d.requests, 0);

    return { totalAccounts, validAccounts, invalidAccounts, unverifiedAccounts, todayRequests };
  }, [accounts, dailyRequests]);

  // ── Pie chart data ─────────────────────────────────────────────────

  const pieData = useMemo(
    () => [
      { name: 'valid', value: stats.validAccounts },
      { name: 'invalid', value: stats.invalidAccounts },
      { name: 'unverified', value: stats.unverifiedAccounts },
    ].filter((d) => d.value > 0),
    [stats],
  );

  // ── Recent logs ────────────────────────────────────────────────────

  const logs = useLogsStore((s) => s.logs);
  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  // ── Quota ──────────────────────────────────────────────────────────

  const { data: dnsheQuota, isLoading: quotaLoading } = useDnsheQuota();
  const quotaData = dnsheQuota ?? mockDnsheQuota;
  const quotaPercent = useMemo(
    () => quotaData ? Math.round((quotaData.used / quotaData.total) * 100) : 0,
    [quotaData],
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── 1. Statistics Cards Row ──────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* 已配置账号 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <KeyRound className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已配置账号</p>
                <p className="text-3xl font-bold">{stats.totalAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 有效账号 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">有效账号</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.validAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 无效账号 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">无效账号</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.invalidAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 今日请求 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
                <Activity className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">今日请求</p>
                <p className="text-3xl font-bold">{stats.todayRequests.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 2. Account Status Distribution + 3. Request Frequency ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Account Status Distribution (Pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">账号状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[200px] w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value, name) => [value, PIE_LABELS[String(name)] ?? String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[entry.name] }}
                    />
                    <span className="text-sm text-muted-foreground">{PIE_LABELS[entry.name]}</span>
                    <span className="text-sm font-semibold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Frequency Trend (Area) */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">请求频率趋势</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRequests} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="requestGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    name="请求数"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    fill="url(#requestGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 4. Platform Quota + 5. Recent Activity ──────────────── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Platform Quota */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">平台配额</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* DNSHE */}
            {quotaLoading ? (
              <CardSkeleton />
            ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[10px]">DNSHE</Badge>
                  <span className="text-sm font-medium">域名配额</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {quotaData.used} / {quotaData.total}
                </span>
              </div>
              <Progress value={quotaPercent} variant={quotaPercent > 80 ? 'warning' : 'primary'} />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>基础: {quotaData.base}</span>
                <span>邀请奖励: +{quotaData.inviteBonus}</span>
                <span>可用: {quotaData.available}</span>
              </div>
            </div>
            )}

            {/* DNSNeko */}
            <div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-[10px]">DNSNeko</Badge>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">服务正常</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">无配额 API，不限域名数量</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">近期操作</CardTitle>
              <Link to="/logs" className="text-sm text-primary hover:underline">
                查看全部
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-0.5">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{getActionLabel(log.action)}</span>
                      {log.result === 'failure' ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{log.target}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 5. Rate Limits Panel ─────────────────────────────── */}
      <RateLimitsPanel />
    </div>
  );
}
