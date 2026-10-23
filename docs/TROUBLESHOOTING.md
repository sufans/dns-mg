# 常见问题与故障排查

## 登录后立刻退出

检查：

1. `JWT_SECRET` 是否配置且生产/预览环境一致。
2. 浏览器是否阻止 Cookie。
3. 生产环境是否使用 HTTPS；`__Host-` Cookie 必须 Secure。本地 HTTP 会自动使用 `dns_session`，如果仍掉线，确认访问的是 `localhost`/`127.0.0.1` 而不是局域网 IP。
4. `APP_ORIGIN` 是否与当前访问域名完全一致（含协议与端口），不一致时非 GET 请求会返回 `403 csrf_origin_failed`。
5. 反向代理是否覆盖了 `Set-Cookie`（`__Host-` 前缀不允许设置 `Domain`）。

## 深色/浅色切换无效

1. 主题保存在 `localStorage.dns-theme`，隐私模式下写入可能失败，此时仅在当前标签页生效。
2. 浏览器控制台执行 `document.documentElement.classList.contains('dark')` 可确认是否已应用。
3. 若自行扩展了组件，请使用主题变量（`bg-background`、`text-muted-foreground`、`border-border`）而不是写死的 `bg-[#0f172a]`、`text-slate-400`，否则不会跟随主题。

## 深链接直接访问 404

确认 `public/_redirects` 已随构建产物部署，且 Pages 项目没有自定义覆盖规则。`/domains/*` 等路由需要回退到 `index.html`（200 rewrite），否则刷新页面会由 CDN 返回 404。

## 列表一直显示“暂无数据”

页面在请求未完成时显示加载提示、完成且为空时才显示空状态。如果长时间停在加载提示：

1. 打开开发者工具 Network，查看 `/api/*` 的状态码。
2. `401` 表示会话失效，会被自动跳转到登录页。
3. `500` 时用响应里的 `requestId` 对照 `wrangler pages deployment tail` 或 Functions 日志排查。

## D1 报 no such table

说明 D1 未初始化或绑定错库。执行：

```bash
npx wrangler d1 execute dns_manager --remote --file=d1/schema.sql
```

并确认 Pages 项目绑定名为 `DB`。

## 添加 API 账号失败

检查：

1. 是否输入管理员密码做二次验证。
2. `ENCRYPTION_KEY` 是否配置。
3. 凭证格式：DNSHE 填 `apiKey/apiSecret`，DNSNEKO 填 `username/apiKey`，GLEAM 只填 `apiKey`（`hl6_` 开头）。
4. 上游平台是否触发限流。
5. 编辑账号时凭证字段留空表示保留原值；如果要更换密钥，请至少填写新的 Key。

## 邮件提醒没有发送

检查：

1. Cloudflare Email Routing 是否启用。
2. `SEND_EMAIL` binding 是否存在。
3. `EMAIL_FROM` 与 `EMAIL_TO` 是否配置。
4. 系统设置中是否启用邮件提醒。
5. 自动化端点是否返回 `emailStatus: sent`。

## 自动刷新不是定时执行

前端刷新只在页面打开时通过 React Query 完成；服务端定时检查需要 Cloudflare Workers Cron 调用 `/api/automation/check-expiry`。

## DNSHE 批量操作不可用

DNSHE 与 GLEAM 当前只支持单条增删改查；DNSNEKO 提供官方批量暂停/删除/TTL/线路接口。本项目对 DNSHE/GLEAM 保留逐条操作路径，对 DNSNEKO 走官方批量接口，因此详情页的暂停/启用按钮只在 DNSNEKO 账号下出现。
