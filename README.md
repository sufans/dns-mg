# DNS Manager

统一管理 DNSHE / DNSNEKO 多平台域名解析的轻量级控制面板，基于 Cloudflare Pages + D1 部署，零服务器成本。

## 架构

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare Pages                   │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │   前端 SPA    │    │   Pages Functions (API)   │   │
│  │  React + RQ  │◄──►│  认证 / 代理 / 日志 / 备份  │   │
│  └──────────────┘    └────────┬─────────────────┘   │
│                               │                      │
│              ┌────────────────┼────────────────┐     │
│              ▼                ▼                ▼     │
│        ┌──────────┐   ┌────────────┐   ┌─────────┐  │
│        │  D1 (DB)  │   │ DNSHE API  │   │DNSNEKO  │  │
│        │ 账号/日志  │   │  适配器     │   │ 适配器   │  │
│        └──────────┘   └────────────┘   └─────────┘  │
│                                                      │
│  Cron Trigger ──► scheduled.ts ──► 到期检测 + 邮件    │
└─────────────────────────────────────────────────────┘
```

- **前端**：React 18 + TypeScript + Tailwind CSS + shadcn/ui，TanStack React Query 管理状态
- **后端**：Cloudflare Pages Functions，文件路由自动映射为 API 端点
- **数据库**：Cloudflare D1 (SQLite)，存储账号、分组、日志、设置
- **适配器模式**：DNSHE / DNSNEKO 各实现 `DNSPlatformAdapter` 接口，统一数据模型，业务层无需关心平台差异
- **安全**：JWT 认证 + bcrypt 密码哈希 + AES-256-GCM 凭据加密 + 登录限流

## 快速部署

### 1. 创建 D1 数据库

```bash
wrangler d1 create dns-manager-db
```

将输出的 `database_id` 填入 `wrangler.toml`：

```toml
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. 初始化表结构

```bash
wrangler d1 execute dns-manager-db --remote --file=migrations/0001_init.sql
```

### 3. 设置密钥

```bash
# 生成密码哈希
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('你的密码', 10));"

# 生成随机密钥（运行两次，分别用于 JWT_SECRET 和 ENCRYPTION_KEY）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
```

在 Cloudflare Dashboard → Pages → 项目 → Settings → Environment variables 中设置：

| 变量 | 说明 |
|------|------|
| `ADMIN_USERNAME` | 管理员用户名 |
| `ADMIN_PASSWORD_HASH` | 上一步生成的 bcrypt 哈希 |
| `JWT_SECRET` | 64字符十六进制字符串 |
| `ENCRYPTION_KEY` | 64字符十六进制字符串 |
| `SEND_EMAIL_DOMAIN` | 邮件发送域名（可选，用于到期提醒） |

> 也可直接编辑 `wrangler.toml` 的 `[vars]` 段，但敏感值建议用 Dashboard 设置。

### 4. 部署

**Git 集成（推荐）：** Dashboard → Workers & Pages → Create → Pages → Connect to Git

- Build command: `npm run build`
- Build output: `dist`

**CLI 部署：**

```bash
npm run build
wrangler pages deploy dist --project-name dns-mg
```

### 5. 配置 Cron（可选）

Dashboard → 项目 → Settings → Triggers → 添加 Cron：`0 8 * * *`（每天 UTC 8:00 检测到期域名）

### 本地开发

```bash
npm install
wrangler pages dev -- npm run dev
```

访问 `http://localhost:8788`

## 项目结构

```
functions/              # 后端 API（Pages Functions 自动路由）
  _shared/              #   共享模块（_前缀不生成路由）
    adapters/           #     DNS 平台适配器
    auth.ts             #     JWT + bcrypt + 限流
    crypto.ts           #     AES-256-GCM 加解密
    email.ts            #     MailChannels 发信
  api/                  #   REST 端点（文件路径 = URL 路径）
    auth/               #     登录 / 刷新 / 验证密码
    accounts/           #     账号 CRUD + 测试 + 导入导出
    groups/             #     分组 CRUD
    domains/            #     域名列表 / 详情
    records/            #     记录 CRUD + 批量操作
    logs/               #     操作日志
    settings/           #     系统设置
    backup/             #     备份 / 恢复
  scheduled.ts          #   Cron 定时任务
src/                    # 前端
  components/           #   UI 组件
  hooks/                #   React Query hooks
  pages/                #   页面
  plugins/              #   DNS 适配器（前端副本）
  lib/api.ts            #   API 客户端
migrations/             # D1 迁移脚本
wrangler.toml           # Cloudflare 配置
```

## 鸣谢

- [**DNSHE**](https://www.dnshe.com/) — DNS 解析服务及 API
- [**DNSNEKO**](https://www.dnsneko.com/) — DNS 解析服务及 API
- [**Trae**](https://www.trae.ai/) — 本项目全程使用 Trae 开发

## 许可证

MIT
