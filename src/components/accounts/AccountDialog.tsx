import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { z } from "zod"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateAccount, useUpdateAccount, useTestConnection } from "@/hooks/useAccounts"
import { useGroups } from "@/hooks/useGroups"
import type { ApiAccount, Platform, AccountGroup } from "@/types"

const dnsheSchema = z.object({
  name: z.string().min(1, "账号名称不能为空").max(100),
  platform: z.literal("dnshe"),
  groupId: z.string().nullable().optional(),
  credentials: z.object({
    apiKey: z.string().min(1, "API Key 不能为空"),
    apiSecret: z.string().min(1, "API Secret 不能为空"),
  }),
})

const dnsnekoSchema = z.object({
  name: z.string().min(1, "账号名称不能为空").max(100),
  platform: z.literal("dnsneko"),
  groupId: z.string().nullable().optional(),
  credentials: z.object({
    username: z.string().min(1, "用户名不能为空"),
    apiToken: z.string().min(1, "API Key 不能为空"),
  }),
})

// Edit mode schemas: credentials are optional (empty = don't change)
const dnsheEditSchema = z.object({
  name: z.string().min(1, "账号名称不能为空").max(100),
  platform: z.literal("dnshe"),
  groupId: z.string().nullable().optional(),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
  }),
})

const dnsnekoEditSchema = z.object({
  name: z.string().min(1, "账号名称不能为空").max(100),
  platform: z.literal("dnsneko"),
  groupId: z.string().nullable().optional(),
  credentials: z.object({
    username: z.string().optional(),
    apiToken: z.string().optional(),
  }),
})

type FormValues = {
  name: string
  platform: Platform
  groupId: string | null
  credentials: {
    apiKey?: string
    apiSecret?: string
    username?: string
    apiToken?: string
  }
}

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: ApiAccount | null
}

export function AccountDialog({ open, onOpenChange, account }: AccountDialogProps) {
  const isEdit = !!account
  const createMutation = useCreateAccount()
  const updateMutation = useUpdateAccount()
  const testConnectionMutation = useTestConnection()
  const { data: groups } = useGroups()

  const [platform, setPlatform] = useState<Platform>(account?.platform ?? "dnshe")
  const [form, setForm] = useState<FormValues>({
    name: "",
    platform: "dnshe",
    groupId: null,
    credentials: {},
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({
    apiKey: false,
    apiSecret: false,
    apiToken: false,
  })
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    if (open) {
      if (account) {
        setPlatform(account.platform)
        setForm({
          name: account.name,
          platform: account.platform,
          groupId: account.groupId,
          credentials: {},
        })
      } else {
        setPlatform("dnshe")
        setForm({
          name: "",
          platform: "dnshe",
          groupId: null,
          credentials: {},
        })
      }
      setErrors({})
      setTestResult(null)
      setShowSecrets({ apiKey: false, apiSecret: false, apiToken: false })
    }
  }, [open, account])

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const updateCredential = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      credentials: { ...prev.credentials, [field]: value },
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[`credentials.${field}`]
      return next
    })
  }

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const validate = (): boolean => {
    if (isEdit) {
      const schema = platform === "dnshe" ? dnsheEditSchema : dnsnekoEditSchema
      const data = { ...form, platform }
      const result = schema.safeParse(data)
      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of result.error.issues) {
          const path = issue.path.join(".")
          fieldErrors[path] = issue.message
        }
        setErrors(fieldErrors)
        return false
      }
    } else {
      const schema = platform === "dnshe" ? dnsheSchema : dnsnekoSchema
      const data = { ...form, platform }
      const result = schema.safeParse(data)
      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of result.error.issues) {
          const path = issue.path.join(".")
          fieldErrors[path] = issue.message
        }
        setErrors(fieldErrors)
        return false
      }
    }
    setErrors({})
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const payload = { ...form, platform }

    try {
      if (isEdit && account) {
        await updateMutation.mutateAsync({ id: account.id, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleTestConnection = async () => {
    if (!isEdit || !account) return
    setTestResult(null)
    try {
      const result = await testConnectionMutation.mutateAsync(account.id)
      setTestResult(result)
    } catch {
      setTestResult({ success: false, message: "连接测试失败" })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑账号" : "添加账号"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEdit ? "修改 API 账号配置信息" : "添加新的 DNS 平台 API 账号"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Platform selector - only for new accounts */}
          {!isEdit && (
            <div className="space-y-2">
              <Label className="text-slate-300">平台</Label>
              <Tabs
                value={platform}
                onValueChange={(v) => {
                  const p = v as Platform
                  setPlatform(p)
                  updateField("platform", p)
                  setForm((prev) => ({ ...prev, credentials: {} }))
                  setErrors({})
                  setTestResult(null)
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="dnshe" className="flex-1">
                    DNSHE
                  </TabsTrigger>
                  <TabsTrigger value="dnsneko" className="flex-1">
                    DNSNEKO
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Account name */}
          <div className="space-y-2">
            <Label className="text-slate-300">账号名称</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="输入账号名称"
              className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          {/* DNSHE credentials */}
          {platform === "dnshe" && (
            <>
              <div className="space-y-2">
                <Label className="text-slate-300">API Key</Label>
                <div className="relative">
                  <Input
                    type={showSecrets.apiKey ? "text" : "password"}
                    value={form.credentials.apiKey ?? ""}
                    onChange={(e) => updateCredential("apiKey", e.target.value)}
                    placeholder={isEdit ? "留空则不修改" : "输入 API Key"}
                    className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("apiKey")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showSecrets.apiKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors["credentials.apiKey"] && (
                  <p className="text-xs text-red-400">
                    {errors["credentials.apiKey"]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">API Secret</Label>
                <div className="relative">
                  <Input
                    type={showSecrets.apiSecret ? "text" : "password"}
                    value={form.credentials.apiSecret ?? ""}
                    onChange={(e) => updateCredential("apiSecret", e.target.value)}
                    placeholder={isEdit ? "留空则不修改" : "输入 API Secret"}
                    className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("apiSecret")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showSecrets.apiSecret ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors["credentials.apiSecret"] && (
                  <p className="text-xs text-red-400">
                    {errors["credentials.apiSecret"]}
                  </p>
                )}
              </div>
            </>
          )}

          {/* DNSNEKO credentials */}
          {platform === "dnsneko" && (
            <>
              <div className="space-y-2">
                <Label className="text-slate-300">用户名</Label>
                <Input
                  value={form.credentials.username ?? ""}
                  onChange={(e) => updateCredential("username", e.target.value)}
                  placeholder={isEdit ? "留空则不修改" : "输入用户名"}
                  className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
                />
                {errors["credentials.username"] && (
                  <p className="text-xs text-red-400">
                    {errors["credentials.username"]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">API Key</Label>
                <div className="relative">
                  <Input
                    type={showSecrets.apiToken ? "text" : "password"}
                    value={form.credentials.apiToken ?? ""}
                    onChange={(e) => updateCredential("apiToken", e.target.value)}
                    placeholder={isEdit ? "留空则不修改" : "输入 API Key"}
                    className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("apiToken")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showSecrets.apiToken ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors["credentials.apiToken"] && (
                  <p className="text-xs text-red-400">
                    {errors["credentials.apiToken"]}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Group selector */}
          <div className="space-y-2">
            <Label className="text-slate-300">分组</Label>
            <Select
              value={form.groupId ?? "none"}
              onValueChange={(v) =>
                updateField("groupId", v === "none" ? null : v)
              }
            >
              <SelectTrigger className="w-full bg-slate-900 border-slate-600 text-slate-100">
                <SelectValue placeholder="选择分组" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="none">未分组</SelectItem>
                {groups?.map((group: AccountGroup) => (
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

          {/* Test connection (edit mode only) */}
          {isEdit && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    测试中...
                  </>
                ) : (
                  "测试连接"
                )}
              </Button>
              {testResult && (
                <div
                  className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                    testResult.success
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <XCircle className="size-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#6366f1]/90 hover:to-[#a855f7]/90 text-white border-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
