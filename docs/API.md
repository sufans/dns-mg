# 内部 API 文档

所有 `/api/*` 接口默认返回统一结构：

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "code": null,
  "requestId": "uuid"
}
```

鉴权使用 HttpOnly Cookie：HTTPS 环境为 `__Host-dns_session`，本地 HTTP 开发为 `dns_session`（`__Host-` 前缀要求 Secure，HTTP 下浏览器会直接丢弃）。所有非 GET 请求必须携带 `X-CSRF-Token`，值来自非 HttpOnly Cookie `dns_csrf`。

错误响应同样使用统一结构，`ok=false` 并带上 `code`：

| HTTP | 典型 `code` | 含义 |
|------|-------------|------|
| 400 | `unsupported_operation` / `unsupported_batch_operation` | 当前平台不支持该能力 |
| 401 | `unauthorized` | 会话失效，需要重新登录 |
| 403 | `csrf_failed` / `csrf_origin_failed` / `second_verification_failed` | CSRF 或二次密码校验失败 |
| 429 | `login_locked` | 登录失败次数超限，账号被临时锁定 15 分钟 |
| 500 | `internal_error` | 未预期异常，响应含 `requestId` 便于排查 |

## Auth

| Method | Path | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | 登录，服务端 bcrypt 校验 |
| GET | `/api/auth/me` | 当前登录状态 |
| POST | `/api/auth/refresh` | 刷新 24 小时 JWT |
| POST | `/api/auth/logout` | 退出登录 |

## API 账号

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/accounts` | 列出账号，凭证脱敏 |
| POST | `/api/accounts` | 添加账号，需二次密码验证 |
| GET | `/api/accounts/:id` | 查看账号 |
| PUT | `/api/accounts/:id` | 更新账号，修改敏感字段需二次验证 |
| DELETE | `/api/accounts/:id` | 删除账号，需二次验证 |
| POST | `/api/accounts/:id/check` | 连接性检测 |
| GET | `/api/accounts/export` | 导出加密账号配置 |
| POST | `/api/accounts/import` | 导入加密账号配置 |

## 分组

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/groups` | 列出分组 |
| POST | `/api/groups` | 新增分组 |
| PUT | `/api/groups/:id` | 更新分组 |
| DELETE | `/api/groups/:id` | 删除分组 |

## 域名

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/domains` | 跨平台聚合域名列表 |
| POST | `/api/domains/refresh` | 清空域名缓存 |
| GET | `/api/domains/export` | 导出 CSV |
| GET | `/api/domains/:accountId/:domainId` | 域名详情与解析记录 |

`/api/domains` 支持查询参数：`platform`、`groupId`、`keyword`、`status`、`expiresFrom`、`expiresTo`、`refresh=1`。

## 解析记录

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/records/:accountId/:domainId` | 查询解析记录 |
| POST | `/api/records/:accountId/:domainId` | 新增记录 |
| PUT | `/api/records/:accountId/:domainId/:recordId` | 修改记录 |
| DELETE | `/api/records/:accountId/:domainId/:recordId` | 删除记录 |
| POST | `/api/records/:accountId/:domainId/:recordId/status` | 暂停/启用，仅 DNSNEKO 支持；其他平台返回 `400 unsupported_operation` |
| POST | `/api/records/batch` | 批量操作，仅 DNSNEKO 支持官方批量接口 |

## 系统

| Method | Path | 说明 |
| --- | --- | --- |
| GET/PUT | `/api/settings` | 系统设置 |
| GET/DELETE | `/api/logs` | 日志查询/过期清理 |
| GET | `/api/backup/export` | 全量加密备份 |
| POST | `/api/backup/import` | 全量恢复，需二次验证 |
| POST | `/api/automation/check-expiry` | 到期检查与邮件提醒 |
