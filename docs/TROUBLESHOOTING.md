# 常见问题与故障排查

## 登录后立刻退出

检查：

1. `JWT_SECRET` 是否配置且生产/预览环境一致。
2. 浏览器是否阻止 Cookie。
3. 生产环境是否使用 HTTPS；`__Host-` Cookie 必须 Secure。
4. `APP_ORIGIN` 是否与当前访问域名完全一致。

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
3. DNSHE 是否填 `apiKey/apiSecret`，DNSNEKO 是否填 `username/apiKey`。
4. 上游平台是否触发限流。

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

DNSHE 当前文档显示 DNS 记录管理支持单条增删改查；DNSNEKO 提供官方批量暂停/删除/TTL/线路接口。本项目对 DNSHE 保留逐条操作路径，对 DNSNEKO 走官方批量接口。
