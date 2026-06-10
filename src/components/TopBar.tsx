import { useLocation, useNavigate } from "react-router-dom"
import { Menu, Sun, Moon, Bell, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/ThemeProvider"
import { useLogout } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const pageTitles: Record<string, string> = {
  "/dashboard": "仪表盘",
  "/domains": "域名管理",
  "/accounts": "API 账号",
  "/settings": "系统设置",
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/domains/") && pathname.split("/").length > 3) {
    return "域名详情"
  }
  return pageTitles[pathname] || "DNS Manager"
}

interface TopBarProps {
  onMobileMenuToggle: () => void
}

function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const logoutMutation = useLogout()
  const pageTitle = getPageTitle(location.pathname)

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-[#0f172a]/80 px-4 backdrop-blur-md transition-all duration-300",
        "border-b border-white/[0.06]",
        // Gradient accent line at bottom
        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-accent-indigo/30 after:to-transparent"
      )}
      style={{
        marginLeft: 0,
      }}
    >
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden text-slate-400 hover:text-foreground"
        onClick={onMobileMenuToggle}
      >
        <Menu className="size-5" />
      </Button>

      {/* Page title / breadcrumb */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-slate-400 hover:text-foreground"
              >
                {theme === "dark" ? (
                  <Moon className="size-4" />
                ) : theme === "light" ? (
                  <Sun className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4 mr-2" />
              浅色
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4 mr-2" />
              深色
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <span className="size-4 mr-2 flex items-center justify-center text-xs">💻</span>
              跟随系统
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-slate-400 hover:text-foreground relative"
        >
          <Bell className="size-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-slate-400 hover:text-foreground"
              >
                <User className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <User className="size-4 mr-2" />
              系统设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-red-400 focus:text-red-300"
            >
              <LogOut className="size-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export { TopBar }
