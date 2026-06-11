# Cloudflare DNS Manager

生产级、单管理员、零外部后端服务的多域名 DNS 统一管理平台。基于 Cloudflare Pages + Pages Functions + D1 SQLite 构建，集中管理 DNSHE 与 DNSNEKO 两个平台的域名和 DNS 记录。

## 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                      浏览器 (React SPA)                       │
│  src/pages/  src/components/  src/hooks/  src/lib/           │
│  LoginPage  DashboardPage  DomainsPage  AccountsPage ...     │
│  TanStack React Query v5  ───  apiFetch() ──────────┐       │
└──────────────────────────────────────────────────────┼──────┘
                                                       │
┌──────────────────────────────────────────────────────┼──────┐
│              Cloudflare Pages Functions (后端)         │      │
│  functions/_middleware.ts  ← 全局安全头 / CORS         │      │
│  functions/api/                                        │      │
│    auth/login.ts  logout.ts  me.ts  refresh.ts         │      │
│    accounts/     domains/     records/                 │      │
│    groups/       settings/    logs/      backup/       │      │
│    automation/check-expiry.ts  ← 定时到期检查           │      │
│                                                       │      │
│  functions/_shared/  ← 共享模块                        │      │
│    auth.ts       JWT + CSRF + 二次验证                 │      │
│    crypto.ts     AES-GCM 加密 / 解密 API 密钥           │      │
│    jwt.ts        HMAC-SHA256 JWT 签发与验证             │      │
│    cookies.ts    HttpOnly Session + CSRF Cookie         │      │
│    db.ts         账号解密 / 脱敏 / D1 查询封装           │      │
│    fetcher.ts    上游 API 请求 + 自动重试                │      │
│    rate-limit.ts 登录失败锁定 + 平台 API 限流             │      │
│    logger.ts     操作审计日志                            │      │
│    validators.ts Zod 输入校验                            │      │
│    response.ts   统一 API 响应格式 + 安全头               │      │
│    domain-cache.ts  域名列表缓存                         │      │
│                                                       │      │
│    platforms/     ← 上游 DNS 平台适配器                  │      │
│      dnshe.ts    DNSHE V2 API (X-API-Key/Secret)       │      │
│      dnsneko.ts  DNSNEKO API (X-DNSNEKO-*)             │      │
│      factory.ts  适配器工厂函数                          │      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────┐
│              Cloudflare D1 (SQLite)                      │
│                                                         │
│  api_accounts    加密存储的 API 账号                       │
│  api_groups      账号分组                                 │
│  domain_cache    域名列表缓存                              │
│  operation_logs  操作审计日志                              │
│  login_attempts  登录失败锁定状态                           │
│  api_rate_limits 平台 API 调用限流                         │
│  settings        系统设置                                 │
└─────────────────────────────────────────────────────────┘
```

### 认证流程

```
登录 POST /api/auth/login
  │
  ├─ 校验 ADMIN_USERNAME + ADMIN_PASSWORD_HASH (bcrypt)
  ├─ HMAC-SHA256 签发 JWT (含 csrf token, 24h 有效期)
  ├─ Set-Cookie: __Host-dns_session (HttpOnly, Secure, SameSite=Strict)
  ├─ Set-Cookie: dns_csrf (Secure, SameSite=Strict, JS 可读)
  └─ 返回 { username, csrf, expiresIn }

后续请求
  │
  ├─ _middleware.ts → 所有响应附加安全头 (CSP, X-Frame-Options, etc.)
  ├─ GET/HEAD/OPTIONS → requireAuth() → 仅验证 JWT
  └─ POST/PUT/DELETE  → requireAuth() → 验证 JWT + Origin/Referer + X-CSRF-Token
```

## Cloudflare Pages 部署指南

### 前提条件

- Cloudflare 账号
- 已创建的 GitHub 仓库（包含本项目代码）
- 本地安装 Node.js >= 20.19.0、npm、Wrangler CLI

### 步骤 1：创建 D1 数据库

```bash
# 登录 Wrangler
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create dns_manager
```

命令会输出类似：

```
✅ Created database 'dns_manager' with id: abc123-def456-...
```

记录返回的 `database_id`，填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "dns_manager"
database_id = "abc123-def456-..."   # ← 替换为实际 ID
```

执行建表 SQL：

```bash
npx wrangler d1 execute dns_manager --remote --file=d1/schema.sql
```

### 步骤 2：生成密钥和密码哈希

```bash
# 生成 JWT_SECRET / ENCRYPTION_KEY 随机密钥（每次运行不同）
npm run secret:key

# 生成管理员密码的 bcrypt 哈希
npm run secret:password -- "你的强密码"
```

将输出的值记录下来，下一步需要填入环境变量。

### 步骤 3：Cloudflare Pages 项目配置

进入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create → Pages → Connect to Git。

| 配置项 | 值 |
|--------|-----|
| Framework preset | **None**（或 Vite，若可选） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

**重要：** 不要在 Pages 设置中指定 Framework preset 为 Vite，直接使用自定义命令。Cloudflare Pages 构建环境默认 `npm@10.x` / `node@22.x`。

### 步骤 4：配置环境变量

Pages 项目 → Settings → Environment variables → Add variable。

**生产环境变量（Production）：**

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `ADMIN_USERNAME` | 是 | 管理员登录用户名 | `admin` |
| `ADMIN_PASSWORD_HASH` | 是 | 管理员密码的 bcrypt 哈希（**禁止明文**） | `$2a$10$...` |
| `JWT_SECRET` | 是 | JWT HMAC-SHA256 签名密钥（≥32 字符随机串） | 用 `npm run secret:key` 生成 |
| `ENCRYPTION_KEY` | 是 | API 账号配置 AES-GCM 加密密钥（32 字节 Base64） | 用 `npm run secret:key` 生成 |
| `APP_ORIGIN` | **强烈建议** | 生产域名，用于 CSRF Origin/Referer 校验 | `https://dns.yourdomain.com` |
| `AUTOMATION_SECRET` | 可选 | 定时到期检查的专用调用密钥 | `npm run secret:key` 生成 |
| `LOG_RETENTION_DAYS` | 可选 | 操作日志保留天数（默认 90） | `90` |
| `EMAIL_FROM` | 可选 | 到期提醒发件人地址 | `dns@yourdomain.com` |
| `EMAIL_TO` | 可选 | 到期提醒收件人地址 | `you@example.com` |

> 变量说明：所有 "Production" 变量在 Pages 构建和 Functions 运行时均可访问。没有 "Preview" 环境变量需求时留空即可。

### 步骤 5：配置 D1 Database Binding

Pages 项目 → Settings → Functions → D1 database bindings → Add binding。

| Binding name | Database |
|-------------|----------|
| `DB` | `dns_manager` |

### 步骤 6：（可选）配置 Email Routing 发信

若需要域名到期邮件提醒功能：

1. 在 Cloudflare Dashboard 中为你的域名启用 **Email Routing**，验证至少一个目标邮箱
2. Pages 项目 → Settings → Functions → Email bindings → Add binding
3. 配置 `SEND_EMAIL` binding，限制发信目标地址（不限制可不填 destination）

在 `wrangler.toml` 中的对应配置：

```toml
[[send_email]]
name = "SEND_EMAIL"
# destination_address = "you@example.com"  # 可选：限制收件人
```

同时确保 `EMAIL_FROM` 和 `EMAIL_TO` 环境变量已正确设置：

- `EMAIL_FROM` 的域名必须是已启用 Email Routing 的域名
- `EMAIL_TO` 是目标收件人地址

### 步骤 7：首次部署

推送代码到 GitHub 仓库后，Cloudflare Pages 会自动触发构建和部署。构建日志中关键检查点：

```
Installing project dependencies: npm clean-install  ← 应成功完成
> tsc -b && vite build                               ← 应无错误
```

部署成功后，访问 Pages 分配的域名（如 `https://dns-manager-xxx.pages.dev`）或自定义域名，使用配置的管理员用户名和密码登录。

## 环境变量完整参考

### 认证相关

| 变量 | 类型 | 必填 | 用途 | 安全要求 |
|------|------|------|------|----------|
| `ADMIN_USERNAME` | string | 是 | 管理员登录用户名，与登录表单输入的 username 比对 | 不要太简单 |
| `ADMIN_PASSWORD_HASH` | string | 是 | 管理员密码的 bcrypt 哈希值 | **必须**是 bcrypt `$2a$`/`$2b$` 格式，绝不能是明文 |
| `JWT_SECRET` | string | 是 | HMAC-SHA256 签名密钥，用于签发和验证 JWT | ≥32 字节随机字符串，泄露后需立即更换 |
| `APP_ORIGIN` | string | 建议 | 生产域名完整 URL，用于校验请求 `Origin`/`Referer` 头 | 必须以 `https://` 开头，不含尾部 `/` |

### 加密相关

| 变量 | 类型 | 必填 | 用途 | 安全要求 |
|------|------|------|------|----------|
| `ENCRYPTION_KEY` | string | 是 | AES-GCM 加密密钥，用于加密存储 D1 中的 API 账号配置 | 推荐 32 字节 Base64URL。**泄露后所有已存 API 密钥将暴露，必须重新录入** |

`ENCRYPTION_KEY` 支持两种格式：
1. **32 字节 Base64URL** → 直接作为 AES-256 密钥（推荐）
2. **任意字符串** → 自动 SHA-256 派生为 256 位密钥

### 自动化相关

| 变量 | 类型 | 必填 | 用途 |
|------|------|------|------|
| `AUTOMATION_SECRET` | string | 可选 | 调用 `/api/automation/check-expiry` 时的鉴权密钥（`X-Automation-Secret` 头） |

### 邮件提醒相关

| 变量 | 类型 | 必填 | 用途 | 前提条件 |
|------|------|------|------|----------|
| `EMAIL_FROM` | string | 可选 | 提醒邮件发件人地址 | 域名需已启用 Email Routing |
| `EMAIL_TO` | string | 可选 | 提醒邮件收件人地址 | 需验证的目标邮箱 |

### 系统设置相关

| 变量 | 类型 | 必填 | 默认值 | 用途 |
|------|------|------|--------|------|
| `LOG_RETENTION_DAYS` | string (数字) | 可选 | `90` | 操作日志自动清理天数，最小值 7 天 |

### Bindings（非环境变量，在 Pages Functions 绑定中配置）

| Binding | 类型 | 用途 |
|---------|------|------|
| `DB` | D1 Database | 数据库绑定，指向 `dns_manager` |
| `SEND_EMAIL` | send_email | Email Routing 发信绑定，用于发送到期提醒邮件 |

## 目录结构

```
cloudflare-dns-manager/
├── public/
│   ├── _routes.json          # Pages Functions 路由清单（排除静态资源）
│   └── favicon.svg
├── src/                      # React 前端 (SPA)
│   ├── components/
│   │   ├── layout/Shell.tsx  # 侧边栏 + 顶栏布局骨架
│   │   ├── ui/               # 通用 UI 组件 (button, input, table, select...)
│   │   ├── StatCard.tsx      # 统计卡片
│   │   └── ConfirmPasswordDialog.tsx  # 二次密码验证弹窗
│   ├── hooks/useAuth.ts      # 认证状态 Hook
│   ├── lib/
│   │   ├── api.ts            # HTTP 客户端 (自动 CSRF、统一错误处理)
│   │   ├── query.ts          # TanStack React Query Client 实例
│   │   ├── router.ts         # 前端路由 (history pushState)
│   │   └── utils.ts          # 日期格式化等工具函数
│   ├── pages/                # 页面组件
│   │   ├── LoginPage.tsx     # 登录页
│   │   ├── DashboardPage.tsx # 仪表盘 (统计概览)
│   │   ├── AccountsPage.tsx  # API 账号管理
│   │   ├── GroupsPage.tsx    # 分组管理
│   │   ├── DomainsPage.tsx   # 跨平台域名列表
│   │   ├── DomainDetailPage.tsx # 域名详情 + DNS 记录管理
│   │   ├── SettingsPage.tsx  # 系统设置
│   │   ├── LogsPage.tsx      # 操作日志
│   │   └── BackupPage.tsx   # 备份恢复
│   ├── types/models.ts       # 前端类型定义
│   ├── App.tsx               # 应用入口 (路由分发)
│   ├── index.css             # Tailwind + CSS 变量
│   └── main.tsx              # React 渲染入口
├── functions/                # Cloudflare Pages Functions (后端)
│   ├── _middleware.ts        # 全局中间件 (安全头 + CORS)
│   ├── _shared/              # 共享模块 (见架构图)
│   └── api/                  # REST API
│       ├── auth/             # 登录/登出/状态/刷新
│       ├── accounts/         # API 账号 CRUD + 导入导出
│       ├── domains/          # 域名列表/详情/导出/刷新
│       ├── records/          # DNS 记录 CRUD + 批量操作
│       ├── groups/           # 账号分组管理
│       ├── settings/         # 系统设置
│       ├── logs/             # 操作日志查询
│       ├── backup/           # 备份导出/导入
│       └── automation/       # 自动化到期检查
├── d1/
│   ├── schema.sql            # D1 完整建表语句 + 默认数据
│   └── migrate.sql           # 迁移 SQL (如有)
├── scripts/
│   ├── hash-password.mjs     # bcrypt 密码哈希生成
│   └── generate-secret.mjs   # 随机密钥生成
├── wrangler.toml             # Wrangler 配置 (D1 binding, send_email binding)
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.functions.json
├── tailwind.config.js
└── eslint.config.js
```

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18 |
| 类型系统 | TypeScript | 5 |
| CSS 框架 | Tailwind CSS | 3 |
| 状态管理 | TanStack React Query | 5 |
| 数据校验 | Zod | 3 |
| 图标 | Lucide React | 0.468 |
| 构建工具 | Vite | 6 |
| 后端运行时 | Cloudflare Pages Functions | - |
| 数据库 | Cloudflare D1 (SQLite) | - |
| 加密 | Web Crypto API (AES-GCM) | - |
| 密码哈希 | bcryptjs | 2 |
| 认证 | 自实现 JWT (HMAC-SHA256) | - |

## 上游平台对接说明

| 平台 | API Base URL | 认证方式 | 主要模块 |
|------|-------------|----------|----------|
| DNSHE | `https://api005.dnshe.com/index.php?m=domain_hub` | `X-API-Key` + `X-API-Secret` HTTP Header | `subdomains`, `dns_records` |
| DNSNEKO | `https://www.dnsneko.com/api/v1/dns` | `X-DNSNEKO-USERNAME` + `X-DNSNEKO-API-KEY` HTTP Header | `/domains`, `/records` |

所有上游 API 调用均在 Cloudflare Pages Functions 端完成，浏览器不会接触上游 API 密钥。

### 限流参数

| 平台 | 账号级限流 | 窗口 |
|------|----------|------|
| DNSHE | 55 次/窗口 | 60 秒 |
| DNSNEKO | 28 次/窗口 (账号), 58 次/窗口 (IP) | 60 秒 |

## 本地开发

```bash
# 安装依赖
npm install

# 初始化本地 D1 数据库
npm run d1:init:local

# 仅启动前端开发服务器 (Vite)
npm run dev

# 构建并启动完整 Pages Functions 本地环境
npm run pages:dev

# 类型检查
npm run typecheck

# 代码规范检查
npm run lint

# 代码格式化
npm run format
```

本地开发时的 secrets 放入 `.dev.vars`（不要提交到 Git）：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$...
JWT_SECRET=your-dev-jwt-secret
ENCRYPTION_KEY=your-dev-encryption-key
```

## 自动化到期检查

### 端点

```http
POST /api/automation/check-expiry
X-Automation-Secret: <AUTOMATION_SECRET>
```

该端点循环遍历所有启用的 API 账号，拉取域名列表并对比到期天数设置，可选发送邮件提醒。

### 创建 Cron Worker

Pages Functions 不支持原生 Cron trigger，需要创建一个极简 Cloudflare Worker 作为定时触发器：

1. 在 Cloudflare Dashboard 创建 Worker
2. 配置环境变量：`APP_URL`（Pages 项目域名）、`AUTOMATION_SECRET`
3. 使用如下代码：

```ts
export default {
  async scheduled(_event: ScheduledEvent, env: { APP_URL: string; AUTOMATION_SECRET: string }) {
    await fetch(`${env.APP_URL}/api/automation/check-expiry`, {
      method: 'POST',
      headers: { 'X-Automation-Secret': env.AUTOMATION_SECRET }
    });
  }
};
```

4. 在 Worker → Settings → Cron Triggers 中添加定时任务（建议每天一次，如 `0 8 * * *`）

## 安全设计

本项目的安全设计说明详见 `docs/SECURITY.md`。要点：

- **认证**：单管理员，凭证全部来自 Cloudflare 环境变量，bcrypt 哈希，不上传明文
- **会话**：JWT 24 小时过期，HttpOnly `__Host-dns_session` Cookie
- **CSRF**：非 GET 请求必须携带 `X-CSRF-Token` + `Origin`/`Referer` 同源校验
- **加密存储**：API 密钥使用 AES-GCM 加密后存入 D1，密钥由 `ENCRYPTION_KEY` 提供
- **登录保护**：同一 IP 5 次失败后锁定 15 分钟
- **HTTP 安全头**：CSP、X-Frame-Options、X-Content-Type-Options、Referrer-Policy 等
- **输入校验**：所有 API 输入使用 Zod schema 校验
- **操作审计**：全部关键操作写入 `operation_logs` 表

## 生产注意事项

1. 不要把 `.dev.vars`、`.env`、明文密码或 API 密钥提交到 Git（`.gitignore` 已包含）
2. `ADMIN_PASSWORD_HASH` 必须是 bcrypt 哈希，**绝对不能是明文**
3. 一旦部署后修改 `ENCRYPTION_KEY`，所有已存储的 API 账号密钥将无法解密，需要重新录入
4. 如果修改了 `JWT_SECRET`，所有已登录会话立即失效
5. 部署到 Cloudflare Pages 后 Domain 会自动分配 `*.pages.dev` 二级域名，生产使用建议绑定自定义域名

## 许可

MIT