import { useMemo } from 'react';
import { useCredentialsStore } from '../../stores/credentials';
import { useConfigStore } from '../../stores/config';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { Badge } from '../ui';
import { Progress } from '../ui';
import { Gauge, Activity, Clock, Zap } from 'lucide-react';

export function RateLimitsPanel() {
  const accounts = useCredentialsStore((s) => s.accounts);
  const rateLimitPerMinute = useConfigStore((s) => s.rateLimitPerMinute);

  const accountStats = useMemo(() => {
    const now = new Date();
    return accounts.map(account => {
      const totalRequests = account.usageStats.totalRequests;
      const lastRequestAt = account.usageStats.lastRequestAt;
      const recentCalls = account.usageStats.recentCalls;

      // Calculate requests in last minute from recentCalls
      const oneMinuteAgo = now.getTime() - 60000;
      const currentRate = recentCalls.filter(
        call => new Date(call.timestamp).getTime() > oneMinuteAgo
      ).length;

      // Calculate daily requests
      const today = now.toISOString().split('T')[0];
      const todayRequests = account.usageStats.dailyRequests
        .filter(dr => dr.date === today)
        .reduce((sum, dr) => sum + dr.count, 0);

      const ratePercent = Math.min(Math.round((currentRate / rateLimitPerMinute) * 100), 100);

      return {
        account,
        currentRate,
        rateLimit: rateLimitPerMinute,
        ratePercent,
        totalRequests,
        todayRequests,
        lastRequestAt,
        recentCalls: recentCalls.slice(0, 5),
      };
    });
  }, [accounts, rateLimitPerMinute]);

  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">调用频率与运行限制</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accountStats.map(({ account, currentRate, rateLimit, ratePercent, totalRequests, todayRequests, lastRequestAt, recentCalls }) => (
            <div key={account.id} className="border rounded-lg p-4 space-y-3">
              {/* Account header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={account.provider === 'dnshe' ? 'default' : 'secondary'} className="text-[10px]">
                    {account.provider === 'dnshe' ? 'DNSHE' : 'DNSNeko'}
                  </Badge>
                  <span className="text-sm font-medium">{account.label}</span>
                </div>
                <Badge variant={ratePercent > 80 ? 'destructive' : ratePercent > 50 ? 'secondary' : 'success'}>
                  {ratePercent > 80 ? '高频' : ratePercent > 50 ? '中频' : '低频'}
                </Badge>
              </div>

              {/* Rate limit progress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">当前速率 / 限制</span>
                  <span className="text-xs font-medium">{currentRate} / {rateLimit} 次/分钟</span>
                </div>
                <Progress
                  value={ratePercent}
                  variant={ratePercent > 80 ? 'warning' : 'primary'}
                />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">总请求</p>
                    <p className="font-medium">{totalRequests.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">今日请求</p>
                    <p className="font-medium">{todayRequests.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">最后请求</p>
                    <p className="font-medium text-xs">
                      {lastRequestAt ? new Date(lastRequestAt).toLocaleTimeString('zh-CN') : '从未'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent calls mini-table */}
              {recentCalls.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">最近调用</p>
                  <div className="space-y-1">
                    {recentCalls.map((call, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-muted-foreground truncate max-w-[150px]">{call.endpoint}</span>
                        <div className="flex items-center gap-2">
                          <span className={call.statusCode >= 400 ? 'text-destructive' : 'text-success'}>{call.statusCode}</span>
                          <span className="text-muted-foreground">{call.duration}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
