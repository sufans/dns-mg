import { useState } from "react"
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from "@/hooks/useGroups"
import { useAccounts } from "@/hooks/useAccounts"
import type { AccountGroup } from "@/types"

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
]

interface GroupManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupManager({ open, onOpenChange }: GroupManagerProps) {
  const { data: groups, isLoading } = useGroups()
  const { data: accounts } = useAccounts()
  const createMutation = useCreateGroup()
  const updateMutation = useUpdateGroup()
  const deleteMutation = useDeleteGroup()

  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0])
  const [showAddForm, setShowAddForm] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const getAccountCount = (groupId: string) => {
    return accounts?.filter((a) => a.groupId === groupId).length ?? 0
  }

  const handleAdd = async () => {
    if (!newGroupName.trim()) return
    try {
      await createMutation.mutateAsync({
        name: newGroupName.trim(),
        color: newGroupColor,
        sortOrder: groups?.length ?? 0,
      })
      setNewGroupName("")
      setNewGroupColor(PRESET_COLORS[0])
      setShowAddForm(false)
    } catch {
      // Error handled by mutation
    }
  }

  const startEdit = (group: AccountGroup) => {
    setEditingId(group.id)
    setEditName(group.name)
    setEditColor(group.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        name: editName.trim(),
        color: editColor,
      })
      cancelEdit()
    } catch {
      // Error handled by mutation
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirmId(null)
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>分组管理</DialogTitle>
          <DialogDescription className="text-slate-400">
            管理账号分组，删除分组后其中的账号将变为未分组
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-slate-400" />
            </div>
          ) : groups && groups.length > 0 ? (
            groups.map((group) => (
              <div key={group.id}>
                {editingId === group.id ? (
                  /* Inline edit form */
                  <div className="flex items-center gap-2 rounded-lg bg-slate-900/50 border border-slate-600 p-2">
                    <div className="flex gap-1 shrink-0">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`size-4 rounded-full border-2 transition-all ${
                            editColor === c
                              ? "border-white scale-110"
                              : "border-transparent hover:border-slate-400"
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => setEditColor(c)}
                        />
                      ))}
                    </div>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 bg-slate-900 border-slate-600 text-slate-100 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate()
                        if (e.key === "Escape") cancelEdit()
                      }}
                    />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                      className="text-green-400 hover:text-green-300 shrink-0"
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="text-slate-400 hover:text-slate-200 shrink-0"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : deleteConfirmId === group.id ? (
                  /* Delete confirmation */
                  <div className="flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <span className="text-sm text-red-400">
                      确定删除「{group.name}」？{getAccountCount(group.id) > 0 && `${getAccountCount(group.id)} 个账号将变为未分组`}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => handleDelete(group.id)}
                        disabled={deleteMutation.isPending}
                      >
                        删除
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                        className="border-slate-600 text-slate-300"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Normal display */
                  <div className="flex items-center justify-between rounded-lg bg-slate-900/30 border border-slate-700/50 px-3 py-2 hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-sm text-slate-200">{group.name}</span>
                      <span className="text-xs text-slate-500">
                        {getAccountCount(group.id)} 个账号
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => startEdit(group)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(group.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              暂无分组
            </div>
          )}
        </div>

        {/* Add group */}
        {showAddForm ? (
          <div className="space-y-3 border-t border-slate-700 pt-3">
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-5 rounded-full border-2 transition-all ${
                    newGroupColor === c
                      ? "border-white scale-110"
                      : "border-transparent hover:border-slate-400"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewGroupColor(c)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="输入分组名称"
                className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                  if (e.key === "Escape") setShowAddForm(false)
                }}
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newGroupName.trim() || createMutation.isPending}
                className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white border-0 shrink-0"
              >
                {createMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setNewGroupName("")
                }}
                className="border-slate-600 text-slate-300 shrink-0"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="w-full border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          >
            <Plus className="size-3.5" />
            添加分组
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
