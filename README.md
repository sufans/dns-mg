# DNS Manager - 多平台域名统一管理系统

> 现代化、专业级的一体化域名管理控制台，面向 Cloudflare 原生部署，集中管理 DNSHE 与 DNSNeko 多平台域名与 DNS 记录。

## 功能特性

- 🌐 **统一域名管理** - 跨平台域名集中展示，搜索筛选排序，到期预警
- 📝 **DNS 记录管理** - 增删改查、批量操作、自定义列、搜索筛选
- 🔑 **API 账号管理** - 多平台凭证安全存储，一键测试连接
- 🔄 **智能同步** - 手动/定时同步，异步任务状态追踪
- 🔒 **安全设计** - JWT 认证、Cloudflare Secrets、速率限制
- 🌙 **明暗主题** - 支持亮色/暗色主题切换
- 📱 **响应式** - 桌面端高效操作，移动端折叠导航

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 4.x | 样式系统 |
| shadcn/ui 风格 | - | UI 组件库 |
| React Router | 7.x | 路由管理 |
| Zustand | 5.x | 状态管理 |
| TanStack Query | 5.x | 数据请求 |
| TanStack Table | 8.x | 表格组件 |
| Recharts | 2.x/3.x | 图表 |
| Sonner | 2.x | Toast 通知 |
| Vitest | 3.x | 测试框架 |

## 目录结构

```
src/
├── components/          # 组件
│   ├── ui/             # 基础 UI 组件 (Button, Card, Badge, Dialog, Table, etc.)
│   ├── feedback/       # 反馈组件 (CardSkeleton, TableSkeleton)
│   ├── auth/           # 认证组件 (LoginPage, SetupWizard, ProtectedRoute)
│   ├── landing/        # 官网落地页
│   ├── dashboard/      # 仪表盘
│   ├── domains/        # 域名管理
│   ├── dns-records/    # DNS 记录管理
│   ├── api-accounts/   # API 账号管理
│   ├── sync/           # 同步任务
│   ├── logs/           # 操作日志
│   └── security/       # 安全设置
├── layouts/            # 布局组件 (DashboardLayout)
├── hooks/              # 自定义 Hooks (useMediaQuery, useIsMobile)
├── lib/                # 工具函数与配置 (api, utils, mock-data)
├── stores/             # Zustand 状态管理 (auth, credentials)
├── types/              # TypeScript 类型定义
├── providers/          # DNS 平台 Provider 实现
│   ├── types.ts        # DomainProvider 接口定义
│   ├── registry.ts     # Provider 注册中心
│   ├── dnshe.ts        # DNSHE 平台实现
│   └── dnsneko.ts      # DNSNeko 平台实现
├── App.tsx             # 应用入口与路由配置
├── main.tsx            # 渲染入口 (QueryClient, Toaster)
└── index.css           # 全局样式与主题变量
```

## 开发环境搭建

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
pnpm build
```

### 运行测试

```bash
pnpm test           # 运行所有测试
pnpm test:watch     # 监听模式
pnpm test:coverage  # 生成覆盖率报告
```

### 代码检查

```bash
pnpm lint
```

### 预览生产构建

```bash
pnpm preview
```

## 配置说明

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_DNSHE_API_URL` | 否 | https://api005.dnshe.com/index.php | DNSHE API 地址 |
| `VITE_DNSNEKO_API_URL` | 否 | https://www.dnsneko.com/api/v1/dns | DNSNeko API 地址 |
| `VITE_JWT_EXPIRY` | 否 | 86400000 | JWT Token 过期时间（毫秒） |
| `VITE_CREDENTIAL_STORAGE` | 否 | local | 凭证存储方式 (local/cloudflare) |

### 创建环境变量文件

```bash
cp .env.example .env.local
```

---

## Cloudflare 部署指南

本项目为纯前端 SPA，推荐使用 **Cloudflare Pages** 部署。以下是完整的部署步骤。

### 方式一：通过 Cloudflare Dashboard 部署（推荐）

#### 步骤 1：推送代码到 GitHub

确保代码已推送到 GitHub 仓库（如 `sufans/dns-mg`）。

#### 步骤 2：创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create** → **Pages** 选项卡
3. 点击 **Connect to Git**
4. 选择你的 GitHub 仓库 `sufans/dns-mg`
5. 授权 Cloudflare 访问该仓库

#### 步骤 3：配置构建设置

在构建配置页面填写：

| 配置项 | 值 |
|--------|-----|
| **Production branch** | `main` |
| **Build command** | `pnpm build` |
| **Build output directory** | `dist` |
| **Root directory** | `/`（默认） |

> **注意**：如果 Cloudflare 未自动检测到 pnpm，需在环境变量中添加：
> - `NPM_FLAGS` = `--version`（确保使用 pnpm）
> - 或在项目根目录已有 `pnpm-lock.yaml` 文件，Cloudflare 会自动识别

#### 步骤 4：配置环境变量

在 **Environment variables** 部分添加（可选，均有默认值）：

```
VITE_DNSHE_API_URL = https://api005.dnshe.com/index.php
VITE_DNSNEKO_API_URL = https://www.dnsneko.com/api/v1/dns
VITE_JWT_EXPIRY = 86400000
VITE_CREDENTIAL_STORAGE = local
```

#### 步骤 5：部署

点击 **Save and Deploy**，Cloudflare 将自动构建并部署。

首次部署完成后，Cloudflare 会分配一个 `*.pages.dev` 域名，如：
```
https://dns-mg.pages.dev
```

#### 步骤 6：配置自定义域名（可选）

1. 在 Pages 项目设置中进入 **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名（如 `dns.example.com`）
4. 按照提示在域名 DNS 中添加 CNAME 记录：
   ```
   dns.example.com  CNAME  dns-mg.pages.dev
   ```
5. 等待 SSL 证书自动签发完成

### 方式二：通过 Wrangler CLI 部署

#### 前置条件

```bash
# 安装 Wrangler CLI
pnpm add -g wrangler

# 登录 Cloudflare 账号
wrangler login
```

#### 构建并部署

```bash
# 1. 构建生产版本
pnpm build

# 2. 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name=dns-mg
```

首次部署会自动创建项目，后续部署会更新现有项目。

#### 部署到生产环境

```bash
wrangler pages deploy dist --project-name=dns-mg --branch=main
```

#### 部署到预览环境

```bash
wrangler pages deploy dist --project-name=dns-mg --branch=preview
```

### 方式三：通过 GitHub Actions 自动部署

在仓库中创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name=dns-mg
```

需要在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加：
- `CLOUDFLARE_API_TOKEN`：从 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 创建，权限选择 **Cloudflare Pages:Edit**

### 配置 Cloudflare Secrets（高级）

如果选择 `cloudflare` 凭证存储模式，需要通过 Cloudflare Workers 的 Secrets 功能存储 API 凭证：

1. 进入 Cloudflare Dashboard → **Workers & Pages** → 选择项目
2. 进入 **Settings** → **Environment variables**
3. 添加加密变量：
   - `DNSHE_API_KEY` = 你的 DNSHE API Key
   - `DNSHE_API_SECRET` = 你的 DNSHE API Secret
   - `DNSNEKO_USERNAME` = 你的 DNSNeko 用户名
   - `DNSNEKO_API_KEY` = 你的 DNSNeko API Key
4. 选择 **Encrypt** 加密存储

> **注意**：Cloudflare Pages 纯静态站点无法直接访问 Workers Secrets。如需使用 Cloudflare Secrets 模式，需配合 Cloudflare Workers 作为 API 代理，通过 Worker 读取 Secrets 并代理 API 请求。

### CORS 代理配置

DNSHE 和 DNSNeko 的 API 可能不允许浏览器直接跨域请求。如遇 CORS 问题，可通过 Cloudflare Workers 设置 API 代理：

创建 `functions/api/[[path]].ts`：

```typescript
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // 验证目标 URL 是否为允许的 API 域名
  const allowedHosts = [
    'api005.dnshe.com',
    'www.dnsneko.com',
  ];

  const targetHost = new URL(targetUrl).hostname;
  if (!allowedHosts.includes(targetHost)) {
    return new Response('Host not allowed', { status: 403 });
  }

  // 转发请求
  const response = await fetch(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
  });

  // 添加 CORS 头
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', '*');

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
};
```

### 边缘运行时兼容说明

本项目前端为纯静态 SPA，兼容所有边缘运行时环境：
- Cloudflare Pages / Workers
- Vercel
- Netlify
- 任何静态文件服务器

所有 API 请求通过浏览器端 `fetch` 发送，不依赖服务端运行时。

---

## 支持平台

### DNSHE
- 子域名管理（列表、注册、详情、删除、续期）
- DNS 记录管理（列表、创建、更新、删除）
- API 密钥管理（列表、创建、删除、重新生成）
- 配额查询
- WHOIS 查询

### DNSNeko
- 域名管理（列表、详情）
- DNS 记录管理（查询、添加、修改、删除、暂停/启用）
- 批量操作（批量暂停/启用、批量删除、批量修改 TTL、批量修改线路）

### 扩展新平台

实现 `DomainProvider` 接口并注册到 `providerRegistry`：

```typescript
import { DomainProvider } from './types';

class MyProvider implements DomainProvider {
  readonly type = 'myplatform';
  readonly name = 'My Platform';
  readonly description = 'My DNS platform';

  // 实现所有接口方法...
}

providerRegistry.register(new MyProvider());
```

## 架构设计

### 认证系统

- 首次使用需通过 Setup Wizard 创建管理员账号
- 密码使用 SHA-256 + 用户名作为盐值进行哈希存储
- JWT Token 包含用户信息、签发者与过期时间，默认 24 小时有效期
- 路由守卫（ProtectedRoute）保护需认证的页面，Token 过期自动跳转登录

### API 客户端

- 内置速率限制（每分钟最多 50 次请求，按 method+host+path 维度）
- 自动重试机制（网络错误使用指数退避重试，429 响应自动等待重试）
- 统一错误处理与响应封装（`ApiResponse<T>`）
- 定期清理过期速率限制条目，防止内存泄漏

### 凭证存储

- API 凭证存储于 Zustand persist store，使用 Base64 编码
- 界面显示脱敏凭证（仅显示前4位和后4位）
- 支持本地存储与 Cloudflare Secrets 两种模式
- **注意**：当前为前端演示实现，生产环境应使用后端加密存储

### 主题系统

- 基于 CSS 自定义属性（HSL 色值）实现
- 通过 `.dark` 类名切换暗色主题
- 覆盖背景、前景、主色、强调色、边框等完整色板
- 主题偏好自动保存至 localStorage

## 排障指南

### 常见问题

**Q: 登录后页面空白**
A: 清除浏览器 localStorage（`localStorage.clear()`），刷新页面重新初始化账号。

**Q: API 连接测试失败**
A: 检查 API Key 和 Secret 是否正确，确认网络可访问目标 API 地址，检查是否存在 CORS 限制。如遇 CORS 问题，参考上方「CORS 代理配置」章节。

**Q: 域名列表为空**
A: 确认已正确配置 API 凭证，点击"同步域名"拉取最新数据。

**Q: 批量操作不可用**
A: 批量操作仅支持 DNSNeko 平台，DNSHE 平台暂不支持批量操作。

**Q: 暗色主题显示异常**
A: 确保浏览器支持 CSS 自定义属性，尝试清除缓存后刷新。

**Q: 请求频率限制**
A: API 客户端内置每分钟 50 次请求的速率限制，超出后需等待 1 分钟重置。如需调整，修改 `src/lib/api.ts` 中的 `maxRequestsPerMinute` 值。

**Q: Cloudflare Pages 部署后页面刷新 404**
A: 需要配置 SPA 回退路由。在 Pages 项目设置中添加 `_redirects` 文件到 `public/` 目录，内容为 `/* /index.html 200`。或使用 `_routes.json` 配置。

**Q: pnpm 未被 Cloudflare 识别**
A: 确保项目根目录包含 `pnpm-lock.yaml` 文件。Cloudflare Pages 会根据 lock 文件自动检测包管理器。

## 许可证

MIT
