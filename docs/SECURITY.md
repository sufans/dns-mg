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
