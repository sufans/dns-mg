import { useState, useRef } from "react"
import { Download, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useImportAccounts, useExportAccounts } from "@/hooks/useAccounts"
import { useVerifyPassword } from "@/hooks/useAuth"
import { toast } from "sonner"

interface ImportExportProps {
  className?: string
}

export function ImportExport({ className }: ImportExportProps) {
  const exportMutation = useExportAccounts()
  const importMutation = useImportAccounts()
  const verifyMutation = useVerifyPassword()

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importPassword, setImportPassword] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync()
      toast.success("导出成功")
    } catch {
      toast.error("导出失败")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportError("")
    }
  }

  const handleImport = async () => {
    if (!importFile || !importPassword.trim()) return

    try {
      const result = await verifyMutation.mutateAsync({
        password: importPassword.trim(),
      })
      if (!result.valid) {
        setImportError("密码验证失败")
        return
      }

      const formData = new FormData()
      formData.append("file", importFile)
      formData.append("password", importPassword.trim())

      await importMutation.mutateAsync(formData)
      toast.success("导入成功")
      setImportDialogOpen(false)
      setImportPassword("")
      setImportFile(null)
      setImportError("")
    } catch {
      setImportError("导入失败，请检查文件格式是否正确")
    }
  }

  const isProcessing =
    verifyMutation.isPending || importMutation.isPending

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exportMutation.isPending}
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        {exportMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        导出
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setImportDialogOpen(true)}
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        <Upload className="size-3.5" />
        导入
      </Button>

      {/* Import dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>导入账号</DialogTitle>
            <DialogDescription className="text-slate-400">
              从加密的 JSON 文件导入 API 账号配置
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">选择文件</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              >
                {importFile ? importFile.name : "选择 .json 文件"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">登录密码</Label>
              <Input
                type="password"
                value={importPassword}
                onChange={(e) => {
                  setImportPassword(e.target.value)
                  setImportError("")
                }}
                placeholder="请输入登录密码以验证身份"
                className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {importError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{importError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false)
                setImportPassword("")
                setImportFile(null)
                setImportError("")
              }}
              disabled={isProcessing}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || !importPassword.trim() || isProcessing}
              className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white border-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  处理中...
                </>
              ) : (
                "导入"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
