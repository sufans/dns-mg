import { useState, useEffect } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { cn } from "@/lib/utils"

function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("dns-manager-sidebar-collapsed") === "true"
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("dns-manager-token")
    if (!token) {
      navigate("/login", { replace: true })
    }
  }, [navigate])

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("dns-manager-sidebar-collapsed", String(collapsed))
  }, [collapsed])

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
        )}
      >
        <TopBar
          onMobileMenuToggle={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export { MainLayout }
