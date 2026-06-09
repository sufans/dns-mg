import { useState } from 'react';
import {
  Globe,
  FileText,
  Key,
  Bell,
  Shield,
  Lock,
  Zap,
  ArrowRight,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

const navLinks = [
  { label: '功能', href: '#features' },
  { label: '平台', href: '#platforms' },
  { label: '安全', href: '#security' },
  { label: '文档', href: '#steps' },
];

const features = [
  {
    icon: Globe,
    title: '统一域名管理',
    description: '跨平台域名集中展示，搜索筛选排序，到期预警一目了然',
  },
  {
    icon: FileText,
    title: 'DNS 记录管理',
    description: '增删改查、批量操作、自定义列，高效管理解析记录',
  },
  {
    icon: Key,
    title: 'API 账号管理',
    description: '多平台凭证安全存储，一键测试连接，脱敏显示保护隐私',
  },
  {
    icon: Bell,
    title: '智能同步预警',
    description: '自动同步域名数据，到期预警提醒，异步任务状态追踪',
  },
];

const platforms = [
  {
    name: 'DNSHE',
    description: '免费域名服务，支持子域名注册、DNS 记录管理、API 密钥管理、配额查询',
    features: ['子域名注册', 'DNS 记录管理', 'API 密钥管理', '配额查询'],
  },
  {
    name: 'DNSNeko',
    description: 'DNS 域名管理，支持域名列表、DNS 记录 CRUD、批量操作、暂停启用',
    features: ['域名列表查询', 'DNS 记录 CRUD', '批量操作', '暂停启用控制'],
  },
];

const securityFeatures = [
  {
    icon: Shield,
    title: 'Cloudflare Secrets',
    description: 'API 凭证通过 Cloudflare Secrets 安全存储，端到端加密保护',
  },
  {
    icon: Lock,
    title: 'JWT 认证',
    description: '基于 JSON Web Token 的单账号认证系统，Token 自动过期管理',
  },
  {
    icon: Zap,
    title: '速率限制',
    description: '智能 API 请求速率控制，避免触发平台限速，保障服务稳定',
  },
];

const steps = [
  {
    number: 1,
    title: '注册账号',
    description: '创建管理员账号，完成基础配置',
  },
  {
    number: 2,
    title: '配置 API',
    description: '添加 DNSHE 或 DNSNeko 平台凭证',
  },
  {
    number: 3,
    title: '同步域名',
    description: '一键同步所有平台域名数据',
  },
  {
    number: 4,
    title: '管理记录',
    description: '高效管理 DNS 解析记录',
  },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: 'hsl(var(--background) / 0.8)',
          backdropFilter: 'blur(12px)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'hsl(var(--primary))' }}
              >
                <Globe className="h-5 w-5" style={{ color: 'hsl(var(--primary-foreground))' }} />
              </div>
              <span className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                DNS Manager
              </span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex md:items-center md:gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'hsl(var(--foreground) / 0.7)' }}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex md:items-center md:gap-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                }}
              >
                登录控制台
              </button>
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                }}
              >
                开始使用
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="border-t md:hidden"
            style={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                  style={{ color: 'hsl(var(--foreground) / 0.7)' }}
                >
                  {link.label}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-3">
                <button
                  className="rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  登录控制台
                </button>
                <button
                  className="rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }}
                >
                  开始使用
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, hsl(var(--accent) / 0.05) 50%, hsl(var(--primary) / 0.03) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="text-center">
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              多平台域名统一管理系统
            </h1>
            <p
              className="mx-auto mt-6 max-w-2xl text-lg leading-8"
              style={{ color: 'hsl(var(--foreground) / 0.6)' }}
            >
              集中管理 DNSHE 与 DNSNeko 域名，安全存储 API 凭证，智能到期预警，一站式 DNS 记录管理
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                }}
              >
                立即开始
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
                style={{
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                }}
              >
                了解更多
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div
            className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8"
          >
            {[
              { value: '2+', label: '平台支持' },
              { value: '100%', label: 'API 覆盖' },
              { value: 'Cloudflare', label: '原生' },
              { value: '企业级', label: '安全' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-2xl font-bold sm:text-3xl"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  {stat.value}
                </div>
                <div
                  className="mt-1 text-sm"
                  style={{ color: 'hsl(var(--foreground) / 0.5)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              核心功能
            </h2>
            <p
              className="mt-4 text-lg"
              style={{ color: 'hsl(var(--foreground) / 0.6)' }}
            >
              一站式 DNS 管理解决方案
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border p-6 transition-shadow hover:shadow-md"
                style={{
                  background: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))',
                  }}
                >
                  <feature.icon
                    className="h-6 w-6"
                    style={{ color: 'hsl(var(--primary))' }}
                  />
                </div>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {feature.title}
                </h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: 'hsl(var(--foreground) / 0.6)' }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Support Section */}
      <section
        id="platforms"
        className="py-20 sm:py-28"
        style={{ background: 'hsl(var(--muted) / 0.5)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              支持平台
            </h2>
            <p
              className="mt-4 text-lg"
              style={{ color: 'hsl(var(--foreground) / 0.6)' }}
            >
              持续扩展的 DNS 平台生态
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="rounded-xl border p-6"
                style={{
                  background: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm"
                  style={{
                    background: 'hsl(var(--primary) / 0.1)',
                    color: 'hsl(var(--primary))',
                  }}
                >
                  {platform.name.slice(0, 2)}
                </div>
                <h3
                  className="text-xl font-semibold"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {platform.name}
                </h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: 'hsl(var(--foreground) / 0.6)' }}
                >
                  {platform.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {platform.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'hsl(var(--foreground) / 0.7)' }}
                    >
                      <ChevronRight
                        className="h-3 w-3"
                        style={{ color: 'hsl(var(--accent))' }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* More platforms placeholder */}
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <Globe
                className="mb-3 h-8 w-8"
                style={{ color: 'hsl(var(--foreground) / 0.3)' }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: 'hsl(var(--foreground) / 0.4)' }}
              >
                更多平台即将接入...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              安全设计
            </h2>
            <p
              className="mt-4 text-lg"
              style={{ color: 'hsl(var(--foreground) / 0.6)' }}
            >
              多层安全防护，保障数据安全
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {securityFeatures.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: 'hsl(var(--accent) / 0.1)',
                  }}
                >
                  <item.icon
                    className="h-6 w-6"
                    style={{ color: 'hsl(var(--accent))' }}
                  />
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: 'hsl(var(--foreground) / 0.6)' }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section
        id="steps"
        className="py-20 sm:py-28"
        style={{ background: 'hsl(var(--muted) / 0.5)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              快速上手
            </h2>
            <p
              className="mt-4 text-lg"
              style={{ color: 'hsl(var(--foreground) / 0.6)' }}
            >
              四步开启 DNS 管理之旅
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-1/2 top-6 hidden h-0.5 w-full lg:block"
                    style={{ background: 'hsl(var(--border))' }}
                  />
                )}
                <div
                  className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }}
                >
                  {step.number}
                </div>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-2 text-sm"
                  style={{ color: 'hsl(var(--foreground) / 0.6)' }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 sm:py-28"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            开始管理您的域名
          </h2>
          <div className="mt-8">
            <button
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              立即开始
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-8"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p
              className="text-sm"
              style={{ color: 'hsl(var(--foreground) / 0.5)' }}
            >
              &copy; {new Date().getFullYear()} DNS Manager. All rights reserved.
            </p>
            <div className="flex gap-6">
              {['文档', 'GitHub', '隐私政策'].map((link) => (
                <button
                  key={link}
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: 'hsl(var(--foreground) / 0.5)' }}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
