# API 账号管理后台重构 Spec

## Why

现有代码库结构松散，API 账号管理功能仅作为 Dashboard 的一个子页面，缺乏多账号支持、使用统计、权限管理等核心能力。需要重构为清晰可扩展的模块化架构，聚焦 API 账号管理后台定位，提升专业性与易用性。

## What Changes

- 重构项目定位为 **API 账号管理后台**，精简与账号管理无关的页面（落地页、域名管理、DNS 记录管理、同步任务）
- 重构 DashboardLayout 为专业科技感仪表盘布局，优化导航结构
- 重构 API 账号管理为核心页面：账号列表、添加/编辑表单、API Key 显示/隐藏、权限与状态管理
- 新增多账号支持：同一平台可配置多个账号，支持账号切换、默认账号设置
- 新增调用额度与使用统计：配额展示、请求频率图表、近期调用记录
- 新增搜索筛选：按平台/状态/标签筛选账号
- 重构操作日志页面：关联账号维度的操作记录
- 优化深色/浅色主题切换体验
- 重构 README 为专业技术文档风格

## Impact

- Affected code: `src/components/`（移除 landing/domains/dns-records/sync 页面，重构 api-accounts/dashboard/logs/security）
- Affected stores: `credentials.ts`（扩展为多账号支持）
- Affected types: `index.ts`（新增多账号相关类型）
- Affected layouts: `DashboardLayout.tsx`（精简导航）
- Affected routes: `App.tsx`（移除无关路由）

## ADDED Requirements

### Requirement: 多账号支持

系统 SHALL 支持同一平台配置多个 API 账号，每个账号独立管理凭证与状态。

#### Scenario: 添加同平台多账号
- **WHEN** 用户为 DNSHE 平台添加第二个 API 账号
- **THEN** 系统创建新账号条目，两个账号独立存在，各自维护凭证与状态

#### Scenario: 默认账号设置
- **WHEN** 用户将某账号设为默认
- **THEN** 系统标记该账号为默认（全局仅一个默认账号），其他账号默认标记取消

#### Scenario: 账号切换
- **WHEN** 用户在账号列表中点击切换按钮
- **THEN** 系统切换当前活跃账号，后续 API 操作使用该账号凭证

### Requirement: API 账号列表页

系统 SHALL 提供专业仪表盘式账号列表页面，以卡片化区块展示所有已配置账号。

#### Scenario: 账号列表展示
- **WHEN** 用户进入 API 账号管理页面
- **THEN** 页面以卡片网格展示所有账号，每张卡片包含：平台图标、账号标签、状态徽章、默认标记、API Key 脱敏显示、上次验证时间、快捷操作按钮

#### Scenario: 搜索筛选
- **WHEN** 用户输入搜索关键词或选择筛选条件（平台/状态/标签）
- **THEN** 账号列表实时过滤

#### Scenario: 空状态
- **WHEN** 无已配置账号
- **THEN** 显示空状态引导，提供"添加第一个账号"按钮

### Requirement: 添加/编辑账号表单

系统 SHALL 提供添加和编辑账号的表单，支持凭证输入、标签命名、默认账号设置。

#### Scenario: 添加账号
- **WHEN** 用户点击"添加账号"
- **THEN** 弹出表单，选择平台 → 填写凭证 → 命名标签 → 可选设为默认 → 保存

#### Scenario: 编辑账号
- **WHEN** 用户点击某账号的编辑按钮
- **THEN** 弹出预填凭证的编辑表单，支持修改凭证、标签、默认状态

#### Scenario: 表单验证
- **WHEN** 用户提交表单但必填字段为空
- **THEN** 显示字段级错误提示，阻止提交

### Requirement: API Key 显示/隐藏

系统 SHALL 支持凭证字段的安全显示与隐藏切换。

#### Scenario: 默认隐藏
- **WHEN** 账号卡片或表单展示凭证
- **THEN** 默认脱敏显示（前4后4中间****）

#### Scenario: 点击显示
- **WHEN** 用户点击眼睛图标切换显示
- **THEN** 凭证明文显示，再次点击恢复脱敏

### Requirement: 调用额度与使用统计

系统 SHALL 展示各账号的调用额度与使用统计信息。

#### Scenario: 配额展示
- **WHEN** 用户查看账号详情
- **THEN** 展示该账号的配额使用情况（已用/总量，进度条）

#### Scenario: 请求频率图表
- **WHEN** 用户查看统计面板
- **THEN** 展示近 7 天请求频率折线图（Recharts）

#### Scenario: 近期调用记录
- **WHEN** 用户查看统计面板
- **THEN** 展示最近 10 次 API 调用的时间、端点、状态码

### Requirement: 权限与状态管理

系统 SHALL 管理账号的连接状态与操作权限。

#### Scenario: 连接状态校验
- **WHEN** 用户保存账号凭证后
- **THEN** 系统自动测试连接，更新状态为有效/无效

#### Scenario: 状态徽章
- **WHEN** 账号状态变化
- **THEN** 卡片上状态徽章实时更新（有效=绿色，无效=红色，未验证=灰色）

#### Scenario: 错误处理
- **WHEN** 连接测试失败
- **THEN** 显示具体错误信息（认证失败/网络错误/超时），提供重试按钮

### Requirement: 操作日志

系统 SHALL 记录所有账号相关操作日志。

#### Scenario: 日志记录
- **WHEN** 用户执行添加/编辑/删除/测试/切换账号操作
- **THEN** 系统记录操作日志，包含时间、操作人、操作类型、目标账号、结果

#### Scenario: 日志筛选
- **WHEN** 用户在日志页面筛选
- **THEN** 支持按时间范围、操作类型、目标账号筛选

### Requirement: 统一配置管理

系统 SHALL 提供统一配置管理页面，管理全局设置。

#### Scenario: 全局配置
- **WHEN** 用户进入设置页面
- **THEN** 展示：API 请求速率限制、默认超时时间、自动重试策略、凭证存储方式

### Requirement: 专业科技感仪表盘布局

系统 SHALL 采用专业科技感的仪表盘式布局设计。

#### Scenario: 布局结构
- **WHEN** 用户登录后进入后台
- **THEN** 页面采用左侧精简导航 + 顶部状态栏 + 主内容区布局，导航项精简为：概览、账号管理、操作日志、设置

#### Scenario: 视觉风格
- **WHEN** 页面渲染
- **THEN** 采用卡片化区块、细腻边框、数据图表组件、高可读性无衬线字体，深蓝+青色+灰白配色，突出安全性、易用性和高效管理体验

## MODIFIED Requirements

### Requirement: 精简页面结构

移除与 API 账号管理无关的页面，聚焦核心功能。

- 移除：落地页（LandingPage）、域名管理（DomainListPage）、DNS 记录管理（DnsRecordsPage）、同步任务（SyncTasksPage）
- 保留并重构：仪表盘概览（DashboardPage → 概览页）、API 账号管理（ApiAccountsPage → 核心页面）、操作日志（OperationLogsPage）、安全设置（SecuritySettingsPage → 设置页）
- 登录和初始化流程保持不变

### Requirement: Credentials Store 扩展

扩展凭证存储以支持多账号。

- 每个 ProviderType 下可存储多个账号
- 新增 `accountId` 唯一标识
- 新增 `isDefault` 标记
- 新增 `label` 用户自定义标签
- 新增 `tags` 标签数组

## REMOVED Requirements

### Requirement: 落地页
**Reason**: 项目重构为纯后台管理应用，无需官网落地页
**Migration**: 根路由 `/` 直接重定向到 `/dashboard`

### Requirement: 域名管理页面
**Reason**: 聚焦 API 账号管理，域名管理功能超出范围
**Migration**: Provider 层保留，但移除前端域名管理页面

### Requirement: DNS 记录管理页面
**Reason**: 聚焦 API 账号管理，DNS 记录管理功能超出范围
**Migration**: Provider 层保留，但移除前端 DNS 记录管理页面

### Requirement: 同步任务页面
**Reason**: 聚焦 API 账号管理，同步任务功能超出范围
**Migration**: 移除同步任务页面及相关模拟逻辑
