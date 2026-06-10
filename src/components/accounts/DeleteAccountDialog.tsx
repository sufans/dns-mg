import { useState, useEffect } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDeleteAccount } from "@/hooks/useAccounts"
import { useVerifyPassword } from "@/hooks/useAuth"
import type { ApiAccount } from "@/types"

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: ApiAccount | null
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  account,
}: DeleteAccountDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const verifyMutation = useVerifyPassword()
  const deleteMutation = useDeleteAccount()

  useEffect(() => {
    if (open) {
      setPassword("")
      setError("")
    }
  }, [open])

  const handleDelete = async () => {
    if (!account || !password.trim()) return

    try {
      const result = await verifyMutation.mutateAsync({ password: password.trim() })
      if (!result.valid) {
        setError("密码验证失败")
        return
      }
      await deleteMutation.mutateAsync(account.id)
      onOpenChange(false)
    } catch {
      setError("操作失败，请重试")
    }
  }

  const isProcessing =
    verifyMutation.isPending || deleteMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-400" />
            删除账号
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            确定要删除账号「{account?.name}」吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-400">
              删除后，该账号下的所有配置将被永久移除，且无法恢复。请输入登录密码以确认操作。
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">登录密码</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              placeholder="请输入登录密码"
              className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDelete()
              }}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!password.trim() || isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                处理中...
              </>
            ) : (
              "确认删除"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
