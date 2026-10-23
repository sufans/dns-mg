# 安全设计说明

## 单管理员认证

- 管理员用户名来自 `ADMIN_USERNAME`。
- 管理员密码只接受 `ADMIN_PASSWORD_HASH` bcrypt 哈希。
- 前端永远不执行密码校验。
- 登录成功后写入 HttpOnly `__Host-dns_session` Cookie。
- JWT 有效期 24 小时。

## 登录失败锁定

D1 表 `login_attempts` 按 IP 记录失败次数。5 次失败后锁定 15 分钟。

## CSRF 防护

- JWT 中包含随机 CSRF token。
- 浏览器同时收到非 HttpOnly Cookie `dns_csrf`。
- 所有非 GET API 必须提交 `X-CSRF-Token`。
- 若配置 `APP_ORIGIN`，会额外检查 `Origin` / `Referer`。

## XSS 防护

- 全局 CSP 禁止第三方脚本。
- 前端不使用 `dangerouslySetInnerHTML`。
- API 统一 Zod 校验输入。
- 敏感字段返回前全部脱敏。

## API Key 加密

API 账号配置使用 Web Crypto AES-GCM 加密，密钥来自 `ENCRYPTION_KEY`。D1 中只存储密文。

## 操作审计

所有关键操作写入 `operation_logs`，包含管理员、IP、动作、目标、结果和错误消息。

## 已知边界

- **单管理员模型**：系统只支持一个管理员账号，凭证来自环境变量。禁用某个上游 API 账号不会使当前管理员的登录会话失效；如需强制下线，请更换 `JWT_SECRET`，所有会话将立即失效。
- **登录锁定键**：失败计数以 `IP + 用户名` 组合为键，攻击者轮换 IP 无法重置目标账号的计数；同时某个账号的失败不会连坐其他账号。
- **Cookie 命名**：HTTPS 下使用 `__Host-dns_session`（要求 Secure、无 Domain、Path=/）；本地 HTTP 开发自动降级为 `dns_session`，否则浏览器会丢弃 Cookie 导致无法登录。
- **上游出口白名单**：`fetcher.ts` 仅允许请求 `api005.dnshe.com`、`www.dnsneko.com`、`sld.0n.pub`，防止未来引入 SSRF 风险。新增平台时必须同步更新白名单。
- **平台限流**：`api_rate_limits` 使用原子 upsert 计数，单次窗口内不会超发；批量刷新/导出会按页消耗配额。
