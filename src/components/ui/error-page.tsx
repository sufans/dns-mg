import { cn } from "../../lib/utils"
import { Button } from "./button"

type ErrorVariant = "404" | "500" | "network"

interface ErrorPageProps {
  variant?: ErrorVariant
  title?: string
  description?: string
  onRetry?: () => void
  onHome?: () => void
  className?: string
}

const errorConfig: Record<ErrorVariant, { title: string; description: string; icon: string }> = {
  "404": {
    title: "页面不存在",
    description: "您访问的页面不存在或已被移除",
    icon: "🔍",
  },
  "500": {
    title: "服务器错误",
    description: "服务器遇到了内部错误，请稍后重试",
    icon: "⚠️",
  },
  network: {
    title: "网络连接失败",
    description: "无法连接到服务器，请检查您的网络连接",
    icon: "📡",
  },
}

function ErrorPage({
  variant = "500",
  title,
  description,
  onRetry,
  onHome,
  className,
}: ErrorPageProps) {
  const config = errorConfig[variant]

  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="text-6xl mb-4">{config.icon}</div>
      <h1 className="text-2xl font-bold">{title ?? config.title}</h1>
      <p className="mt-2 text-muted-foreground max-w-md">
        {description ?? config.description}
      </p>
      <div className="mt-6 flex gap-3">
        {onRetry && (
          <Button onClick={onRetry}>重试</Button>
        )}
        {onHome && (
          <Button variant="outline" onClick={onHome}>
            返回首页
          </Button>
        )}
      </div>
    </div>
  )
}

export { ErrorPage }
