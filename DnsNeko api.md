# DNS Neko API 文档

> 接口基础地址：`https://www.dnsneko.com/api/v1/dns`
>
> 所有请求均需携带 `X-DNSNEKO-USERNAME` 与 `X-DNSNEKO-API-KEY` 认证头。

## 目录

- [快速开始](#快速开始)
  - [通用响应格式](#通用响应格式)
  - [错误码](#错误码)
- [授权认证](#授权认证)
- [API 限速](#api-限速)
- [域名管理](#域名管理)
  - [获取域名列表](#获取域名列表)
  - [获取域名详情](#获取域名详情)
- [DNS 记录管理](#dns-记录管理)
  - [查询 DNS 记录](#查询-dns-记录)
  - [添加 DNS 记录](#添加-dns-记录)
  - [修改 DNS 记录](#修改-dns-记录)
  - [删除 DNS 记录](#删除-dns-记录)
  - [暂停 / 启用 DNS 记录](#暂停--启用-dns-记录)
  - [批量操作](#批量操作)
    - [批量暂停 / 启用](#批量暂停--启用)
    - [批量删除](#批量删除)
    - [批量修改 TTL](#批量修改-ttl)
    - [批量修改线路](#批量修改线路)
- [附录：常见响应示例](#附录常见响应示例)

---

## 快速开始

### 通用响应格式

所有接口均返回统一结构：

```json
{
  "code": 200,
  "errorCode": null,
  "message": "success",
  "data": null
}
```

| 字段       | 类型           | 说明                                         |
| ---------- | -------------- | -------------------------------------------- |
| `code`     | Number / String | HTTP 业务状态码，`200` 表示成功              |
| `errorCode`| String \| null | 业务错误码，鉴权或业务异常时返回             |
| `message`  | String         | 人类可读的提示信息                           |
| `data`     | Object \| null | 业务数据，失败时通常为 `null`                |

### 错误码

| `code` | `errorCode`              | `message`            | 说明                       |
| ------ | ------------------------ | -------------------- | -------------------------- |
| 200    | -                        | success              | 操作成功                   |
| 401    | `DNS_API_AUTH_INVALID`   | 用户名或 API Key 无效 | 认证失败                   |
| 404    | -                        | 域名不存在           | 资源不存在                 |
| 429    | -                        | 请求过于频繁         | 触发账号或 IP 限速         |
| 500    | -                        | 系统异常，请稍后重试 | 服务端异常                 |

---

## 授权认证

> 所有 API 请求的 Headers 中都必须携带以下认证字段。

```http
X-DNSNEKO-USERNAME: YOUR_USERNAME
X-DNSNEKO-API-KEY: YOUR_API_KEY
```

当请求体为 JSON（如新增、修改、删除等写操作）时，**还需要** 携带：

```http
Content-Type: application/json
```

---

## API 限速

为防止滥用，接口按 **账号** 与 **IP** 两个维度同时限速，超出后将返回限速相关错误。

| 维度     | 限制        | 窗口期 |
| -------- | ----------- | ------ |
| 账号限速 | 30 次 / 窗口 | 60s    |
| IP 限速  | 60 次 / 窗口 | 60s    |

> - 限速以**滑动窗口**方式统计。
> - 触发限速时，将返回 `code: 429`，请在响应头中关注 `Retry-After` 字段并按其等待后重试。
> - 同一窗口内，`账号限速` 与 `IP 限速` **任一** 命中即触发限速。

---

## 域名管理

### 获取域名列表

```http
GET /api/v1/dns/domains?page=1&size=20
```

**Query 参数**

| 参数   | 类型   | 必填 | 默认 | 说明         |
| ------ | ------ | ---- | ---- | ------------ |
| `page` | Number | 否   | 1    | 当前页码     |
| `size` | Number | 否   | 20   | 每页条数     |

**响应示例**

```json
{
  "code": 200,
  "errorCode": null,
  "message": "success",
  "data": {
    "domains": [
      {
        "id": "2052027056887279618",
        "domain": "a.a.com",
        "status": 0,
        "expired": false,
        "expireTime": "2027-05-06T22:05:50",
        "recordCount": "0"
      },
      {
        "id": "2051625877871120385",
        "domain": "b.a.com",
        "status": 0,
        "expired": false,
        "expireTime": "2027-05-05T19:31:41",
        "recordCount": "0"
      }
    ],
    "total": "2",
    "size": "20",
    "current": "1",
    "pages": "1"
  }
}
```

**`data` 字段说明**

| 字段             | 类型    | 说明                                 |
| ---------------- | ------- | ------------------------------------ |
| `domains`        | Array   | 域名列表                             |
| `domains[].id`   | String  | 域名唯一 ID                          |
| `domains[].domain` | String | 完整域名                             |
| `domains[].status` | Number | 域名状态                             |
| `domains[].expired` | Boolean | 是否已过期                          |
| `domains[].expireTime` | String | 到期时间（ISO 8601）             |
| `domains[].recordCount` | String | 已添加的解析记录数量              |
| `total`          | String  | 总条数                               |
| `size`           | String  | 每页条数                             |
| `current`        | String  | 当前页码                             |
| `pages`          | String  | 总页数                               |

### 获取域名详情

```http
GET /api/v1/dns/domains/{domainId}
```

**Path 参数**

| 参数       | 类型   | 必填 | 说明         |
| ---------- | ------ | ---- | ------------ |
| `domainId` | String | 是   | 域名唯一 ID  |

**响应示例**

```json
{
  "code": 200,
  "errorCode": null,
  "message": "success",
  "data": {
    "domain": {
      "id": "2052027056887279618",
      "domain": "a.a.com",
      "rootDomain": ".os.kg",
      "status": 1,
      "userRemark": null,
      "notice": "备注",
      "rootStatus": 0,
      "rootNotice": "",
      "allowOperation": 1,
      "createTime": "2026-04-26T20:33:28",
      "expireTime": "2027-04-26T20:33:28",
      "expired": false,
      "expiredNotice": null,
      "registerDuration": 1,
      "renewDays": 30,
      "recordCount": null
    }
  }
}
```

**`data.domain` 字段说明**

| 字段                | 类型           | 说明                              |
| ------------------- | -------------- | --------------------------------- |
| `id`                | String         | 域名唯一 ID                       |
| `domain`            | String         | 完整域名                          |
| `rootDomain`        | String         | 根域名                            |
| `status`            | Number         | 域名状态                          |
| `userRemark`        | String \| null | 用户备注                          |
| `notice`            | String         | 平台备注                          |
| `rootStatus`        | Number         | 根域名状态                        |
| `rootNotice`        | String         | 根域名平台备注                    |
| `allowOperation`    | Number         | 是否允许操作（1：允许）           |
| `createTime`        | String         | 创建时间（ISO 8601）              |
| `expireTime`        | String         | 到期时间（ISO 8601）              |
| `expired`           | Boolean        | 是否已过期                        |
| `expiredNotice`     | String \| null | 过期提示                          |
| `registerDuration`  | Number         | 注册时长（年）                    |
| `renewDays`         | Number         | 续费宽限期（天）                  |
| `recordCount`       | String \| null | 解析记录数量                      |

---

## DNS 记录管理

### 查询 DNS 记录

```http
GET /api/v1/dns/records?domainId={domainId}&page=1&size=20
```

**Query 参数**

| 参数       | 类型   | 必填 | 默认 | 说明                          |
| ---------- | ------ | ---- | ---- | ----------------------------- |
| `domainId` | String | 是   | -    | 域名唯一 ID                   |
| `page`     | Number | 否   | 1    | 当前页码                      |
| `size`     | Number | 否   | 20   | 每页条数                      |
| `type`     | String | 否   | -    | 记录类型，如 `A`、`AAAA`、`CNAME` 等 |
| `line`     | String | 否   | -    | 解析线路，如 `default`、`telecom` 等 |
| `status`   | Number | 否   | -    | 状态：1 启用 / 0 暂停         |
| `keyword`  | String | 否   | -    | 主机记录或记录值关键字模糊匹配 |

**筛选示例**：仅查询 A 记录

```http
GET /api/v1/dns/records?domainId={domainId}&page=1&size=20&type=A
```

**响应示例**

```json
{
  "code": 200,
  "errorCode": null,
  "message": "success",
  "data": {
    "domainId": "2052027056887279618",
    "domain": "a.a.com",
    "records": [
      {
        "id": "2052271199416860674",
        "domainId": null,
        "name": "www",
        "type": "A",
        "value": "1.2.3.4",
        "line": "default",
        "ttl": 600,
        "priority": null,
        "remark": "demo",
        "status": 1,
        "updateTime": null
      },
      {
        "id": "2048410440190922754",
        "domainId": null,
        "name": "test",
        "type": "A",
        "value": "1.1.1.1",
        "line": "default",
        "ttl": 600,
        "priority": 10,
        "remark": "",
        "status": 1,
        "updateTime": null
      }
    ],
    "total": "2",
    "size": "20",
    "current": "1",
    "pages": "1"
  }
}
```

**`data.records[]` 字段说明**

| 字段         | 类型           | 说明                                       |
| ------------ | -------------- | ------------------------------------------ |
| `id`         | String         | 记录唯一 ID                                |
| `domainId`   | String \| null | 所属域名 ID                                |
| `name`       | String         | 主机记录（如 `www`、`@`）                  |
| `type`       | String         | 记录类型（A / AAAA / CNAME / MX / TXT …）  |
| `value`      | String         | 记录值                                     |
| `line`       | String         | 解析线路                                   |
| `ttl`        | Number         | TTL（秒）                                  |
| `priority`   | Number \| null | 优先级（MX / SRV 等记录使用）              |
| `remark`     | String         | 备注                                       |
| `status`     | Number         | 状态：1 启用 / 0 暂停                      |
| `updateTime` | String \| null | 最近一次更新时间（ISO 8601）               |

### 添加 DNS 记录

```http
POST /api/v1/dns/records/{domainId}
```

**Path 参数**

| 参数       | 类型   | 必填 | 说明        |
| ---------- | ------ | ---- | ----------- |
| `domainId` | String | 是   | 域名唯一 ID |

**请求体**

```json
{
  "name": "www",
  "type": "A",
  "value": "1.2.3.4",
  "line": "default",
  "ttl": 600,
  "remark": "demo"
}
```

**请求体字段**

| 字段     | 类型   | 必填 | 说明                                            |
| -------- | ------ | ---- | ----------------------------------------------- |
| `name`   | String | 是   | 主机记录（如 `www`、`@`）                      |
| `type`   | String | 是   | 记录类型（A / AAAA / CNAME / MX / TXT …）       |
| `value`  | String | 是   | 记录值                                          |
| `line`   | String | 是   | 解析线路（如 `default`）                        |
| `ttl`    | Number | 是   | TTL（秒）                                       |
| `remark` | String | 否   | 备注                                            |

### 修改 DNS 记录

```http
PUT /api/v1/dns/records/{domainId}/{recordId}
```

**Path 参数**

| 参数       | 类型   | 必填 | 说明            |
| ---------- | ------ | ---- | --------------- |
| `domainId` | String | 是   | 域名唯一 ID     |
| `recordId` | String | 是   | 解析记录唯一 ID |

**请求体**

```json
{
  "name": "api",
  "type": "CNAME",
  "value": "example.com",
  "line": "default",
  "ttl": 600,
  "remark": "updated demo"
}
```

请求体字段与“添加 DNS 记录”一致。

### 删除 DNS 记录

```http
DELETE /api/v1/dns/records/{domainId}/{recordId}
```

**Path 参数**

| 参数       | 类型   | 必填 | 说明            |
| ---------- | ------ | ---- | --------------- |
| `domainId` | String | 是   | 域名唯一 ID     |
| `recordId` | String | 是   | 解析记录唯一 ID |

### 暂停 / 启用 DNS 记录

```http
POST /api/v1/dns/records/{recordId}/status
```

**Path 参数**

| 参数       | 类型   | 必填 | 说明            |
| ---------- | ------ | ---- | --------------- |
| `recordId` | String | 是   | 解析记录唯一 ID |

**请求体**

```json
{ "status": 1 }
```

| 字段     | 类型   | 必填 | 说明                       |
| -------- | ------ | ---- | -------------------------- |
| `status` | Number | 是   | `1` 启用 / `0` 暂停       |

### 批量操作

#### 批量暂停 / 启用

```http
POST /api/v1/dns/records/batch/status
```

```json
{
  "domainId": 1,
  "ids": [11, 12],
  "status": 0
}
```

#### 批量删除

```http
POST /api/v1/dns/records/batch/delete
```

```json
{
  "domainId": 1,
  "ids": [11, 12]
}
```

#### 批量修改 TTL

```http
POST /api/v1/dns/records/batch/ttl
```

```json
{
  "domainId": 1,
  "ids": [11, 12],
  "ttl": 600
}
```

#### 批量修改线路

```http
POST /api/v1/dns/records/batch/line
```

```json
{
  "domainId": 1,
  "ids": [11, 12],
  "line": "default"
}
```

**批量操作请求体字段**

| 字段       | 类型    | 必填 | 说明                              |
| ---------- | ------- | ---- | --------------------------------- |
| `domainId` | Number  | 是   | 域名 ID                           |
| `ids`      | Number[] | 是   | 解析记录 ID 列表                  |
| `status`   | Number  | 否   | 1 启用 / 0 暂停（仅 status 接口） |
| `ttl`      | Number  | 否   | TTL（秒），仅 ttl 接口            |
| `line`     | String  | 否   | 解析线路，仅 line 接口            |

---

## 附录：常见响应示例

### 成功

```json
{
  "code": 200,
  "errorCode": null,
  "message": "success",
  "data": null
}
```

### 系统异常

```json
{
  "code": 500,
  "errorCode": null,
  "message": "系统异常，请稍后重试",
  "data": null
}
```

### 资源不存在

```json
{
  "code": 404,
  "errorCode": null,
  "message": "域名不存在",
  "data": null
}
```

### 认证失败

```json
{
  "code": 401,
  "errorCode": "DNS_API_AUTH_INVALID",
  "message": "用户名或API Key无效",
  "data": null
}
```

---

## 接口速查表

| 模块     | Method | Path                                          | 说明               |
| -------- | ------ | --------------------------------------------- | ------------------ |
| 域名     | GET    | `/api/v1/dns/domains`                         | 获取域名列表       |
| 域名     | GET    | `/api/v1/dns/domains/{domainId}`              | 获取域名详情       |
| 记录     | GET    | `/api/v1/dns/records`                         | 查询 DNS 记录      |
| 记录     | POST   | `/api/v1/dns/records/{domainId}`              | 添加 DNS 记录      |
| 记录     | PUT    | `/api/v1/dns/records/{domainId}/{recordId}`   | 修改 DNS 记录      |
| 记录     | DELETE | `/api/v1/dns/records/{domainId}/{recordId}`   | 删除 DNS 记录      |
| 记录     | POST   | `/api/v1/dns/records/{recordId}/status`       | 暂停 / 启用记录    |
| 记录-批量 | POST  | `/api/v1/dns/records/batch/status`            | 批量暂停 / 启用    |
| 记录-批量 | POST  | `/api/v1/dns/records/batch/delete`            | 批量删除           |
| 记录-批量 | POST  | `/api/v1/dns/records/batch/ttl`               | 批量修改 TTL       |
| 记录-批量 | POST  | `/api/v1/dns/records/batch/line`              | 批量修改线路       |
