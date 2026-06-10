import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe,
  AlertTriangle,
  Key,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import { useDomains } from '@/hooks/useDomains'
import { useAccounts } from '@/hooks/useAccounts'
import { useOperationLogs } from '@/hooks/useSettings'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Domain } from '@/types'

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  iconBg: string
  gradient: string
  loading?: boolean
}

function StatCard({ label, value, icon, iconBg, gradient, loading }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-white/[0.06] p-5',
        gradient
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="h-9 w-16 animate-pulse rounded bg-white/10" />
          ) : (
            <p className="text-3xl font-bold text-foreground">{value}</p>
          )}
        </div>
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-full',
            iconBg
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ── Expiring Domains Table ───────────────────────────────────────────────────

function getDaysRemaining(expireTime: string): number {
  const now = new Date()
  const expiry = new Date(expireTime)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getRowClass(daysRemaining: number, isExpired: boolean): string {
  if (isExpired || daysRemaining <= 0) return 'animate-blink-red bg-red-500/10'
  if (daysRemaining <= 7) return 'bg-red-500/5'
  if (daysRemaining <= 30) return 'bg-yellow-500/5'
  return ''
}

function getStatusBadge(daysRemaining: number, isExpired: boolean) {
  if (isExpired || daysRemaining <= 0) {
    return <Badge variant="destructive">已过期</Badge>
  }
  if (daysRemaining <= 7) {
    return <Badge variant="destructive">即将过期</Badge>
  }
  if (daysRemaining <= 30) {
    return (
      <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/25">
        即将到期
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">正常</Badge>
  )
}

function formatExpireTime(expireTime: string): string {
  const date = new Date(expireTime)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    dnshe: 'DNSHE',
    dnsneko: 'DNSNeko',
  }
  return labels[platform] || platform
}

interface ExpiringDomainsProps {
  domains: Domain[]
  loading: boolean
  error: Error | null
  onRetry: () => void
}

function ExpiringDomains({ domains, loading, error, onRetry }: ExpiringDomainsProps) {
  const navigate = useNavigate()

  const expiringDomains = useMemo(() => {
    return domains
      .filter((d) => {
        if (!d.expireTime) return false
        const days = getDaysRemaining(d.expireTime)
        return days <= 30 || d.expired
      })
      .sort((a, b) => {
        if (!a.expireTime) return 1
        if (!b.expireTime) return -1
        return new Date(a.expireTime).getTime() - new Date(b.expireTime).getTime()
      })
  }, [domains])

  return (
    <div className="rounded-lg border border-white/[0.06] bg-slate-800/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-base font-medium text-foreground">即将到期域名</h3>
        <button
          onClick={() => navigate('/domains')}
          className="flex items-center gap-1 text-sm text-accent-indigo hover:text-accent-indigo/80 transition-colors"
        >
          查看全部
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">加载失败</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="size-3.5" />
              重试
            </Button>
          </div>
        ) : expiringDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle2 className="size-8 text-green-500/50" />
            <p className="text-sm text-muted-foreground">暂无即将到期的域名</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">域名名称</th>
                <th className="text-left px-5 py-3 font-medium">所属平台</th>
                <th className="text-left px-5 py-3 font-medium">到期时间</th>
                <th className="text-left px-5 py-3 font-medium">剩余天数</th>
                <th className="text-left px-5 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {expiringDomains.map((domain) => {
                const days = domain.expireTime ? getDaysRemaining(domain.expireTime) : Infinity
                const isExpired = domain.expired || days <= 0
                return (
                  <tr
                    key={`${domain.accountId}-${domain.id}`}
                    className={cn(
                      'border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]',
                      getRowClass(days, isExpired)
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      {domain.domain}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {getPlatformLabel(domain.platform)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {domain.expireTime ? formatExpireTime(domain.expireTime) : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'font-medium',
                          isExpired
                            ? 'text-red-400'
                            : days <= 7
                              ? 'text-red-400'
                              : 'text-yellow-500'
                        )}
                      >
                        {isExpired ? '已过期' : `${days} 天`}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {getStatusBadge(days, isExpired)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Recent Operation Logs ────────────────────────────────────────────────────

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    login: '登录',
    logout: '登出',
    create_account: '创建账号',
    update_account: '更新账号',
    delete_account: '删除账号',
    toggle_account: '切换账号状态',
    test_connection: '测试连接',
    import_accounts: '导入账号',
    export_accounts: '导出账号',
    create_record: '创建记录',
    update_record: '更新记录',
    delete_record: '删除记录',
    toggle_record: '切换记录状态',
    batch_operation: '批量操作',
    update_settings: '更新设置',
    backup: '备份',
    restore: '恢复',
    cleanup_logs: '清理日志',
  }
  return labels[action] || action
}

function getTargetTypeLabel(targetType: string): string {
  const labels: Record<string, string> = {
    account: '账号',
    domain: '域名',
    record: '记录',
    group: '分组',
    system: '系统',
  }
  return labels[targetType] || targetType
}

function formatLogTime(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface RecentLogsProps {
  loading: boolean
  error: Error | null
  onRetry: () => void
}

function RecentLogs({ loading, error, onRetry }: RecentLogsProps) {
  const navigate = useNavigate()
  const { data, refetch } = useOperationLogs({ pageSize: 10 })
  const logs = data?.logs ?? []

  // Use the passed loading/error from parent, but also consider local data
  const isLoading = loading && !data
  const hasError = error && !data

  return (
    <div className="rounded-lg border border-white/[0.06] bg-slate-800/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-base font-medium text-foreground">最近操作日志</h3>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1 text-sm text-accent-indigo hover:text-accent-indigo/80 transition-colors"
        >
          查看全部
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">加载失败</p>
            <Button variant="outline" size="sm" onClick={() => { onRetry(); refetch() }}>
              <RefreshCw className="size-3.5" />
              重试
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Clock className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无操作日志</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="shrink-0">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium">
                      {getActionLabel(log.action)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getTargetTypeLabel(log.targetType)}
                    </span>
                    {log.detail && (
                      <span className="text-xs text-muted-foreground truncate">
                        - {log.detail}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {log.status === 'failed' && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      失败
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatLogTime(log.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Dashboard Page ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const {
    data: domainsData,
    isLoading: domainsLoading,
    error: domainsError,
    refetch: refetchDomains,
  } = useDomains()

  const {
    data: accountsData,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useAccounts()

  const domains = domainsData?.domains ?? []

  const stats = useMemo(() => {
    const totalDomains = domainsData?.total ?? 0

    const expiringCount = domains.filter((d) => {
      if (!d.expireTime) return false
      const days = getDaysRemaining(d.expireTime)
      return days <= 30 || d.expired
    }).length

    const totalAccounts = accountsData?.length ?? 0

    const totalRecords = domains.reduce((sum, d) => {
      const count = typeof d.recordCount === 'string'
        ? parseInt(d.recordCount, 10)
        : d.recordCount
      return sum + (isNaN(count as number) ? 0 : (count as number))
    }, 0)

    return { totalDomains, expiringCount, totalAccounts, totalRecords }
  }, [domains, domainsData?.total, accountsData])

  const anyLoading = (domainsLoading && !domainsData) || (accountsLoading && !accountsData)
  const anyError = domainsError || accountsError

  const handleRetry = () => {
    refetchDomains()
    refetchAccounts()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          DNS 管理平台概览
        </p>
      </div>

      {/* Error State */}
      {anyError && !anyLoading && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-4 flex items-center justify-between">
          <p className="text-sm text-red-400">
            部分数据加载失败，请检查网络后重试
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="size-3.5" />
            重试
          </Button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="域名总数"
          value={stats.totalDomains}
          icon={<Globe className="size-5 text-white" />}
          iconBg="bg-gradient-to-br from-indigo-500 to-purple-500"
          gradient="bg-gradient-to-br from-indigo-500/10 to-purple-500/5"
          loading={domainsLoading && !domainsData}
        />
        <StatCard
          label="即将到期"
          value={stats.expiringCount}
          icon={<AlertTriangle className="size-5 text-white" />}
          iconBg="bg-gradient-to-br from-yellow-500 to-amber-500"
          gradient="bg-gradient-to-br from-yellow-500/10 to-amber-500/5"
          loading={domainsLoading && !domainsData}
        />
        <StatCard
          label="API 账号"
          value={stats.totalAccounts}
          icon={<Key className="size-5 text-white" />}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
          gradient="bg-gradient-to-br from-blue-500/10 to-cyan-500/5"
          loading={accountsLoading && !accountsData}
        />
        <StatCard
          label="解析记录"
          value={stats.totalRecords}
          icon={<FileText className="size-5 text-white" />}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          gradient="bg-gradient-to-br from-green-500/10 to-emerald-500/5"
          loading={domainsLoading && !domainsData}
        />
      </div>

      {/* Expiring Domains & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringDomains
          domains={domains}
          loading={domainsLoading && !domainsData}
          error={domainsError}
          onRetry={() => refetchDomains()}
        />
        <RecentLogs
          loading={false}
          error={null}
          onRetry={handleRetry}
        />
      </div>
    </div>
  )
}
