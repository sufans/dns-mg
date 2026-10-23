# Project Manifest

更新时间：2026-10-23

## 项目定位

单管理员、零外部后端的多平台 DNS 统一控制台。前端 React SPA，后端 Cloudflare Pages Functions，数据存储 Cloudflare D1，支持 DNSHE、DNSNEKO、GLEAM 三个上游平台。

## 交付内容

| 区域 | 说明 |
|------|------|
| `src/` | React 18 + TypeScript 前端，TanStack Query 管理服务端状态，自定义 history 路由 |
| `functions/` | Pages Functions REST API，统一响应封装、Zod 校验、审计日志 |
| `functions/_shared/platforms/` | 平台适配器（dnshe / dnsneko / gleam），前端只消费统一模型 |
| `d1/schema.sql` | 完整建表语句与默认数据 |
| `d1/migrate.sql` | 增量迁移脚本 |
| `public/_routes.json` | 只把 `/api/*` 交给 Functions |
| `public/_redirects` | SPA 深链接回退到根文档 |
| `docs/` | 部署、API、安全、适配器开发、故障排查文档 |

## 关键实现文件

- `functions/_shared/auth.ts`：JWT 校验、CSRF 校验、二次密码验证。
- `functions/_shared/jwt.ts`：HMAC-SHA256 JWT 签发与验证。
- `functions/_shared/cookies.ts`：按协议选择 `__Host-dns_session` / `dns_session`。
- `functions/_shared/crypto.ts`：AES-GCM 加密 API 凭证。
- `functions/_shared/rate-limit.ts`：`IP + 用户名` 登录锁定、平台配额原子计数。
- `functions/_shared/fetcher.ts`：上游请求封装、超时、重试、主机白名单。
- `functions/_shared/list-all.ts`：分页拉取全量域名。
- `functions/api/*`：REST 接口。
- `src/lib/theme.ts`：主题状态（浅色 / 深色 / 跟随系统）。
- `src/pages/*`：控制台页面，含 `GroupsPage`、`DomainDetailPage`、`NotFoundPage`。

## 验证命令

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npx vitest run
```

本地完整联调：

```bash
npm run d1:init:local
npm run pages:dev
```

## 已知边界

- 单管理员模型：禁用上游 API 账号不会使当前管理员会话失效，强制下线需更换 `JWT_SECRET`。
- 记录暂停/启用与官方批量操作仅 DNSNEKO 支持。
- 上游真实 API 需要自备账号验证；自动化测试使用 mock 适配器。
