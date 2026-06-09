# 企业级控制台升级与安全加固 Spec

## Why

当前代码库存在关键缺陷：OperationLogsPage 模块缺失导致构建失败、Provider 单例共享凭证存在并发覆盖风险、密码修改功能未实际执行、仪表盘使用硬编码 Mock 数据、凭证存储使用 Base64 伪加密但 UI 声称 AES-256。需要修复阻断性缺陷、加固安全机制、补全缺失页面、替换 Mock 为真实数据流、完善风控告警体系，使系统达到企业级可用标准。

## What Changes

- 修复 OperationLogsPage 模块缺失（阻断性缺陷）
- 修复 Provider 单例凭证共享问题，改为按账号实例化或凭证快照机制
- 修复 useMediaQuery 无限循环风险
- 实现密码修改实际执行逻辑
- 实现 SetupWizard 步骤 3/4 配置数据持久化
- 替换 Dashboard Mock 数据为真实数据流（React Query + Provider API）
- 实现凭证加密存储（Web Crypto API AES-GCM），移除 Base64 伪加密
- 修正 SetupWizard 中"AES-256 加密"的误导描述
- 新增风控告警中心（速率超限告警、凭证失效告警、配额预警）
- 新增 Cloudflare 适配配置面板
- 新增各平台调用频率与运行限制可视化面板
- 完善操作日志页面（时间/类型/账号/结果筛选、分页）
- 修复 API Client Rate Limiter 内存泄漏
- 修复 ESLint 6 个错误
- 移除未使用的 rememberMe 状态

## Impact

- Affected specs: build-domain-management-platform, refactor-api-account-dashboard
- Affected code:
  - `src/App.tsx`（补全 OperationLogsPage 路由）
  - `src/providers/registry.ts`、`dnshe.ts`、`dnsneko.ts`（凭证隔离）
  - `src/stores/auth.ts`（密码修改、凭证加密）
  - `src/stores/credentials.ts`（AES-GCM 加密替换 Base64）
  - `src/components/dashboard/DashboardPage.tsx`（真实数据替换 Mock）
  - `src/components/auth/SetupWizard.tsx`（配置持久化、描述修正）
  - `src/components/auth/LoginPage.tsx`（移除 rememberMe）
  - `src/components/security/SecuritySettingsPage.tsx`（密码修改执行、Cloudflare 配置）
  - `src/components/logs/`（新建 OperationLogsPage）
  - `src/lib/api.ts`（内存泄漏修复）
  - `src/hooks/useMediaQuery.ts`（循环修复）
  - `src/lib/mock-data.ts`（逐步移除 Mock 依赖）
  - 新增 `src/stores/alerts.ts`（告警 store）
  - 新增 `src/stores/config.ts`（全局配置 store）
  - 新增 `src/components/alerts/`（告警中心页面）
  - 新增 `src/components/rate-limits/`（调用频率面板）

---

## ADDED Requirements

### Requirement: OperationLogsPage 操作日志页面

系统 SHALL 提供完整的操作日志页面，支持查看、筛选、分页。

#### Scenario: 日志列表展示
- **WHEN** 用户进入操作日志页面
- **THEN** 系统展示操作日志列表，包含时间、操作人、操作类型、目标资源、结果、详情字段

#### Scenario: 日志筛选
- **WHEN** 用户按时间范围、操作类型、目标账号、结果状态筛选
- **THEN** 系统实时过滤日志列表

#### Scenario: 日志分页
- **WHEN** 日志数量超过每页限制
- **THEN** 系统展示分页控件，支持翻页

### Requirement: Provider 凭证隔离

系统 SHALL 为每个账号操作创建独立的 Provider 实例或凭证快照，避免并发操作时凭证覆盖。

#### Scenario: 并发账号操作
- **WHEN** 用户同时测试账号 A 和账号 B 的连接
- **THEN** 两个测试操作各自使用正确的凭证，互不干扰

### Requirement: 凭证 AES-GCM 加密存储

系统 SHALL 使用 Web Crypto API 的 AES-GCM 算法加密存储 API 凭证，替代当前的 Base64 编码。

#### Scenario: 凭证加密保存
- **WHEN** 用户添加或更新 API 账号凭证
- **THEN** 系统使用 AES-GCM 加密凭证后存入 localStorage，密钥由用户密码派生（PBKDF2）

#### Scenario: 凭证解密读取
- **WHEN** 系统需要使用 API 凭证发起请求
- **THEN** 系统使用当前会话密钥解密凭证，明文仅存在于内存中

### Requirement: 密码修改实际执行

系统 SHALL 在安全设置页面的密码修改功能中实际更新存储的密码哈希。

#### Scenario: 密码修改成功
- **WHEN** 用户输入正确的当前密码和有效的新密码
- **THEN** 系统更新 localStorage 中的密码哈希，显示成功提示

#### Scenario: 当前密码错误
- **WHEN** 用户输入的当前密码不正确
- **THEN** 系统拒绝修改，显示"当前密码错误"提示

### Requirement: 全局配置持久化

系统 SHALL 持久化存储全局配置（API 速率限制、超时时间、自动重试、凭证存储方式、系统名称、时区、语言）。

#### Scenario: 配置保存
- **WHEN** 用户在设置页面修改全局配置并保存
- **THEN** 系统将配置持久化到 localStorage，页面刷新后配置保持

#### Scenario: SetupWizard 配置传递
- **WHEN** 用户在初始化向导中配置系统名称、时区、语言、存储方式
- **THEN** 这些配置被持久化到全局配置 store

### Requirement: Dashboard 真实数据流

系统 SHALL 使用 React Query 从 Provider API 获取真实数据，替代硬编码 Mock 数据。

#### Scenario: 账号统计
- **WHEN** 用户进入仪表盘
- **THEN** 账号统计（总数、有效、无效）来自 credentials store 的真实数据

#### Scenario: 配额数据
- **WHEN** 仪表盘加载 DNSHE 配额信息
- **THEN** 系统通过 React Query 调用 DNSHE Provider 的 getQuota() 获取真实配额数据，加载中显示骨架屏

#### Scenario: 请求频率图表
- **WHEN** 仪表盘加载请求频率趋势
- **THEN** 系统从各账号的 usageStats 中聚合真实数据

### Requirement: 风控告警中心

系统 SHALL 提供风控告警中心，实时监控 API 调用异常并生成告警。

#### Scenario: 速率超限告警
- **WHEN** API 请求频率超过配置的速率限制
- **THEN** 系统生成速率超限告警，在告警中心展示，顶部状态栏显示告警徽章

#### Scenario: 凭证失效告警
- **WHEN** API 调用返回 401/403 认证错误
- **THEN** 系统自动将对应账号标记为无效，生成凭证失效告警

#### Scenario: 配额预警
- **WHEN** DNSHE 配额使用率超过 80%
- **THEN** 系统生成配额预警告警

#### Scenario: 告警确认
- **WHEN** 用户查看告警并点击确认
- **THEN** 告警标记为已读，从未读列表移除

### Requirement: Cloudflare 适配配置面板

系统 SHALL 在设置页面提供 Cloudflare 适配配置面板。

#### Scenario: Cloudflare 配置展示
- **WHEN** 用户进入设置页面的 Cloudflare 配置区域
- **THEN** 展示当前 Cloudflare 部署状态、Workers 绑定信息、Secrets 配置状态

#### Scenario: 存储方式切换
- **WHEN** 用户将凭证存储方式从"本地存储"切换为"Cloudflare Secrets"
- **THEN** 系统提示需要配置 Cloudflare 环境变量，展示配置指引

### Requirement: 调用频率与运行限制面板

系统 SHALL 提供各平台调用频率与运行限制的可视化面板。

#### Scenario: 频率面板展示
- **WHEN** 用户查看调用频率面板
- **THEN** 展示各账号的：当前速率（请求/分钟）、速率限制、剩余配额、近 24 小时请求趋势图

#### Scenario: 限制配置
- **WHEN** 用户修改某账号的速率限制
- **THEN** 系统更新该账号的速率限制配置，后续请求按新限制执行

### Requirement: API Client 内存泄漏修复

系统 SHALL 在 API Client 不再使用时清理定时器，避免内存泄漏。

#### Scenario: 模块卸载
- **WHEN** API Client 模块被热重载或应用卸载
- **THEN** cleanupInterval 被正确清理

### Requirement: useMediaQuery 循环修复

系统 SHALL 修复 useMediaQuery 中 effect 依赖 matches 导致的潜在无限循环。

#### Scenario: 媒体查询初始化
- **WHEN** 组件首次挂载使用 useMediaQuery
- **THEN** 正确初始化匹配状态，不触发多余渲染

## MODIFIED Requirements

### Requirement: 凭证存储安全升级

原 Base64 编码存储升级为 AES-GCM 加密存储。SetupWizard 中"AES-256 加密"描述修正为与实际实现一致。

- 存储格式：`{ iv: string, ciphertext: string }` 的 Base64 编码
- 密钥派生：PBKDF2(password, salt, 100000 iterations, SHA-256)
- 兼容：检测旧格式数据时自动迁移

### Requirement: 导航结构扩展

DashboardLayout 导航新增"告警中心"项，导航项更新为：概览、API 账号、告警中心、操作日志、设置。

### Requirement: 顶部状态栏增强

顶部状态栏新增告警徽章，显示未读告警数量，点击跳转告警中心。

## REMOVED Requirements

### Requirement: rememberMe 未使用状态
**Reason**: LoginPage 的 rememberMe 状态从未在登录逻辑中使用，属于死代码
**Migration**: 移除 rememberMe 相关状态和 UI 元素
