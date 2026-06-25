# Gleam 平台支持 Spec

## Why
项目当前仅支持 DNSHE 和 DNSNEKO 两个 DNS 平台。需要新增 Gleam 平台支持，让用户可以通过 Gleam 的 API 管理其子域名和 DNS 记录。

## What Changes
- 新增 Gleam 平台适配器（HMAC-SHA256 签名认证）
- 扩展类型系统、校验器和工厂函数以支持 Gleam
- 前端账号管理页面增加 Gleam 平台选项
- 后端 API 层适配 Gleam 凭据格式

## Impact
- Affected specs: 无（新增平台支持）
- Affected code:
  - `functions/_shared/types.ts` - DNSPlatform 联合类型
  - `functions/_shared/validators.ts` - 平台枚举 + 凭据校验
  - `functions/_shared/platforms/gleam.ts` - **新建** Gleam 适配器
  - `functions/_shared/platforms/factory.ts` - 工厂分发
  - `functions/_shared/db.ts` - 凭据脱敏展示
  - `functions/api/accounts/index.ts` - 凭据标准化
  - `src/types/models.ts` - 前端类型
  - `src/pages/AccountsPage.tsx` - 添加账号表单

## ADDED Requirements

### Requirement: Gleam 平台适配器
系统 SHALL 提供 Gleam 平台的 DNS 适配器，实现 `DNSPlatformAdapter` 接口。

#### Scenario: 列出子域名
- **WHEN** 调用 `listDomains(credentials, options)`
- **THEN** 系统使用 HMAC-SHA256 签名向 Gleam API 发送 GET `/api/open/subdomains` 请求
- **THEN** 返回统一格式的 `UnifiedDomain[]` 列表

#### Scenario: 获取子域名详情
- **WHEN** 调用 `getDomain(credentials, domainId)`
- **THEN** 系统向 Gleam API 发送 GET `/api/open/subdomains/{id}` 请求
- **THEN** 返回统一格式的 `UnifiedDomain`

#### Scenario: 列出 DNS 记录
- **WHEN** 调用 `listRecords(credentials, domainId, options)`
- **THEN** 系统向 Gleam API 发送 GET `/api/open/subdomains/{id}/records` 请求
- **THEN** 返回统一格式的 `UnifiedRecord[]` 列表

#### Scenario: 创建 DNS 记录
- **WHEN** 调用 `createRecord(credentials, domainId, input)`
- **THEN** 系统向 Gleam API 发送 POST `/api/open/subdomains/{id}/records` 请求
- **THEN** 返回新创建的 `UnifiedRecord`

#### Scenario: 更新 DNS 记录
- **WHEN** 调用 `updateRecord(credentials, domainId, recordId, input)`
- **THEN** 系统向 Gleam API 发送 PUT `/api/open/dns-records/{id}` 请求
- **THEN** 返回更新后的 `UnifiedRecord`

#### Scenario: 删除 DNS 记录
- **WHEN** 调用 `deleteRecord(credentials, domainId, recordId)`
- **THEN** 系统向 Gleam API 发送 DELETE `/api/open/dns-records/{id}` 请求

### Requirement: HMAC-SHA256 签名认证
系统 SHALL 为每个 Gleam API 请求生成 HMAC-SHA256 签名。

#### Scenario: 签名生成
- **WHEN** 发送 Gleam API 请求
- **THEN** 请求头包含 `X-Api-Key`（API Key）、`X-Timestamp`（Unix 时间戳秒）、`X-Signature`（HMAC-SHA256 签名）
- **THEN** 签名算法为 `HMAC-SHA256(timestamp + method + path + body, apiSecret)`

### Requirement: Gleam 凭据管理
系统 SHALL 支持 Gleam 平台的 API 凭据（apiKey + apiSecret）的添加、加密存储和脱敏展示。

#### Scenario: 添加 Gleam 账号
- **WHEN** 用户在前端选择 Gleam 平台并填写 API Key 和 API Secret
- **THEN** 系统校验凭据格式（apiKey 8-512 字符，apiSecret 8-512 字符）
- **THEN** 系统加密存储凭据到 D1 数据库
- **THEN** 系统通过调用 `listDomains` 检测连接是否成功

#### Scenario: 凭据脱敏展示
- **WHEN** 查看账号列表
- **THEN** Gleam 账号凭据显示为 `***{后4位}` 格式

### Requirement: 前端 Gleam 平台选择
系统 SHALL 在前端账号添加表单中提供 Gleam 平台选项。

#### Scenario: 平台选择
- **WHEN** 用户打开添加账号表单
- **THEN** 平台下拉框包含 "GLEAM" 选项
- **WHEN** 用户选择 Gleam
- **THEN** 表单显示 API Key 和 API Secret 输入框（API Secret 为密码类型输入）

## MODIFIED Requirements

### Requirement: DNSPlatform 类型扩展
`DNSPlatform` 类型从 `'dnshe' | 'dnsneko'` 扩展为 `'dnshe' | 'dnsneko' | 'gleam'`。

### Requirement: 平台凭据校验扩展
`accountCredentialSchema` 新增 Gleam 平台凭据校验：`{ platform: 'gleam', apiKey: string, apiSecret: string }`。