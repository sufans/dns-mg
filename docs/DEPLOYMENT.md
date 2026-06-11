# 部署教程

## 1. Fork / 上传仓库

将本项目推送到 GitHub，然后在 Cloudflare Dashboard 中创建 Pages 项目并连接该仓库。

Pages 构建配置：

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 20.19 或更高

## 2. 创建 D1 数据库

```bash
npm install
npx wrangler login
npx wrangler d1 create dns_manager
```

把返回的 `database_id` 写入 `wrangler.toml` 的 `[[d1_databases]]`。

初始化表结构：

```bash
npx wrangler d1 execute dns_manager --remote --file=d1/schema.sql
```

Cloudflare Pages 控制台中也要添加 D1 Binding：

- Binding name: `DB`
- Database: `dns_manager`

## 3. 配置环境变量

在 Pages 项目 Settings → Environment variables 中添加：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `ADMIN_USERNAME` | 是 | 管理员用户名 |
| `ADMIN_PASSWORD_HASH` | 是 | bcrypt 哈希后的密码，禁止明文 |
| `JWT_SECRET` | 是 | JWT HMAC 密钥 |
| `ENCRYPTION_KEY` | 是 | API 账号配置 AES-GCM 加密密钥 |
| `APP_ORIGIN` | 建议 | 生产域名，用于 Origin/Referer CSRF 校验 |
| `AUTOMATION_SECRET` | 可选 | 自动化检查端点的专用密钥 |
| `EMAIL_FROM` | 可选 | 到期提醒发件人 |
| `EMAIL_TO` | 可选 | 到期提醒收件人 |
| `LOG_RETENTION_DAYS` | 可选 | 日志保留天数，默认 90 |

生成 bcrypt 哈希：

```bash
npm run secret:password -- "your-strong-password"
```

生成随机密钥：

```bash
npm run secret:key
```

可用在线工具：bcrypt-generator.com 这类工具可以生成 bcrypt，但生产密码更推荐在本地命令行生成，避免把明文密码提交给第三方页面。

## 4. Email Routing 发信绑定

启用 Cloudflare Email Routing，并至少验证一个目标邮箱后，在 Pages/Workers 绑定中添加 `send_email` binding：

```toml
[[send_email]]
name = "SEND_EMAIL"
destination_address = "you@example.com"
```

同时配置 `EMAIL_FROM` 与 `EMAIL_TO`。`EMAIL_FROM` 的域名应是已启用 Email Routing 的域名。

## 5. 自动化到期检查

Pages Functions 提供端点：

```http
POST /api/automation/check-expiry
X-Automation-Secret: <AUTOMATION_SECRET>
```

由于定时 Cron 是 Cloudflare Workers 的 scheduled handler 能力，建议创建一个极简 Worker Cron 调用该端点。示例：

```ts
export default {
  async scheduled(_event, env) {
    await fetch(`${env.APP_URL}/api/automation/check-expiry`, {
      method: 'POST',
      headers: { 'X-Automation-Secret': env.AUTOMATION_SECRET }
    });
  }
};
```

## 6. 本地开发

```bash
npm install
npm run build
npm run d1:init:local
npm run pages:dev
```

本地 secrets 放入 `.dev.vars`，不要提交到 Git。
