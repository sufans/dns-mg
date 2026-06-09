import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Bell,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { EmptyState } from '../ui/empty-state';
import { useAlertsStore } from '../../stores/alerts';
import type { AlertType, AlertSeverity } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'warning':
      return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
    case 'info':
      return <Info className="h-5 w-5 text-blue-500" />;
  }
}

function getSeverityBadgeVariant(severity: AlertSeverity): 'destructive' | 'warning' | 'secondary' {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'warning';
    case 'info':
      return 'secondary';
  }
}

const typeLabels: Record<AlertType, string> = {
  rate_limit: '速率超限',
  credential_invalid: '凭证失效',
  quota_warning: '配额预警',
  system: '系统',
};

const severityLabels: Record<AlertSeverity, string> = {
  critical: '严重',
  warning: '警告',
  info: '信息',
};

// ── Component ────────────────────────────────────────────────────────

export function AlertCenterPage() {
  const alerts = useAlertsStore((s) => s.alerts);
  const acknowledgeAlert = useAlertsStore((s) => s.acknowledgeAlert);
  const acknowledgeAll = useAlertsStore((s) => s.acknowledgeAll);
  const clearAlerts = useAlertsStore((s) => s.clearAlerts);
  const getUnreadCount = useAlertsStore((s) => s.getUnreadCount);

  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const unreadCount = getUnreadCount();

  const summaryStats = useMemo(() => {
    const critical = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;
    const warning = alerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length;
    const info = alerts.filter((a) => a.severity === 'info' && !a.acknowledged).length;
    return { critical, warning, info };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (typeFilter !== 'all') result = result.filter((a) => a.type === typeFilter);
    if (severityFilter !== 'all') result = result.filter((a) => a.severity === severityFilter);
    return result;
  }, [alerts, typeFilter, severityFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">告警中心</h2>
        <p className="text-muted-foreground">监控 API 调用异常与安全风险</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Bell className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">未读告警</p>
                <p className="text-3xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">严重告警</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summaryStats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                <ShieldAlert className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">警告</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summaryStats.warning}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Info className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">信息</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summaryStats.info}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Type filters */}
          {(['all', 'rate_limit', 'credential_invalid', 'quota_warning', 'system'] as const).map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? '全部' : typeLabels[type]}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity filters */}
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <Button
              key={sev}
              variant={severityFilter === sev ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter(sev)}
            >
              {sev === 'all' ? '全部级别' : severityLabels[sev]}
            </Button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={acknowledgeAll}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          全部确认
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setClearDialogOpen(true)}
          disabled={alerts.length === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          清除全部
        </Button>
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="暂无告警"
          description="当前没有匹配的告警信息"
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={alert.acknowledged ? 'opacity-60' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 shrink-0">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{alert.message}</span>
                      <Badge variant={getSeverityBadgeVariant(alert.severity)} className="text-[10px]">
                        {severityLabels[alert.severity]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabels[alert.type]}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {alert.accountLabel && (
                        <span>账号: {alert.accountLabel}</span>
                      )}
                      <span>{formatTimeAgo(alert.createdAt)}</span>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      title="确认告警"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clear confirm dialog */}
      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="清除全部告警"
        description="确定要清除所有告警记录吗？此操作不可撤销。"
        confirmText="清除"
        onConfirm={clearAlerts}
      />
    </div>
  );
}
