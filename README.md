# DNS Manager - 多域名解析平台统一管理系统

基于 Cloudflare Pages + D1 的轻量级 DNS 管理平台，统一管理 DNSHE 和 DNSNEKO 两个 DNS 解析平台的域名与记录。

## 功能特性

- **统一管理** — 聚合 DNSHE / DNSNEKO 多平台域名，一站式查看与操作
- **DNS 记录 CRUD** — 跨平台统一的记录增删改查，支持 A/AAAA/CNAME/MX/TXT/NS/SRV/CAA 等记录类型
- **批量操作** — DNSNEKO 平台支持批量启用/暂停/删除/修改TTL/修改线路
- **到期预警** — 自动检测域名到期时间，30天/7天/已过期三级预警
- **邮件提醒** — Cron 定时任务自动检测到期域名，通过邮件发送提醒
- **安全认证** — JWT 单管理员认证，bcrypt 密码哈希，登录限流（5次失败锁定15分钟）
- **加密存储** — API 密钥 AES-256-GCM 加密存储
- **操作审计** — 完整的操作日志记录与查询
- **数据备份** — 一键备份/恢复，加密导出
- **深色主题** — 深蓝底色 + 蓝紫霓虹渐变强调色，支持深色/浅色/跟随系统

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript 5 + Tailwind CSS v3 + shadcn/ui |
| 状态管理 | TanStack React Query v5 |
| 后端 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1 (SQLite) |
| 认证 | JWT (jose) + bcrypt (bcryptjs) |
| 加密 | AES-256-GCM (Web Crypto API) |
| 邮件 | MailChannels API |
| 定时任务 | Cloudflare Cron Triggers |

## 部署指南

### 前提条件

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- [Cloudflare 账号](https://dash.cloudflare.com/)，已开通 Pages 和 D1
- 一个已接入 Cloudflare 的域名（用于邮件发送）

### 第一步：克隆项目

```bash
git clone <your-repo-url> dns-manager
cd dns-manager
npm install
```

### 第二步：创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create dns-manager-db
```

执行后会输出数据库信息，其中 `database_id` 需要填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "dns-manager-db"
database_id = "你的数据库ID"   # ← 替换这里
```

### 第三步：初始化数据库

```bash
# 本地开发环境
wrangler d1 execute dns-manager-db --local --file=migrations/0001_init.sql

# 生产环境
wrangler d1 execute dns-manager-db --remote --file=migrations/0001_init.sql
```

### 第四步：生成密钥

运行以下命令生成所需的安全密钥：

```bash
# 生成管理员密码的 bcrypt 哈希
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('你的管理员密码', 10));"

# 生成 JWT 密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"

# 生成加密密钥（用于加密 API 凭据）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

### 第五步：配置环境变量

编辑 `wrangler.toml`，填入生成的密钥：

```toml
[vars]
ADMIN_USERNAME = "admin"                    # 管理员用户名
ADMIN_PASSWORD_HASH = "$2a$10$..."           # bcrypt 哈希密码
JWT_SECRET = "生成的JWT密钥"                  # 32字节十六进制字符串
ENCRYPTION_KEY = "生成的加密密钥"              # 32字节十六进制字符串
SEND_EMAIL_DOMAIN = "mail.yourdomain.com"    # 邮件发送域名
```

> **安全提示**：生产环境建议使用 `wrangler secret` 设置敏感变量，而非明文写在 `wrangler.toml` 中：
> ```bash
> wrangler pages secret put ADMIN_PASSWORD_HASH --project-name dns-manager
> wrangler pages secret put JWT_SECRET --project-name dns-manager
> wrangler pages secret put ENCRYPTION_KEY --project-name dns-manager
> ```

### 第六步：本地开发

```bash
# 启动前端开发服务器
npm run dev

# 启动 Pages Functions 本地开发（需要同时运行）
wrangler pages dev -- npm run dev
```

访问 `http://localhost:8788` 即可使用。

### 第七步：部署到 Cloudflare Pages

#### 方式一：Git 集成部署（推荐）

1. 将代码推送到 GitHub/GitLab
2. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create → Pages → Connect to Git
3. 选择仓库，配置构建设置：
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 在 Environment variables 中添加所有环境变量
5. 点击 Save and Deploy

#### 方式二：CLI 直接部署

```bash
# 构建项目
npm run build

# 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name dns-manager
```

### 第八步：配置邮件发送（可选）

如需启用域名到期邮件提醒，需配置 MailChannels：

1. 在你的域名 DNS 中添加以下记录：
   - `TXT` 记录：`mail.yourdomain.com` → `v=spf1 include:relay.mailchannels.net ~all`
   - `TXT` 记录：`mail.yourdomain.com` → `v=spf1 include:relay.mailchannels.net ~all`
   - `MX` 记录：`mail.yourdomain.com` → `relay.mailchannels.net`（优先级 10）

2. 在 Cloudflare Dashboard → Pages → 你的项目 → Settings → Environment variables 中设置：
   - `SEND_EMAIL_DOMAIN` = `mail.yourdomain.com`

3. Cron Trigger 会在每天 UTC 8:00 自动检查到期域名并发送邮件

### 第九步：配置 Cron Trigger

在 Cloudflare Dashboard → Workers & Pages → 你的项目 → Settings → Triggers 中，确认 Cron Trigger 已配置为 `0 8 * * *`（每天 UTC 8:00 执行）。

## 项目结构

```
├── functions/                  # Cloudflare Pages Functions（后端 API）
│   ├── _shared/               # 共享模块
│   │   ├── adapters/          # DNS 平台适配器
│   │   │   ├── types.ts       #   适配器接口与统一数据模型
│   │   │   ├── dnshe.ts       #   DNSHE 适配器
│   │   │   ├── dnsneko.ts     #   DNSNEKO 适配器
│   │   │   └── index.ts       #   适配器工厂
│   │   ├── auth.ts            # JWT 认证 + bcrypt + 限流
│   │   ├── crypto.ts          # AES-256-GCM 加密/解密
│   │   ├── email.ts           # MailChannels 邮件发送
│   │   ├── email-templates.ts # 邮件模板
│   │   ├── logger.ts          # 操作日志
│   │   ├── rateLimiter.ts     # API 限流 + 重试
│   │   ├── schemas.ts         # Zod 验证 schemas
│   │   ├── types.ts           # 类型定义
│   │   └── utils.ts           # 工具函数
│   ├── api/                   # API 端点
│   │   ├── _middleware.ts     #   CORS 中间件
│   │   ├── auth/              #   认证（登录/刷新/验证）
│   │   ├── accounts/          #   API 账号管理
│   │   ├── groups/            #   分组管理
│   │   ├── domains/           #   域名代理
│   │   ├── records/           #   记录代理 + 批量操作
│   │   ├── logs/              #   操作日志
│   │   ├── settings/          #   系统设置
│   │   └── backup/            #   备份/恢复
│   └── scheduled.ts           # Cron 定时任务
├── src/                        # 前端源码
│   ├── components/            # React 组件
│   │   ├── ui/                #   shadcn/ui 组件
│   │   ├── accounts/          #   账号管理组件
│   │   ├── domains/           #   域名管理组件
│   │   └── settings/          #   设置页组件
│   ├── hooks/                 # React Query hooks
│   ├── lib/                   # 工具库
│   ├── pages/                 # 页面组件
│   ├── plugins/               # DNS 平台适配器（前端副本）
│   ├── schemas/               # Zod schemas
│   └── types/                 # 类型定义
├── migrations/                 # D1 数据库迁移
├── public/                     # 静态资源
├── wrangler.toml               # Cloudflare 配置
└── package.json
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 管理员登录 |
| POST | `/api/auth/refresh` | 刷新 JWT |
| POST | `/api/auth/verify-password` | 二次密码验证 |
| GET | `/api/accounts` | 获取账号列表 |
| POST | `/api/accounts` | 添加账号 |
| PUT | `/api/accounts/:id` | 编辑账号 |
| DELETE | `/api/accounts/:id` | 删除账号 |
| PATCH | `/api/accounts/:id/toggle` | 启用/禁用账号 |
| POST | `/api/accounts/:id/test` | 测试连接性 |
| POST | `/api/accounts/import` | 导入账号 |
| GET | `/api/accounts/export` | 导出账号 |
| GET | `/api/groups` | 获取分组列表 |
| POST | `/api/groups` | 创建分组 |
| PUT | `/api/groups/:id` | 编辑分组 |
| DELETE | `/api/groups/:id` | 删除分组 |
| GET | `/api/domains` | 聚合域名列表 |
| GET | `/api/domains/:accountId/:domainId` | 域名详情 |
| GET | `/api/records/:accountId/:domainId` | DNS 记录列表 |
| POST | `/api/records/:accountId/:domainId` | 添加记录 |
| PUT | `/api/records/:accountId/:domainId/:recordId` | 修改记录 |
| DELETE | `/api/records/:accountId/:domainId/:recordId` | 删除记录 |
| POST | `/api/records/:accountId/:recordId/status` | 切换记录状态 |
| POST | `/api/records/batch/status` | 批量状态切换 |
| POST | `/api/records/batch/delete` | 批量删除 |
| POST | `/api/records/batch/ttl` | 批量修改 TTL |
| POST | `/api/records/batch/line` | 批量修改线路 |
| GET | `/api/logs` | 操作日志查询 |
| DELETE | `/api/logs/cleanup` | 日志清理 |
| GET | `/api/settings` | 获取系统设置 |
| PUT | `/api/settings` | 更新系统设置 |
| GET | `/api/backup` | 数据备份导出 |
| POST | `/api/backup` | 数据恢复导入 |

## 鸣谢

- [**DNSHE**](https://www.dnshe.com/) — 提供 DNS 解析服务及 API 支持
- [**DNSNEKO**](https://www.dnsneko.com/) — 提供 DNS 解析服务及 API 支持
- [**Trae**](https://www.trae.ai/) — AI 驱动的 IDE，本项目全程使用 Trae 开发

## 许可证

MIT
