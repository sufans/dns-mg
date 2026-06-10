import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { User, Lock, Eye, EyeOff, Loader2, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLogin } from "@/hooks/useAuth"

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0 分 0 秒"
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes} 分 ${seconds} 秒`
}

function DecorativePanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0f172a]">
      {/* Gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-indigo/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-purple/20 rounded-full blur-[100px] animate-pulse-slow-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] animate-pulse-slow" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 login-grid-pattern opacity-[0.04]" />

      {/* Floating geometric shapes */}
      <div className="absolute top-[15%] left-[20%] w-16 h-16 border border-accent-indigo/20 rounded-lg rotate-12 animate-float-slow" />
      <div className="absolute top-[60%] left-[15%] w-12 h-12 border border-accent-purple/20 rounded-full animate-float-medium" />
      <div className="absolute top-[30%] right-[20%] w-20 h-20 border border-indigo-400/15 rounded-xl -rotate-12 animate-float-slow-delayed" />
      <div className="absolute bottom-[20%] right-[25%] w-10 h-10 border border-purple-400/20 rounded-lg rotate-45 animate-float-medium-delayed" />
      <div className="absolute top-[45%] left-[45%] w-8 h-8 bg-accent-indigo/10 rounded-md rotate-[30deg] animate-float-slow" />
      <div className="absolute bottom-[35%] left-[35%] w-6 h-6 bg-accent-purple/10 rounded-full animate-float-medium" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent-indigo to-accent-purple shadow-lg shadow-accent-indigo/25">
            <Globe className="size-7 text-white" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-accent-indigo to-accent-purple bg-clip-text text-transparent">
            DNS Manager
          </span>
        </div>
        <p className="text-lg text-slate-400 text-center tracking-wide">
          多域名解析平台统一管理系统
        </p>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const usernameRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [lockUntil, setLockUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<string>("")

  // Auto-focus username field on mount
  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  // Countdown timer for account lock
  useEffect(() => {
    if (!lockUntil) {
      setCountdown("")
      return
    }

    const updateCountdown = () => {
      const remaining = lockUntil - Date.now()
      if (remaining <= 0) {
        setLockUntil(null)
        setCountdown("")
        setErrorMessage("")
        return
      }
      setCountdown(formatCountdown(remaining))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [lockUntil])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage("")

      if (!username.trim()) {
        setErrorMessage("请输入用户名")
        return
      }
      if (!password.trim()) {
        setErrorMessage("请输入密码")
        return
      }

      try {
        await loginMutation.mutateAsync({ username: username.trim(), password })
      } catch (error: unknown) {
        if (error instanceof Error) {
          const message = error.message

          // Try to parse error for structured data
          // The API client throws Error with message from the response
          // Check for 429 lock status
          if (message.includes("429") || message.includes("锁定") || message.includes("locked")) {
            // Try to extract unlock time from error
            const unlockMatch = message.match(/unlock[_\s]?at[:\s]*(\d+)/i) ||
                                message.match(/retry[_\s]?after[:\s]*(\d+)/i) ||
                                message.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)

            if (unlockMatch) {
              const unlockTime = new Date(unlockMatch[1]).getTime()
              if (!isNaN(unlockTime)) {
                setLockUntil(unlockTime)
              }
            }
            setErrorMessage("登录已锁定，请稍后重试")
            return
          }

          // Check for remaining attempts
          const attemptsMatch = message.match(/(\d+)\s*次/) || message.match(/(\d+)\s*attempt/)
          if (attemptsMatch) {
            setRemainingAttempts(parseInt(attemptsMatch[1], 10))
            setErrorMessage(`用户名或密码错误，还有 ${attemptsMatch[1]} 次尝试机会`)
            return
          }

          // Check for network error
          if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("网络")) {
            setErrorMessage("网络连接失败，请检查网络后重试")
            return
          }

          // Check for server error
          if (message.includes("500") || message.includes("服务器")) {
            setErrorMessage("服务器错误，请稍后重试")
            return
          }

          // Check for 401 with attempts info
          if (message.includes("401") || message.includes("密码错误") || message.includes("用户名或密码")) {
            setErrorMessage(message)
            return
          }

          // Default error
          setErrorMessage(message || "登录失败，请重试")
        } else {
          setErrorMessage("登录失败，请重试")
        }
      }
    },
    [username, password, loginMutation]
  )

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("dns-manager-token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        if (payload.exp * 1000 > Date.now()) {
          navigate("/dashboard", { replace: true })
        }
      } catch {
        // Invalid token, stay on login
      }
    }
  }, [navigate])

  const isLoading = loginMutation.isPending

  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      {/* Left decorative panel */}
      <DecorativePanel />

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-indigo to-accent-purple">
              <Globe className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-accent-indigo to-accent-purple bg-clip-text text-transparent">
              DNS Manager
            </span>
          </div>

          {/* Login card */}
          <div className="rounded-xl border border-[rgba(99,102,241,0.1)] bg-[rgba(30,41,59,0.8)] backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
            <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
              登录
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username field */}
              <div className="space-y-2">
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User className="size-4" />
                  </div>
                  <Input
                    ref={usernameRef}
                    type="text"
                    placeholder="用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading || !!lockUntil}
                    className="h-11 pl-10 bg-[#1e293b] border-[#334155] text-foreground placeholder:text-muted-foreground focus-visible:border-[#6366f1] focus-visible:ring-[#6366f1]/25"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="size-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || !!lockUntil}
                    className="h-11 pl-10 pr-10 bg-[#1e293b] border-[#334155] text-foreground placeholder:text-muted-foreground focus-visible:border-[#6366f1] focus-visible:ring-[#6366f1]/25"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-sm text-red-500">{errorMessage}</p>
                  {lockUntil && countdown && (
                    <p className="text-sm text-red-400 mt-1">
                      登录已锁定，请 {countdown} 后重试
                    </p>
                  )}
                </div>
              )}

              {/* Remaining attempts */}
              {remainingAttempts !== null && !lockUntil && (
                <p className="text-xs text-amber-500/80">
                  剩余尝试次数：{remainingAttempts}
                </p>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isLoading || !!lockUntil}
                className="w-full h-11 bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#6366f1]/90 hover:to-[#a855f7]/90 text-white font-medium rounded-lg border-0 shadow-lg shadow-accent-indigo/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span className="ml-2">登录中...</span>
                  </>
                ) : (
                  "登录"
                )}
              </Button>
            </form>
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            DNS Manager &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
