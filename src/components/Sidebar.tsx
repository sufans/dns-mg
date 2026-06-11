import { useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Globe,
  Key,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
}

const navItems: NavItem[] = [
  { label: "仪表盘", icon: LayoutDashboard, path: "/dashboard" },
  { label: "域名管理", icon: Globe, path: "/domains" },
  { label: "API 账号", icon: Key, path: "/accounts" },
  { label: "系统设置", icon: Settings, path: "/settings" },
]

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

function SidebarNavItems({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  const handleClick = (path: string) => {
    navigate(path)
    onNavigate?.()
  }

  return (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map((item) => {
        const active = isActive(item.path)
        const Icon = item.icon

        const button = (
          <button
            key={item.path}
            onClick={() => handleClick(item.path)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              "hover:bg-white/5 hover:text-foreground",
              active
                ? "bg-gradient-to-r from-accent-indigo/20 to-accent-purple/10 text-foreground shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]"
                : "text-slate-400",
              collapsed && "justify-center px-2"
            )}
          >
            <Icon
              className={cn(
                "shrink-0 size-5 transition-colors",
                active
                  ? "text-accent-indigo"
                  : "text-slate-400 group-hover:text-foreground"
              )}
            />
            {!collapsed && <span>{item.label}</span>}
            {active && !collapsed && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-indigo shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
            )}
          </button>
        )

        if (collapsed) {
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger render={button} />
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        }

        return button
      })}
    </nav>
  )
}

function SidebarDesktop({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}) {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-white/[0.06] bg-[#020617] transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 shrink-0",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-indigo to-accent-purple">
          <Globe className="size-[1.125rem] text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold bg-gradient-to-r from-accent-indigo to-accent-purple bg-clip-text text-transparent">
            DNS Manager
          </span>
        )}
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        <SidebarNavItems collapsed={collapsed} />
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Collapse toggle */}
      <div className="p-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "w-full justify-center text-slate-400 hover:text-foreground hover:bg-white/5",
            !collapsed && "gap-2"
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              <span>收起侧栏</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}

function SidebarMobile({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[260px] bg-[#020617] border-white/[0.06] p-0">
        <SheetTitle className="sr-only">导航菜单</SheetTitle>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-indigo to-accent-purple">
            <Globe className="size-[1.125rem] text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-accent-indigo to-accent-purple bg-clip-text text-transparent">
            DNS Manager
          </span>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Navigation */}
        <div className="py-4">
          <SidebarNavItems
            collapsed={false}
            onNavigate={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Sidebar(props: SidebarProps) {
  const { collapsed, onCollapsedChange, mobileOpen, onMobileOpenChange } = props

  return (
    <>
      <SidebarDesktop collapsed={collapsed} onCollapsedChange={onCollapsedChange} />
      <SidebarMobile open={mobileOpen} onOpenChange={onMobileOpenChange} />
    </>
  )
}

export { Sidebar }
export type { SidebarProps }
