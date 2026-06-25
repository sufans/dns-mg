# Tasks

- [x] Task 1: 扩展类型系统和校验器
  - [x] 在 `functions/_shared/types.ts` 中将 `DNSPlatform` 扩展为 `'dnshe' | 'dnsneko' | 'gleam'`
  - [x] 在 `src/types/models.ts` 中将 `DNSPlatform` 扩展为 `'dnshe' | 'dnsneko' | 'gleam'`
  - [x] 在 `functions/_shared/validators.ts` 中将 `dnsPlatformSchema` 扩展为包含 `'gleam'`
  - [x] 在 `accountCredentialSchema` 中添加 Gleam 凭据校验：`{ platform: 'gleam', apiKey: z.string().min(8).max(512), apiSecret: z.string().min(8).max(512) }`

- [x] Task 2: 实现 Gleam 平台适配器
  - [x] 创建 `functions/_shared/platforms/gleam.ts`
  - [x] 实现 HMAC-SHA256 签名函数 `generateSignature(timestamp, method, path, body, apiSecret)`
  - [x] 实现统一请求函数 `request<T>(credentials, url, init)` 自动添加签名头
  - [x] 实现 `listDomains` — GET `/api/open/subdomains`，映射 `UnifiedDomain[]`
  - [x] 实现 `getDomain` — GET `/api/open/subdomains/{id}`，映射 `UnifiedDomain`
  - [x] 实现 `listRecords` — GET `/api/open/subdomains/{id}/records`，映射 `UnifiedRecord[]`
  - [x] 实现 `createRecord` — POST `/api/open/subdomains/{id}/records`
  - [x] 实现 `updateRecord` — PUT `/api/open/dns-records/{id}`
  - [x] 实现 `deleteRecord` — DELETE `/api/open/dns-records/{id}`
  - [x] 定义合理的限流值（参考 DNSHE 模式，默认 `accountWindowLimit: 55, windowSeconds: 60`）

- [x] Task 3: 注册 Gleam 适配器到工厂和基础设施
  - [x] 在 `functions/_shared/platforms/factory.ts` 中导入 `createGleamAdapter` 并添加 `gleam` 分支
  - [x] 在 `functions/_shared/db.ts` 的 `toPublicAccount` 中添加 Gleam 凭据脱敏展示
  - [x] 在 `functions/api/accounts/index.ts` 的 `normalizeConfig` 中添加 Gleam 机读

- [x] Task 4: 前端账号管理页面添加 Gleam 支持
  - [x] 在 `src/pages/AccountsPage.tsx` 的平台下拉框添加 `<option value="gleam">GLEAM</option>`
  - [x] 添加 Gleam 凭据输入框：API Key（明文）和 API Secret（密码类型）
  - [x] 更新 `form` 状态和 `submit` 逻辑以支持 Gleam 凭据格式

- [x] Task 5: 编写平台适配器单元测试
  - [x] 创建 `functions/_shared/platforms/__tests__/gleam.test.ts`
  - [x] 测试签名生成函数正确性
  - [x] 测试 `listDomains` 请求格式（mock fetch）
  - [x] 测试 `listRecords` 请求格式（mock fetch）
  - [x] 测试 `createRecord` 请求格式（mock fetch）
  - [x] 测试 `updateRecord` 请求格式（mock fetch）
  - [x] 测试 `deleteRecord` 请求格式（mock fetch）
  - [x] 测试错误响应处理

# Task Dependencies
- Task 2 依赖 Task 1（需要类型定义完成）
- Task 3 依赖 Task 2（需要适配器实现完成）
- Task 4 依赖 Task 1（需要前端类型扩展）
- Task 5 依赖 Task 2（需要适配器实现完成）
- Task 3 和 Task 4 可并行执行