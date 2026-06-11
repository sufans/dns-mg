import { useState, useMemo } from "react"
import {
  Plus,
  Search,
  FolderOpen,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  ArrowUpDown,
  Inbox,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAccounts, useToggleAccount, useTestConnection } from "@/hooks/useAccounts"
import { useGroups } from "@/hooks/useGroups"
import { AccountDialog } from "@/components/accounts/AccountDialog"
import { DeleteAccountDialog } from "@/components/accounts/DeleteAccountDialog"
import { GroupManager } from "@/components/accounts/GroupManager"
import { ImportExport } from "@/components/accounts/ImportExport"
import type { ApiAccount, Platform, ConnectionStatus, AccountGroup } from "@/types"

type SortField = "name" | "createdAt"
type SortOrder = "asc" | "desc"

const PLATFORM_LABELS: Record<Platform, string> = {
  dnshe: "DNSHE",
  dnsneko: "DNSNEKO",
}

const PLATFORM_COLORS: Record<Platform, string> = {
  dnshe: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  dnsneko: "bg-purple-500/15 text-purple-400 border-purple-500/25",
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string }
> = {
  online: {
    label: "在线",
    className: "bg-green-500/15 text-green-400 border-green-500/25",
  },
  offline: {
    label: "离线",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  },
  error: {
    label: "错误",
    className: "bg-red-500/15 text-red-400 border-red-500/25",
  },
  unknown: {
    label: "未知",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  },
}

export function AccountsPage() {
  const { data: accounts, isLoading, isError, error, refetch } = useAccounts()
  const { data: groups } = useGroups()
  const toggleMutation = useToggleAccount()
  const testConnectionMutation = useTestConnection()
  const queryClient = useQueryClient()

  // Filters
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")

  // Sort
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  // Dialogs
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ApiAccount | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<ApiAccount | null>(null)
  const [groupManagerOpen, setGroupManagerOpen] = useState(false)

  const getGroup = (groupId: string | null): AccountGroup | undefined => {
    if (!groupId) return undefined
    return groups?.find((g) => g.id === groupId)
  }

  // Filtered and sorted accounts
  const filteredAccounts = useMemo(() => {
    let result = accounts ?? []

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.name.toLowerCase().includes(q))
    }

    // Platform filter
    if (platformFilter !== "all") {
      result = result.filter((a) => a.platform === platformFilter)
    }

    // Group filter
    if (groupFilter !== "all") {
      if (groupFilter === "none") {
        result = result.filter((a) => !a.groupId)
      } else {
        result = result.filter((a) => a.groupId === groupFilter)
      }
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name, "zh-CN")
      } else {
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return sortOrder === "asc" ? cmp : -cmp
    })

    return result
  }, [accounts, search, platformFilter, groupFilter, sortField, sortOrder])

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const handleToggleAccount = (account: ApiAccount) => {
    // Optimistic update
    queryClient.setQueryData<ApiAccount[]>(["accounts"], (old) =>
      old?.map((a) =>
        a.id === account.id ? { ...a, isEnabled: !a.isEnabled } : a
      )
    )
    toggleMutation.mutate(account.id, {
      onError: () => {
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ["accounts"] })
        toast.error("切换状态失败")
      },
    })
  }

  const handleTestConnection = async (account: ApiAccount) => {
    try {
      const result = await testConnectionMutation.mutateAsync(account.id)
      if (result.success) {
        toast.success(`${account.name}: 连接成功`)
      } else {
        toast.error(`${account.name}: ${result.message}`)
      }
    } catch {
      toast.error(`${account.name}: 连接测试失败`)
    }
  }

  const openEditDialog = (account: ApiAccount) => {
    setEditingAccount(account)
    setAccountDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingAccount(null)
    setAccountDialogOpen(true)
  }

  const openDeleteDialog = (account: ApiAccount) => {
    setDeletingAccount(account)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API 账号管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理 DNS 平台的 API 账号配置
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExport />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGroupManagerOpen(true)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <FolderOpen className="size-3.5" />
            分组管理
          </Button>
          <Button
            size="sm"
            onClick={openAddDialog}
            className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#6366f1]/90 hover:to-[#a855f7]/90 text-white border-0 shadow-lg shadow-accent-indigo/25"
          >
            <Plus className="size-3.5" />
            添加账号
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索账号名称..."
            className="pl-9 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Select
          value={platformFilter}
          onValueChange={(v) => setPlatformFilter(v as "all" | Platform)}
        >
          <SelectTrigger className="w-[140px] bg-slate-900/50 border-slate-700 text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="dnshe">DNSHE</SelectItem>
            <SelectItem value="dnsneko">DNSNEKO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[140px] bg-slate-900/50 border-slate-700 text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">全部分组</SelectItem>
            <SelectItem value="none">未分组</SelectItem>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Account table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-800 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <AlertTriangle className="size-8 mb-2" />
          <p>加载失败: {error?.message || "未知错误"}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-3">重试</Button>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <Inbox className="size-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-300">
            {accounts && accounts.length > 0 ? "无匹配结果" : "暂无账号"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {accounts && accounts.length > 0
              ? "尝试调整搜索条件或筛选器"
              : "点击「添加账号」按钮添加第一个 API 账号"}
          </p>
          {(!accounts || accounts.length === 0) && (
            <Button
              size="sm"
              onClick={openAddDialog}
              className="mt-4 bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white border-0"
            >
              <Plus className="size-3.5" />
              添加账号
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead className="text-slate-400">平台</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    onClick={() => handleToggleSort("name")}
                    aria-label="按名称排序"
                  >
                    账号名称
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead className="text-slate-400">分组</TableHead>
                <TableHead className="text-slate-400">连接状态</TableHead>
                <TableHead className="text-slate-400">状态</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    onClick={() => handleToggleSort("createdAt")}
                    aria-label="按创建时间排序"
                  >
                    创建时间
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead className="text-slate-400 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => {
                const group = getGroup(account.groupId)
                const status = STATUS_CONFIG[account.connectionStatus]

                return (
                  <TableRow
                    key={account.id}
                    className="border-slate-700/30 hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Platform */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={PLATFORM_COLORS[account.platform]}
                        title={PLATFORM_LABELS[account.platform]}
                      >
                        {PLATFORM_LABELS[account.platform]}
                      </Badge>
                    </TableCell>

                    {/* Name */}
                    <TableCell className="font-medium text-slate-200 max-w-[200px] truncate" title={account.name}>
                      {account.name}
                    </TableCell>

                    {/* Group */}
                    <TableCell>
                      {group ? (
                        <span className="flex items-center gap-1.5 text-sm text-slate-300">
                          <span
                            className="inline-block size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: group.color }}
                          />
                          {group.name}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-500">未分组</span>
                      )}
                    </TableCell>

                    {/* Connection status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={status.className}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>

                    {/* Enabled toggle */}
                    <TableCell>
                      <Switch
                        checked={account.isEnabled}
                        onCheckedChange={() => handleToggleAccount(account)}
                      />
                    </TableCell>

                    {/* Created at */}
                    <TableCell className="text-slate-400 text-sm">
                      {new Date(account.createdAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => openEditDialog(account)}
                          className="text-slate-400 hover:text-slate-200"
                          title="编辑"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleTestConnection(account)}
                          disabled={testConnectionMutation.isPending}
                          className="text-slate-400 hover:text-green-400"
                          title="测试连接"
                        >
                          {account.connectionStatus === "online" ? (
                            <Wifi className="size-3" />
                          ) : (
                            <WifiOff className="size-3" />
                          )}
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => openDeleteDialog(account)}
                          className="text-slate-400 hover:text-red-400"
                          title="删除"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        account={editingAccount}
      />
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        account={deletingAccount}
      />
      <GroupManager
        open={groupManagerOpen}
        onOpenChange={setGroupManagerOpen}
      />
    </div>
  )
}
