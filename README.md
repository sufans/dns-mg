# Cloudflare DNS Manager

生产级、单管理员、零外部后端服务的多域名解析平台统一管理系统。项目面向 Cloudflare Pages + Pages Functions + D1 SQLite 设计，集中管理 DNSHE 与 DNSNEKO 的域名和 DNS 记录。

## 技术栈

- 前端：React 18、TypeScript 5、Tailwind CSS v3、shadcn/ui 风格组件、Lucide 图标
- 状态：TanStack React Query v5
- 校验：Zod
- 后端：Cloudflare Pages Functions
- 存储：Cloudflare D1 SQLite
- 加密：Web Crypto AES-GCM
- 认证：bcrypt + JWT + HttpOnly Cookie + CSRF Token
- 构建：Vite

## 核心特性

- 纯个人自用单管理员系统，无注册、无多用户、无权限分级。
- 管理员凭证 100% 来自 Cloudflare 环境变量，不写入数据库或代码。
- API 账号密钥使用 `ENCRYPTION_KEY` 加密存储在 D1。
- DNSHE / DNSNEKO 平台适配器独立封装。
- 域名跨平台聚合、筛选、搜索、到期预警、CSV 导出。
- DNS 记录增删改查；DNSNEKO 支持官方批量操作。
- 操作日志、设置、备份恢复、邮件到期提醒端点。
- Cloudflare 原生安全头、CSP、CSRF、登录失败锁定。

## 目录结构

```text
cloudflare-dns-manager/
├─ public/                  # 静态资源与 _routes.json
├─ src/                     # React 前端
│  ├─ components/           # shadcn/ui 风格组件与布局
│  ├─ hooks/                # React Hooks
│  ├─ lib/                  # API、路由、QueryClient、工具函数
│  ├─ pages/                # 页面
│  ├─ plugins/dns-platforms # 平台扩展模板
│  └─ types/                # 前端类型
├─ functions/               # Cloudflare Pages Functions API
│  ├─ _shared/              # 认证、加密、日志、适配器、响应工具
│  └─ api/                  # REST API 路由
├─ d1/                      # D1 schema / migration
├─ docs/                    # 部署、API、安全、排障文档
├─ scripts/                 # 密码哈希与随机密钥生成
└─ wrangler.toml            # 本地与绑定配置模板
```

## 快速开始

```bash
npm install
npm run secret:password -- "your-strong-password"
npm run secret:key
npx wrangler d1 create dns_manager
npx wrangler d1 execute dns_manager --remote --file=d1/schema.sql
npm run build
```

Cloudflare Pages 配置：

- Build command: `npm run build`
- Build output directory: `dist`
- D1 binding: `DB`

完整部署步骤见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。

## 环境变量

参见 `.env.example`。生产环境必须配置：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

建议配置：

- `APP_ORIGIN`
- `AUTOMATION_SECRET`
- `LOG_RETENTION_DAYS`
- `EMAIL_FROM`
- `EMAIL_TO`
- `SEND_EMAIL` binding

## DNSHE / DNSNEKO 对接说明

- DNSHE 使用 `X-API-Key` 与 `X-API-Secret` Header，对应 `subdomains` 与 `dns_records` 模块。
- DNSNEKO 使用 `X-DNSNEKO-USERNAME` 与 `X-DNSNEKO-API-KEY` Header，对应 `/domains` 与 `/records` REST API。
- 本项目所有平台 API 调用都发生在 Pages Functions 端，浏览器不会接触上游 API 密钥。

## 开发命令

```bash
npm run dev              # 仅前端 Vite
npm run pages:dev        # 构建后以 Wrangler Pages Functions 本地运行
npm run typecheck
npm run lint
npm run format
npm run d1:init:local
npm run d1:init:remote
```

## 生产注意事项

1. 不要把 `.dev.vars`、`.env`、明文密码或 API 密钥提交到 Git。
2. `ADMIN_PASSWORD_HASH` 必须是 bcrypt 哈希，不能是明文。
3. `APP_ORIGIN` 建议设置为生产域名，例如 `https://dns.example.com`。
4. 如果开启邮件提醒，需要配置 Cloudflare Email Routing 与 `SEND_EMAIL` binding。
5. 定时任务建议使用 Cloudflare Workers Cron 调用 `/api/automation/check-expiry`。

## 许可

MIT，仅供个人自用部署和二次开发。
