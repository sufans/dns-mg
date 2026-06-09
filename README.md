# DNS Manager - API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控与使用统计。

## 架构概览

```
┌─────────────────────────────────────────────┐
│                  浏览器                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │ React   │  │ Zustand  │  │ Provider  │  │
│  │ UI 层   │←→│ 状态管理 │←→│ 抽象层    │  │
│  └─────────┘  └──────────┘  └─────┬─────┘  │
│                                   │         │
│                              ┌────┴────┐    │
│                              │ API     │    │
│                              │ Client  │    │
│                              └────┬────┘    │
└───────────────────────────────────┼─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼                               ▼
            ┌──────────────┐                ┌──────────────┐
            │   DNSHE API  │                │ DNSNeko API  │
            └──────────────┘                └──────────────┘
```

### 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| UI 组件 | `src/components/ui/` | Button, Card, Badge, Dialog, Table 等基础组件 |
| 页面组件 | `src/components/` | 概览、账号管理、操作日志、设置 |
| 状态管理 | `src/stores/` | 认证状态、多账号凭证管理 |
| Provider 层 | `src/providers/` | DNSHE/DNSNeko API 抽象与实现 |
| 类型定义 | `src/types/` | 全局 TypeScript 类型 |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/sufans/dns-mg.git
cd dns-mg

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test
```

## 多账号配置

系统支持同一平台配置多个 API 账号，每个账号独立管理凭证、状态与使用统计。

### 添加账号

1. 进入「API 账号管理」页面
2. 点击「添加账号」
3. 选择平台（DNSHE / DNSNeko）
4. 填写 API 凭证
5. 设置账号标签（如"生产环境"、"测试账号"）
6. 可选：添加标签、设为默认账号
7. 点击「测试连接」验证凭证
8. 保存

### 默认账号

每个平台有且仅有一个默认账号。系统自动将首个添加的账号设为默认。手动设置默认账号时，同平台其他账号的默认标记自动取消。

### 账号切换

在账号卡片中点击「设为默认」即可切换当前活跃账号。

### 凭证安全

- API 凭证使用 **AES-GCM 加密**存储于浏览器 localStorage（密钥通过 PBKDF2 派生）
- 旧版 Base64 编码凭证会自动迁移至 AES-GCM 加密格式
- 界面默认脱敏显示（`cfsd****xxxx`）
- 点击眼睛图标可切换明文/脱敏显示
- **生产环境建议**：使用 Cloudflare Secrets 或后端加密存储

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_DNSHE_API_URL` | `https://api005.dnshe.com/index.php` | DNSHE API 地址 |
| `VITE_DNSNEKO_API_URL` | `https://www.dnsneko.com/api/v1/dns` | DNSNeko API 地址 |
| `VITE_JWT_EXPIRY` | `86400000` | JWT Token 过期时间（毫秒） |
| `VITE_CREDENTIAL_STORAGE` | `local` | 凭证存储方式 |

```bash
cp .env.example .env.local
# 编辑 .env.local 配置环境变量
```

## Cloudflare 部署

DNS Manager 原生支持 Cloudflare 部署，支持 **Pages** 和 **Workers** 两种模式。

### 部署模式对比

| 模式 | 凭证存储 | 适用场景 | 复杂度 |
|------|----------|----------|--------|
| **Pages（纯前端）** | localStorage AES-GCM 加密 | 个人/小团队 | 低 |
| **Workers（推荐）** | Cloudflare Secrets | 企业/多用户 | 中 |

---

### 模式一：Cloudflare Pages（纯前端）

凭证存储在浏览器 localStorage 中，使用 AES-GCM 加密。适合个人使用或不需要后端代理的场景。

#### Dashboard 部署（推荐）

1. Fork 本仓库到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git
3. 选择 Fork 的仓库，构建设置：

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Build command | `pnpm build` |
| Build output | `dist` |

4. 点击「Save and Deploy」，等待构建完成
5. 部署后访问 `https://<project-name>.pages.dev`

#### Wrangler CLI 部署

```bash
# 安装 wrangler 并登录
pnpm add -g wrangler
wrangler login

# 构建
pnpm install
pnpm build

# 部署到 Pages
wrangler pages deploy dist --project-name=dns-mg
```

---

### 模式二：Cloudflare Workers（推荐）

使用 Cloudflare Workers 作为后端代理，API 凭证存储在 **Cloudflare Secrets** 中，前端不存储任何凭证。适合企业环境或需要更高安全性的场景。

#### 架构

```
浏览器 ──→ Cloudflare Workers ──→ DNSHE / DNSNeko API
              │
              └── Secrets (API 凭证)
```

#### 1. 创建 Workers 项目

```bash
# 创建项目目录
mkdir dns-mgr-worker && cd dns-mgr-worker

# 初始化
wrangler init --yes
```

#### 2. 配置 Secrets

```bash
# 设置 DNSHE 凭证
wrangler secret put DNSHE_API_KEY
# 输入你的 DNSHE API Key

wrangler secret put DNSHE_API_SECRET
# 输入你的 DNSHE API Secret

# 设置 DNSNeko 凭证（如有）
wrangler secret put DNSNEKO_USERNAME
wrangler secret put DNSNEKO_API_KEY
```

#### 3. 编写 Worker 代理（`src/index.ts`）

```typescript
export interface Env {
  DNSHE_API_KEY: string;
  DNSHE_API_SECRET: string;
  DNSNEKO_USERNAME: string;
  DNSNEKO_API_KEY: string;
}

const DNSHE_API_URL = 'https://api005.dnshe.com/index.php';
const DNSNEKO_API_URL = 'https://www.dnsneko.com/api/v1/dns';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    let targetUrl: string;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (path.startsWith('/api/dnshe')) {
      targetUrl = `${DNSHE_API_URL}${path.replace('/api/dnshe', '')}`;
      headers['X-API-Key'] = env.DNSHE_API_KEY;
      headers['X-API-Secret'] = env.DNSHE_API_SECRET;
    } else if (path.startsWith('/api/dnsneko')) {
      targetUrl = `${DNSNEKO_API_URL}${path.replace('/api/dnsneko', '')}`;
      headers['X-Username'] = env.DNSNEKO_USERNAME;
      headers['X-API-Key'] = env.DNSNEKO_API_KEY;
    } else {
      return new Response('Not Found', { status: 404 });
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    return new Response(response.body, {
      status: response.status,
      headers: corsHeaders,
    });
  },
};
```

#### 4. 部署 Worker

```bash
wrangler deploy
```

#### 5. 前端配置

部署前端到 Cloudflare Pages 时，设置环境变量：

```bash
# .env.production
VITE_API_PROXY_URL=https://dns-mgr-worker.<your-subdomain>.workers.dev
```

在应用设置中将「凭证存储方式」切换为 **Cloudflare Secrets**（设置 → Cloudflare 适配配置）。

---

### 模式三：Pages + Functions（混合部署）

使用 Cloudflare Pages 的 Functions 功能（基于 Workers），在同一个项目中同时部署前端和后端代理。

#### 1. 项目结构

```
dns-mg/
├── functions/           # Pages Functions（后端代理）
│   ├── api/
│   │   ├── dnshe/[[path]].ts
│   │   └── dnsneko/[[path]].ts
│   └── _middleware.ts   # CORS 中间件
├── src/                 # React 前端
├── dist/                # 构建输出
└── wrangler.toml
```

#### 2. Functions 代理（`functions/api/dnshe/[[path]].ts`）

```typescript
interface Env {
  DNSHE_API_KEY: string;
  DNSHE_API_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/dnshe', '');
  const targetUrl = `https://api005.dnshe.com/index.php${path}`;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.DNSHE_API_KEY,
      'X-API-Secret': env.DNSHE_API_SECRET,
    },
    body: request.method !== 'GET' ? await request.text() : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
```

#### 3. CORS 中间件（`functions/_middleware.ts`）

```typescript
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
};
```

#### 4. 配置 wrangler.toml

```toml
name = "dns-mg"
compatibility_date = "2024-01-01"

[env.production]
# Secrets 通过 wrangler secret put 设置
```

#### 5. 部署

```bash
# 设置 Secrets
wrangler pages secret put DNSHE_API_KEY --project-name=dns-mg
wrangler pages secret put DNSHE_API_SECRET --project-name=dns-mg

# 构建并部署
pnpm build
wrangler pages deploy dist --project-name=dns-mg
```

---

### GitHub Actions 自动部署

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare
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

需要配置 GitHub Secrets：
- `CLOUDFLARE_API_TOKEN`：在 Cloudflare Dashboard → My Profile → API Tokens → Create Token → Custom token（Zone:Read, Cloudflare Pages:Edit）

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| 登录后页面空白 | 清除 localStorage（`localStorage.clear()`），刷新重新初始化 |
| API 连接测试失败 | 检查凭证是否正确，确认网络可达，检查 CORS 限制 |
| 账号列表为空 | 首次使用需添加 API 账号 |
| 无法添加同平台第二个账号 | 确认账号标签不同，系统支持同平台多账号 |
| Pages 部署后刷新 404 | 已内置 `_redirects`，检查 `dist/` 中是否包含 |
| 请求频率限制 | 默认 50 次/分钟，可在设置页调整 |

## 许可证

MIT
