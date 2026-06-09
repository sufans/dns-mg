# DNS Manager - 多平台域名统一管理系统

> 面向 Cloudflare 原生部署的一体化域名管理控制台，集中管理 DNSHE 与 DNSNeko 多平台域名与 DNS 记录。

## 功能特性

- 🌐 **统一域名管理** - 跨平台域名集中展示，搜索筛选排序，到期预警
- 📝 **DNS 记录管理** - 增删改查、批量操作、自定义列、搜索筛选
- 🔑 **API 账号管理** - 多平台凭证安全存储，一键测试连接
- 🔄 **智能同步** - 手动/定时同步，异步任务状态追踪
- 🔒 **安全设计** - JWT 认证、Cloudflare Secrets、速率限制
- 🌙 **明暗主题** - 支持亮色/暗色主题切换
- 📱 **响应式** - 桌面端高效操作，移动端折叠导航

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test
```

> 前置要求：Node.js >= 18, pnpm >= 8

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_DNSHE_API_URL` | https://api005.dnshe.com/index.php | DNSHE API 地址 |
| `VITE_DNSNEKO_API_URL` | https://www.dnsneko.com/api/v1/dns | DNSNeko API 地址 |
| `VITE_JWT_EXPIRY` | 86400000 | JWT Token 过期时间（毫秒） |
| `VITE_CREDENTIAL_STORAGE` | local | 凭证存储方式 (local/cloudflare) |

```bash
cp .env.example .env.local
```

---

## Cloudflare 部署指南

本项目为纯前端 SPA，推荐使用 **Cloudflare Pages** 部署。提供三种部署方式：

### 方式一：Dashboard 部署（推荐）

**1. 推送代码到 GitHub**

确保代码已推送到 GitHub 仓库。

**2. 创建 Pages 项目**

登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 选择你的 GitHub 仓库。

**3. 配置构建设置**

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Build command | `pnpm build` |
| Build output directory | `dist` |

> 项目根目录包含 `pnpm-lock.yaml`，Cloudflare 会自动识别 pnpm。如未识别，添加环境变量 `NPM_FLAGS=--version`。

**4. 配置环境变量（可选）**

在 **Environment variables** 中添加所需变量（均有默认值，可跳过）。

**5. 部署**

点击 **Save and Deploy**，部署完成后访问 `https://<项目名>.pages.dev`。

**6. 自定义域名（可选）**

Pages 项目设置 → **Custom domains** → 添加域名 → 按提示添加 CNAME 记录指向 `<项目名>.pages.dev` → 等待 SSL 签发。

### 方式二：Wrangler CLI 部署

```bash
# 安装并登录
pnpm add -g wrangler
wrangler login

# 构建并部署
pnpm build
wrangler pages deploy dist --project-name=dns-mg

# 指定分支
wrangler pages deploy dist --project-name=dns-mg --branch=main   # 生产
wrangler pages deploy dist --project-name=dns-mg --branch=preview # 预览
```

### 方式三：GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

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

在 GitHub 仓库 **Settings → Secrets → Actions** 添加 `CLOUDFLARE_API_TOKEN`（[创建 Token](https://dash.cloudflare.com/profile/api-tokens)，权限选择 **Cloudflare Pages:Edit**）。

### Cloudflare Secrets 配置

选择 `cloudflare` 凭证存储模式时，需配置加密环境变量：

1. Dashboard → **Workers & Pages** → 选择项目 → **Settings** → **Environment variables**
2. 添加加密变量：`DNSHE_API_KEY`、`DNSHE_API_SECRET`、`DNSNEKO_USERNAME`、`DNSNEKO_API_KEY`
3. 选择 **Encrypt** 加密存储

> **注意**：纯静态站点无法直接访问 Workers Secrets，需配合 Cloudflare Workers 作为 API 代理。

### CORS 代理

如遇 API 跨域问题，创建 `functions/api/[[path]].ts` 作为代理：

```typescript
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) return new Response('Missing url', { status: 400 });

  const allowedHosts = ['api005.dnshe.com', 'www.dnsneko.com'];
  const targetHost = new URL(targetUrl).hostname;
  if (!allowedHosts.includes(targetHost)) return new Response('Forbidden', { status: 403 });

  const response = await fetch(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
  });

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');

  return new Response(response.body, { status: response.status, headers });
};
```

### SPA 路由回退

项目已内置 `public/_redirects` 文件（`/* /index.html 200`），确保 SPA 刷新不 404。

---

## 支持平台

| 平台 | 域名管理 | DNS 记录 | 批量操作 | 其他 |
|------|---------|---------|---------|------|
| **DNSHE** | 子域名 CRUD、续期 | CRUD | - | API 密钥管理、配额查询、WHOIS |
| **DNSNeko** | 列表、详情 | CRUD、暂停/启用 | 批量删除/TTL/线路/状态 | - |

扩展新平台：实现 `DomainProvider` 接口并注册到 `providerRegistry`。

## 排障指南

| 问题 | 解决方案 |
|------|---------|
| 登录后页面空白 | 清除 localStorage（`localStorage.clear()`），刷新重新初始化 |
| API 连接测试失败 | 检查凭证是否正确，确认网络可达，检查 CORS 限制 |
| 域名列表为空 | 确认已配置 API 凭证，点击"同步域名" |
| 批量操作不可用 | 批量操作仅支持 DNSNeko 平台 |
| Pages 部署后刷新 404 | 已内置 `_redirects`，如仍 404 检查文件是否在 `dist/` 中 |
| pnpm 未被识别 | 确保根目录包含 `pnpm-lock.yaml` |

## 许可证

MIT
