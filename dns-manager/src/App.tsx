import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/ThemeProvider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { MainLayout } from "@/components/MainLayout"
import { LoginPage } from "@/pages/LoginPage"

function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">页面开发中...</p>
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
              <Route path="/dashboard" element={<PlaceholderPage name="仪表盘" />} />
              <Route path="/domains" element={<PlaceholderPage name="域名管理" />} />
              <Route path="/domains/:accountId/:domainId" element={<PlaceholderPage name="域名详情" />} />
              <Route path="/accounts" element={<PlaceholderPage name="API 账号" />} />
              <Route path="/settings" element={<PlaceholderPage name="系统设置" />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
