import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/ThemeProvider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { MainLayout } from "@/components/MainLayout"
import { LoginPage } from "@/pages/LoginPage"
import { AccountsPage } from "@/pages/AccountsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { DomainsPage } from "@/pages/DomainsPage"
import { DomainDetailPage } from "@/pages/DomainDetailPage"

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-4">页面不存在</p>
        <a href="/" className="text-accent-indigo hover:underline">返回首页</a>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider delay={200}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/domains" element={<DomainsPage />} />
              <Route path="/domains/:accountId/:domainId" element={<DomainDetailPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
