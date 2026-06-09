# DNSHE 免费域名 API 文档（合并版）

> 本文档基于两份官方 PDF 整理：
>
> - `DNSHE免费域名API使用文档（V2.0) - 帮助中心 - DNSHE.pdf`（**V2.0，当前生效版**）
> - `免费域名服务API使用文档 - 帮助中心 - DNSHE.pdf`（**旧版，部分功能已失效**）
>
> 旧版文档仅作为补充（FAQ、旧版限速响应格式等），核心接口均以 **V2.0** 为准。

## 目录

- [基本信息](#基本信息)
- [授权认证](#授权认证)
- [API 限速](#api-限速)
- [子域名管理](#子域名管理)
  - [列出子域名](#列出子域名)
  - [注册子域名](#注册子域名)
  - [获取子域名详情](#获取子域名详情)
  - [删除子域名](#删除子域名)
  - [续期子域名](#续期子域名)
- [DNS 记录管理](#dns-记录管理)
  - [列出 DNS 记录](#列出-dns-记录)
  - [创建 DNS 记录](#创建-dns-记录)
  - [更新 DNS 记录](#更新-dns-记录)
  - [删除 DNS 记录](#删除-dns-记录)
- [API 密钥管理](#api-密钥管理)
  - [列出 API 密钥](#列出-api-密钥)
  - [创建 API 密钥](#创建-api-密钥)
  - [删除 API 密钥](#删除-api-密钥)
  - [重新生成 API 密钥](#重新生成-api-密钥)
- [配额查询](#配额查询)
- [WHOIS 查询（公开接口）](#whois-查询公开接口)
- [错误处理](#错误处理)
- [SDK 示例](#sdk-示例)
  - [PHP](#php)
  - [Python](#python)
  - [JavaScript](#javascript)
- [安全建议](#安全建议)
- [常见问题](#常见问题)
- [接口速查表](#接口速查表)

---

## 基本信息

| 项       | 值                                                     |
| -------- | ------------------------------------------------------ |
| API 地址 | `https://api005.dnshe.com/index.php?m=domain_hub`      |
| 认证方式 | API Key + API Secret（HTTP Header）                    |
| 数据格式 | JSON                                                   |
| 速率限制 | 默认 60 请求 / 分钟（详见 [API 限速](#api-限速)）     |
| 子模块   | `subdomains` / `dns_records` / `keys` / `quota` / `whois` |

所有接口均以 `?m=domain_hub&endpoint=<子模块>&action=<操作>` 的形式路由，写操作支持 `POST` / `PUT` / `PATCH` / `DELETE`，调用方法详见各章节。

---

## 授权认证

### 获取 API 密钥

1. 登录 DNSHE 客户区。
2. 进入「免费域名」页面。
3. 在底部找到「API 管理」卡片（V2.0 中位于左侧导航栏「API 管理」）。
4. 点击「创建 API 密钥」并妥善保存返回的 `api_secret`（**仅展示一次**）。

### 认证方式

> V2.0 起，**仅支持 HTTP Header 方式**。出于安全原因，URL Query 与请求体参数认证已禁用。

```http
X-API-Key: cfsd_xxxxxxxxxx
X-API-Secret: yyyyyyyyyyyy
Content-Type: application/json
```

**完整调用示例**

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

---

## API 限速

| 维度       | 限制         | 窗口期 |
| ---------- | ------------ | ------ |
| 默认限速   | 60 请求 / 窗口 | 60s  |
| WHOIS 公共接口 | 30 请求 / 窗口 | 60s（按 IP） |

> - 响应头中会包含速率限制信息。
> - 超限响应详见 [错误处理](#错误处理) 中的「限速响应」一节。
> - 速率限制可联系管理员调整。

---

## 子域名管理

> 端点：`subdomains`

### 列出子域名

```http
GET /index.php?m=domain_hub&endpoint=subdomains&action=list
```

**Query 参数**

| 参数          | 类型    | 必填 | 默认 | 说明                                                         |
| ------------- | ------- | ---- | ---- | ------------------------------------------------------------ |
| `page`        | Integer | 否   | 1    | 页码（从 1 开始）                                            |
| `per_page`    | Integer | 否   | 200  | 每页数量（1-500，超过自动限制为 500）                       |
| `include_total` | Boolean | 否 | false| 是否返回总数（大数据量时较慢）                              |
| `search`      | String  | 否   | -    | 搜索关键词（匹配 `subdomain` 或 `rootdomain`）              |
| `rootdomain`  | String  | 否   | -    | 按根域名过滤                                                 |
| `status`      | String  | 否   | -    | 状态过滤：`active` / `suspended` / `expired`                |
| `created_from`| String  | 否   | -    | 创建时间起始（`YYYY-MM-DD`）                                |
| `created_to`  | String  | 否   | -    | 创建时间结束（`YYYY-MM-DD`）                                |
| `sort_by`     | String  | 否   | id   | 排序字段：`id` / `created_at` / `updated_at` / `expires_at` / `subdomain` |
| `sort_dir`    | String  | 否   | desc | 排序方向：`asc` / `desc`                                     |
| `fields`      | String  | 否   | all  | 自定义返回字段（逗号分隔），会自动补 `id`                   |

**基础请求**

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**分页请求**

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list&page=2&per_page=100&include_total=1" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**搜索 + 过滤 + 排序**

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=list&search=test&status=active&sort_by=created_at&sort_dir=desc&per_page=50" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**基础响应**

```json
{
  "success": true,
  "count": 2,
  "subdomains": [
    {
      "id": 1,
      "subdomain": "test",
      "rootdomain": "example.com",
      "full_domain": "test.example.com",
      "status": "active",
      "created_at": "2025-10-19 10:00:00",
      "updated_at": "2025-10-19 10:00:00"
    },
    {
      "id": 2,
      "subdomain": "api",
      "rootdomain": "example.com",
      "full_domain": "api.example.com",
      "status": "active",
      "created_at": "2025-10-19 11:00:00",
      "updated_at": "2025-10-19 11:00:00"
    }
  ]
}
```

**分页响应**

```json
{
  "success": true,
  "count": 100,
  "subdomains": [
    {
      "id": 201,
      "subdomain": "app201",
      "rootdomain": "example.com",
      "full_domain": "app201.example.com",
      "status": "active",
      "created_at": "2025-10-19 10:00:00",
      "updated_at": "2025-10-19 10:00:00"
    }
    // ... 99 more items
  ],
  "pagination": {
    "page": 2,
    "per_page": 100,
    "has_more": true,
    "next_page": 3,
    "prev_page": 1,
    "total": 12500
  }
}
```

**性能优化建议**

- 默认每页 200 条，建议按需调整 `per_page`（推荐 50-100）。
- `include_total=1` 会执行 `COUNT` 查询，数据量大时较慢，仅必要时使用。
- 通过 `pagination.has_more` 判断是否有下一页，比依赖 `total` 更高效。
- 使用 `fields` 参数可显著减少数据传输量。
- 1 万+域名建议结合搜索/过滤精确定位目标。

### 注册子域名

```http
POST /index.php?m=domain_hub&endpoint=subdomains&action=register
```

**请求体**

| 参数         | 类型   | 必填 | 说明         |
| ------------ | ------ | ---- | ------------ |
| `subdomain`  | String | 是   | 子域名前缀   |
| `rootdomain` | String | 是   | 根域名       |

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=register" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "myapp",
    "rootdomain": "example.com"
  }'
```

**响应**

```json
{
  "success": true,
  "message": "Subdomain registered successfully",
  "subdomain_id": 3,
  "full_domain": "myapp.example.com"
}
```

### 获取子域名详情

```http
GET /index.php?m=domain_hub&endpoint=subdomains&action=get&subdomain_id=1
```

**Query 参数**

| 参数          | 类型    | 必填 | 说明     |
| ------------- | ------- | ---- | -------- |
| `subdomain_id`| Integer | 是   | 子域名 ID |

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=get&subdomain_id=1" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**响应**

```json
{
  "success": true,
  "subdomain": {
    "id": 1,
    "subdomain": "test",
    "rootdomain": "example.com",
    "full_domain": "test.example.com",
    "status": "active",
    "created_at": "2025-10-19 10:00:00",
    "updated_at": "2025-10-19 10:00:00"
  },
  "dns_records": [
    {
      "id": 1,
      "name": "test.example.com",
      "type": "A",
      "content": "192.168.1.1",
      "ttl": 600,
      "priority": null,
      "status": "active",
      "created_at": "2025-10-19 10:05:00"
    }
  ],
  "dns_count": 1
}
```

### 删除子域名

```http
POST /index.php?m=domain_hub&endpoint=subdomains&action=delete
# 或
DELETE /index.php?m=domain_hub&endpoint=subdomains&action=delete
```

**请求体 / Query**

| 参数          | 类型    | 必填 | 说明     |
| ------------- | ------- | ---- | -------- |
| `subdomain_id`| Integer | 是   | 子域名 ID |

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=delete" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{ "subdomain_id": 1 }'
```

**响应**

```json
{
  "success": true,
  "message": "Subdomain deleted successfully",
  "subdomain_id": 1,
  "full_domain": "test.example.com",
  "dns_records_deleted": 4
}
```

### 续期子域名

```http
POST /index.php?m=domain_hub&endpoint=subdomains&action=renew
# 或
PUT /index.php?m=domain_hub&endpoint=subdomains&action=renew
```

**请求体 / Query**

| 参数          | 类型    | 必填 | 说明     |
| ------------- | ------- | ---- | -------- |
| `subdomain_id`| Integer | 是   | 子域名 ID |

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=subdomains&action=renew" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{ "subdomain_id": 3 }'
```

**响应**

```json
{
  "success": true,
  "message": "Subdomain renewed successfully (charged 9.90 credit)",
  "subdomain_id": 3,
  "subdomain": "myapp",
  "previous_expires_at": "2025-05-01 00:00:00",
  "new_expires_at": "2026-05-01 00:00:00",
  "renewed_at": "2025-04-10 12:34:56",
  "never_expires": 0,
  "status": "active",
  "remaining_days": 366,
  "charged_amount": 9.9
}
```

**说明**

- `charged_amount` 表示本次续期从用户账户余额中扣除的金额；免费续期或扣费金额为 0 时为 `0`。
- 续期窗口、续期规则等可参考官方文章「DNSHE 免费域名续期与 API 续期使用方法」。

**可能错误**

| 错误码                              | 含义 |
| ----------------------------------- | ---- |
| `403 renewal disabled`              | 后台未配置有效的注册年限 |
| `422 renewal not yet available`     | 尚未进入免费续期窗口（同时返回 `error_code=renewal_not_yet_available` 与剩余时间字段） |
| `403 redemption period requires administrator` | 域名处于赎回期且后台配置为人工处理 |
| `403 renewal window expired`        | 已超过续期宽限期 |
| `402 insufficient balance for redemption renewal` | 赎回期设置为自动扣费，但账户余额不足 |
| `404 subdomain not found`           | 找不到对应子域名或不属于当前 API Key |

---

## DNS 记录管理

> 端点：`dns_records`

### 列出 DNS 记录

```http
GET /index.php?m=domain_hub&endpoint=dns_records&action=list&subdomain_id=1
```

**Query 参数**

| 参数          | 类型    | 必填 | 说明     |
| ------------- | ------- | ---- | -------- |
| `subdomain_id`| Integer | 是   | 子域名 ID |

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=dns_records&action=list&subdomain_id=1" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**响应**

```json
{
  "success": true,
  "count": 2,
  "records": [
    {
      "id": 1,
      "record_id": "5a0ce6c4d1d4c71bc5e60a2a2a0e4997",
      "name": "test.example.com",
      "type": "A",
      "content": "192.168.1.1",
      "ttl": 600,
      "priority": null,
      "line": null,
      "proxied": false,
      "status": "active",
      "created_at": "2025-10-19 10:05:00",
      "updated_at": "2025-10-19 10:05:00"
    },
    {
      "id": 2,
      "name": "www.test.example.com",
      "type": "CNAME",
      "content": "test.example.com",
      "ttl": 600,
      "priority": null,
      "proxied": false,
      "status": "active",
      "created_at": "2025-10-19 10:10:00"
    }
  ]
}
```

> 提示：列表同时返回模块内部 `id` 和云解析服务商 `record_id`。`update` / `delete` 可使用任意一个字段定位记录（推荐优先使用 `id`）。

### 创建 DNS 记录

```http
POST /index.php?m=domain_hub&endpoint=dns_records&action=create
```

**请求体**

| 参数 / 别名                            | 类型    | 必填 | 说明 |
| -------------------------------------- | ------- | ---- | ---- |
| `subdomain_id`                         | Integer | 是   | 子域名 ID |
| `type`                                 | String  | 是   | 记录类型：`A` / `AAAA` / `CNAME` / `MX` / `TXT` / `NS` / `SRV` / `CAA` |
| `name`                                 | String  | 否   | 记录名称（`@` 或留空 = 当前子域本身；支持完整域名） |
| `content`                              | String  | 条件必填 | 记录值（SRV / CAA 可由结构化参数自动组装） |
| `ttl`                                  | Integer | 否   | TTL 值（默认 600） |
| `priority`                             | Integer | 否   | MX 优先级（默认 10）/ SRV 优先级（默认 0） |
| `line`                                 | String  | 否   | 解析线路（`us.ci` / `cn.mt` 可用，其他域名自动忽略） |
| `record_weight` / `weight`             | Integer | 否   | SRV 权重 |
| `record_port` / `port`                 | Integer | 否   | SRV 端口（1-65535） |
| `record_target` / `target`             | String  | 否   | SRV 目标主机 |
| `caa_flag`                             | Integer | 否   | CAA flag（默认 0） |
| `caa_tag`                              | String  | 否   | CAA tag（默认 `issue`） |
| `caa_value`                            | String  | 否   | CAA value |

> 若 DNS 管理（`disable_ns_management`）为禁用状态，则 `NS` 类型写入会被拒绝。

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=dns_records&action=create" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain_id": 1,
    "type": "A",
    "content": "192.168.1.100",
    "ttl": 600
  }'
```

**响应**

```json
{
  "success": true,
  "message": "DNS record created successfully",
  "id": 3,
  "record_id": "5a0ce6c4d1d4c71bc5e60a2a2a0e4997"
}
```

### 更新 DNS 记录

```http
POST /index.php?m=domain_hub&endpoint=dns_records&action=update
# 或
PUT /index.php?m=domain_hub&endpoint=dns_records&action=update
# 或
PATCH /index.php?m=domain_hub&endpoint=dns_records&action=update
```

**请求体**

| 参数 / 别名                            | 类型    | 必填 | 说明 |
| -------------------------------------- | ------- | ---- | ---- |
| `record_id`                            | String  | 否   | 记录定位 ID（云解析返回的记录 ID） |
| `id`                                    | Integer | 否   | 模块内部记录 ID（推荐） |
| `type`                                 | String  | 否   | 新类型 |
| `name`                                 | String  | 否   | 新名称（`@` 或留空 = 当前子域本身） |
| `content`                              | String  | 否   | 新记录值 |
| `ttl`                                  | Integer | 否   | 新 TTL 值 |
| `priority`                             | Integer | 否   | MX / SRV 优先级 |
| `line`                                 | String  | 否   | 解析线路 |
| `record_weight` / `weight`             | Integer | 否   | SRV 权重 |
| `record_port` / `port`                 | Integer | 否   | SRV 端口 |
| `record_target` / `target`             | String  | 否   | SRV 目标主机 |
| `caa_flag` / `caa_tag` / `caa_value`   | Mixed   | 否   | CAA 结构化参数 |

> 至少提供 `record_id` 或 `id` 其中之一。

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=dns_records&action=update" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "type": "A",
    "content": "192.168.1.200",
    "ttl": 600
  }'
```

**响应**

```json
{
  "success": true,
  "message": "DNS record updated successfully",
  "id": 1,
  "record_id": "5a0ce6c4d1d4c71bc5e60a2a2a0e4997"
}
```

### 删除 DNS 记录

```http
POST /index.php?m=domain_hub&endpoint=dns_records&action=delete
# 或
DELETE /index.php?m=domain_hub&endpoint=dns_records&action=delete
```

**请求体 / Query**

| 参数        | 类型    | 必填 | 说明 |
| ----------- | ------- | ---- | ---- |
| `record_id` | String  | 否   | 云解析服务商返回的记录 ID。提供时将优先按该字段匹配 |
| `id`        | Integer | 否   | 模块内部记录 ID（推荐） |

> 至少提供 `record_id` 或 `id` 其中之一。

```bash
# 方式一：使用 id
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=dns_records&action=delete" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{ "id": 1 }'

# 方式二：使用 record_id
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=dns_records&action=delete" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{ "record_id": "5a0ce6c4d1d4c71bc5e60a2a2a0e4997" }'
```

**响应**

```json
{
  "success": true,
  "message": "DNS record deleted successfully"
}
```

---

## API 密钥管理

> 端点：`keys`

### 列出 API 密钥

```http
GET /index.php?m=domain_hub&endpoint=keys&action=list
```

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=keys&action=list" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**响应**

```json
{
  "success": true,
  "count": 2,
  "keys": [
    {
      "id": 1,
      "key_name": "生产环境密钥",
      "api_key": "cfsd_xxxxxxxxxx",
      "status": "active",
      "request_count": 1523,
      "last_used_at": "2025-10-19 15:30:00",
      "created_at": "2025-10-19 10:00:00"
    },
    {
      "id": 2,
      "key_name": "测试环境密钥",
      "api_key": "cfsd_yyyyyyyyyy",
      "status": "active",
      "request_count": 45,
      "last_used_at": "2025-10-19 14:00:00",
      "created_at": "2025-10-19 11:00:00"
    }
  ]
}
```

### 创建 API 密钥

```http
POST /index.php?m=domain_hub&endpoint=keys&action=create
```

**请求体**

| 参数           | 类型   | 必填 | 说明 |
| -------------- | ------ | ---- | ---- |
| `key_name`     | String | 是   | 密钥名称 |
| `ip_whitelist` | String | 否   | IP 白名单（逗号 / 换行 / 分号分隔，支持单 IP 或 CIDR；需后台开启「启用 API IP 白名单」） |

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=keys&action=create" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{
    "key_name": "新密钥",
    "ip_whitelist": "192.168.1.1,192.168.1.2"
  }'
```

**响应**

```json
{
  "success": true,
  "message": "API key created successfully",
  "api_key": "cfsd_zzzzzzzzzz",
  "api_secret": "aaaaaaaaaaaaaaaa",
  "warning": "Please save the api_secret, it will not be shown again"
}
```

> ⚠️ **重要**：`api_secret` 只显示一次，请妥善保存！

### 删除 API 密钥

```http
POST /index.php?m=domain_hub&endpoint=keys&action=delete
# 或
DELETE /index.php?m=domain_hub&endpoint=keys&action=delete
```

**请求体 / Query**

| 参数    | 类型    | 必填 | 说明   |
| ------- | ------- | ---- | ------ |
| `key_id`| Integer | 是   | 密钥 ID |

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=keys&action=delete" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{ "key_id": 2 }'
```

**响应**

```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

### 重新生成 API 密钥

```http
POST /index.php?m=domain_hub&endpoint=keys&action=regenerate
```

**请求体 / Query**

| 参数    | 类型    | 必填 | 说明   |
| ------- | ------- | ---- | ------ |
| `key_id`| Integer | 是   | 密钥 ID |

```bash
curl -X POST "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=keys&action=regenerate" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy" \
  -H "Content-Type: application/json" \
  -d '{ "key_id": 1 }'
```

**响应**

```json
{
  "success": true,
  "message": "API secret regenerated successfully",
  "api_key": "cfsd_xxxxxxxxxx",
  "api_secret": "new_secret_here",
  "warning": "Please save the new api_secret, it will not be shown again"
}
```

---

## 配额查询

```http
GET /index.php?m=domain_hub&endpoint=quota
```

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=quota" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**响应**

```json
{
  "success": true,
  "quota": {
    "used": 3,
    "base": 5,
    "invite_bonus": 2,
    "total": 7,
    "available": 4
  }
}
```

**字段说明**

| 字段           | 类型    | 说明           |
| -------------- | ------- | -------------- |
| `used`         | Integer | 已使用量       |
| `base`         | Integer | 基础配额       |
| `invite_bonus` | Integer | 邀请奖励       |
| `total`        | Integer | 总配额         |
| `available`    | Integer | 剩余可用       |

---

## WHOIS 查询（公开接口）

> 默认 **无需** API Key，系统会基于访问 IP 做速率限制（默认 30 次/分钟）。若系统开启了「强制 API 验证要求」，则必须使用 API Key。

```http
GET /index.php?m=domain_hub&endpoint=whois&domain=foo.example.com
```

**Query 参数**

| 参数     | 类型   | 必填 | 说明                              |
| -------- | ------ | ---- | --------------------------------- |
| `domain` | String | 是   | 完整子域名，例如 `foo.example.com` |

**公共模式请求**

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=whois&domain=foo.example.com"
```

**API Key 模式请求**

```bash
curl -X GET "https://api005.dnshe.com/index.php?m=domain_hub&endpoint=whois&domain=foo.example.com" \
  -H "X-API-Key: cfsd_xxxxxxxxxx" \
  -H "X-API-Secret: yyyyyyyyyyyy"
```

**响应（已注册）**

```json
{
  "success": true,
  "domain": "foo.example.com",
  "status": "active",
  "registered_at": "2025-01-10 08:30:00",
  "expires_at": "2026-01-10 08:30:00",
  "registrant_email": "whois@example.com",
  "nameservers": [
    "ns1.example.net",
    "ns2.example.net"
  ],
  "rate_limit": {
    "limit": 2,
    "remaining": 1,
    "reset_at": "2025-01-10 08:31:00"
  }
}
```

**响应（未注册）**

```json
{
  "success": true,
  "domain": "foo.example.com",
  "registered": false,
  "status": "unregistered",
  "message": "domain not registered"
}
```

**说明**

- `registrant_email` 的内容取决于是否开启域名隐私保护。
- 同时会返回 `name_servers` 字段，内容与 `nameservers` 一致，便于不同 SDK 兼容。
- 未注册域名会返回 `registered=false` 与 `status=unregistered`，同时附带查询的完整域名。
- 当未启用 API Key 模式时，返回体中的 `rate_limit` 字段展示当前 IP 的剩余额度。

---

## 错误处理

### 统一错误结构（V2.0）

从 V2.0 开始，所有 API 错误响应统一为以下结构：

```json
{
  "success": false,
  "error_code": "auth_invalid_credentials",
  "message": "Invalid API key",
  "details": {
    "request_id": "optional"
  },
  "error": "Invalid API key"
}
```

**字段说明**

| 字段        | 类型    | 说明 |
| ----------- | ------- | ---- |
| `success`   | Boolean | 固定为 `false` |
| `error_code`| String  | 稳定错误码（建议业务侧按此字段处理） |
| `message`   | String  | 人类可读错误描述 |
| `details`   | Object  | 可选，附加上下文（如 `limit` / `remaining` / `reset_at`） |
| `error`     | String  | 兼容旧版客户端（等同 `message`） |

### 常见错误码

| `error_code`                                | HTTP 状态码 | 说明 |
| ------------------------------------------- | ----------- | ---- |
| `bad_request`                               | 400         | 请求参数错误 |
| `auth_invalid_credentials`                  | 401         | API Key / Secret 无效或缺失 |
| `auth_ip_not_allowed`                       | 403         | 请求 IP 不在白名单 |
| `api_access_disabled`                       | 403         | 后台关闭了 API 访问 |
| `not_found` / `subdomain_not_found` / `dns_record_not_found` | 404 | 资源不存在 |
| `quota_exceeded`                            | 429         | 额度不足 |
| `rate_limit_exceeded`                       | 429         | 请求频率超限 |
| `provider_operation_failed`                 | 502         | 上游 DNS 提供商执行失败 |
| `internal_error`                            | 500         | 服务内部异常 |

### 限速响应

**V2.0 格式（推荐）**

```json
{
  "success": false,
  "error_code": "rate_limit_exceeded",
  "message": "Rate limit exceeded",
  "details": {
    "limit": 60,
    "remaining": 0,
    "reset_at": "2025-10-19 15:31:00"
  },
  "error": "Rate limit exceeded"
}
```

**旧版格式（保留作兼容参考）**

```json
{
  "error": "Rate limit exceeded",
  "limit": 60,
  "remaining": 0,
  "reset_at": "2025-10-19 15:31:00"
}
```

### 鉴权错误响应（旧版）

```json
{ "error": "Invalid API key" }
```

---

## SDK 示例

### PHP

```php
<?php
class CloudflareSubdomainAPI {
    private $baseUrl;
    private $apiKey;
    private $apiSecret;

    public function __construct($baseUrl, $apiKey, $apiSecret) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
    }

    private function request($endpoint, $action, $method = 'GET', $data = []) {
        $url = $this->baseUrl . '?m=domain_hub&endpoint=' . $endpoint . '&action=' . $action;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Key: ' . $this->apiKey,
            'X-API-Secret: ' . $this->apiSecret,
            'Content-Type: application/json'
        ]);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return json_decode($response, true);
    }

    // 列出子域名
    public function listSubdomains() {
        return $this->request('subdomains', 'list', 'GET');
    }

    // 注册子域名
    public function registerSubdomain($subdomain, $rootdomain) {
        return $this->request('subdomains', 'register', 'POST', [
            'subdomain' => $subdomain,
            'rootdomain' => $rootdomain
        ]);
    }

    // 创建 DNS 记录
    public function createDnsRecord($subdomainId, $type, $content, $ttl = 600) {
        return $this->request('dns_records', 'create', 'POST', [
            'subdomain_id' => $subdomainId,
            'type' => $type,
            'content' => $content,
            'ttl' => $ttl
        ]);
    }
}

// 使用示例
$api = new CloudflareSubdomainAPI(
    'https://api005.dnshe.com/index.php',
    'cfsd_xxxxxxxxxx',
    'yyyyyyyyyyyy'
);

// 列出子域名
$result = $api->listSubdomains();
print_r($result);

// 注册新子域名
$result = $api->registerSubdomain('myapp', 'example.com');
print_r($result);
```

### Python

```python
import requests
import json

class CloudflareSubdomainAPI:
    def __init__(self, base_url, api_key, api_secret):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.api_secret = api_secret
        self.headers = {
            'X-API-Key': api_key,
            'X-API-Secret': api_secret,
            'Content-Type': 'application/json'
        }

    def request(self, endpoint, action, method='GET', data=None):
        url = f"{self.base_url}?m=domain_hub&endpoint={endpoint}&action={action}"
        if method == 'GET':
            response = requests.get(url, headers=self.headers)
        else:
            response = requests.post(url, headers=self.headers, json=data)
        return response.json()

    def list_subdomains(self):
        return self.request('subdomains', 'list', 'GET')

    def register_subdomain(self, subdomain, rootdomain):
        return self.request('subdomains', 'register', 'POST', {
            'subdomain': subdomain,
            'rootdomain': rootdomain
        })

    def create_dns_record(self, subdomain_id, record_type, content, ttl=600):
        return self.request('dns_records', 'create', 'POST', {
            'subdomain_id': subdomain_id,
            'type': record_type,
            'content': content,
            'ttl': ttl
        })

# 使用示例
api = CloudflareSubdomainAPI(
    'https://api005.dnshe.com/index.php',
    'cfsd_xxxxxxxxxx',
    'yyyyyyyyyyyy'
)

# 列出子域名
result = api.list_subdomains()
print(result)

# 注册新子域名
result = api.register_subdomain('myapp', 'example.com')
print(result)
```

### JavaScript

```javascript
class CloudflareSubdomainAPI {
    constructor(baseUrl, apiKey, apiSecret) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    async request(endpoint, action, method = 'GET', data = null) {
        const url = `${this.baseUrl}?m=domain_hub&endpoint=${endpoint}&action=${action}`;
        const options = {
            method: method,
            headers: {
                'X-API-Key': this.apiKey,
                'X-API-Secret': this.apiSecret,
                'Content-Type': 'application/json'
            }
        };
        if (method === 'POST' && data) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(url, options);
        return await response.json();
    }

    async listSubdomains() {
        return await this.request('subdomains', 'list', 'GET');
    }

    async registerSubdomain(subdomain, rootdomain) {
        return await this.request('subdomains', 'register', 'POST', {
            subdomain: subdomain,
            rootdomain: rootdomain
        });
    }

    async createDnsRecord(subdomainId, type, content, ttl = 600) {
        return await this.request('dns_records', 'create', 'POST', {
            subdomain_id: subdomainId,
            type: type,
            content: content,
            ttl: ttl
        });
    }
}

// 使用示例
const api = new CloudflareSubdomainAPI(
    'https://api005.dnshe.com/index.php',
    'cfsd_xxxxxxxxxx',
    'yyyyyyyyyyyy'
);

// 列出子域名
api.listSubdomains().then(result => {
    console.log(result);
});

// 注册新子域名
api.registerSubdomain('myapp', 'example.com').then(result => {
    console.log(result);
});
```

---

## 安全建议

1. 不在客户端硬编码密钥，使用环境变量存储。
2. 为生产密钥配置 IP 白名单。
3. 遵循最小权限原则，定期轮换密钥（可使用 `keys/regenerate`）。
4. 始终通过 HTTPS 调用 API。
5. 监控异常请求模式，关注 `keys/list` 中的 `request_count` 与 `last_used_at`。

---

## 常见问题

> 摘自旧版文档，V2.0 仍适用。

- **密钥丢失怎么办？** 可通过 `keys/regenerate` 操作重新生成 `api_secret`。
- **速率限制可调整吗？** 可联系管理员调整。
- **谁可以创建和使用 API 密钥？** 仅主账户可创建和使用。
- **是否支持批量操作？** 目前不支持批量操作（如批量添加 / 删除 DNS 记录）。
- **如何查看使用统计？** 可在客户区「API 管理」页面查看。

---

## 接口速查表

| 模块     | Method | Endpoint                                    | Action      | 说明 |
| -------- | ------ | ------------------------------------------- | ----------- | ---- |
| 子域名   | GET    | `subdomains`                                | `list`      | 列出子域名（支持分页 / 搜索 / 过滤 / 排序） |
| 子域名   | POST   | `subdomains`                                | `register`  | 注册子域名 |
| 子域名   | GET    | `subdomains`                                | `get`       | 获取子域名详情 |
| 子域名   | POST / DELETE | `subdomains`                         | `delete`    | 删除子域名 |
| 子域名   | POST / PUT    | `subdomains`                         | `renew`     | 续期子域名 |
| 记录     | GET    | `dns_records`                               | `list`      | 列出 DNS 记录 |
| 记录     | POST   | `dns_records`                               | `create`    | 创建 DNS 记录 |
| 记录     | POST / PUT / PATCH | `dns_records`                  | `update`    | 更新 DNS 记录 |
| 记录     | POST / DELETE | `dns_records`                        | `delete`    | 删除 DNS 记录 |
| 密钥     | GET    | `keys`                                      | `list`      | 列出 API 密钥 |
| 密钥     | POST   | `keys`                                      | `create`    | 创建 API 密钥 |
| 密钥     | POST / DELETE | `keys`                              | `delete`    | 删除 API 密钥 |
| 密钥     | POST   | `keys`                                      | `regenerate`| 重新生成 API 密钥 |
| 配额     | GET    | `quota`                                     | -           | 查询配额 |
| WHOIS    | GET    | `whois`                                     | -           | 公开 WHOIS 查询 |
