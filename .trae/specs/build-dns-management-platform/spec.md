# 多域名解析平台统一管理系统 Spec

## Why
个人用户需要在单一界面集中管理 DNSHE 和 DNSNEKO 两个免费域名平台的域名与 DNS 解析记录，目前需要分别登录两个平台操作，效率低下且缺乏统一的到期预警、操作日志等管理能力。

## What Changes
- 构建完整的 Cloudflare Pages 无服务器应用，前端 React + TypeScript + Tailwind + shadcn/ui，后端 Cloudflare Pages Functions
- 实现单管理员 JWT 认证体系，凭证通过环境变量管理，永不入库
- 实现 DNS 平台适配器架构（`DNSPlatformAdapter` 接口），封装 DNSHE 和 DNSNEKO 两个平台的 API 差异
- 实现 API 账号管理（加密存储、分组、连接性检测、导入导出）
- 实现域名统一管理中心（跨平台聚合、到期预警、高级搜索、批量操作）
- 实现 DNS 记录 CRUD（跨平台统一操作界面）
- 实现自动化与提醒（自动刷新、到期检测、邮件提醒、限流控制、失败重试）
- 实现系统管理（操作日志、主题切换、数据备份恢复）
- 使用 Cloudflare D1 存储 API 账号、分组、操作日志等元数据
- 使用 TanStack React Query v5 管理 API 数据缓存与状态同步
- 使用 Zod 前后端统一校验

## Impact
- Affected code: 全新项目，无已有代码受影响
- 依赖服务: Cloudflare Pages、Cloudflare D1、Cloudflare Email Routing

---

## ADDED Requirements

### Requirement: 项目基础设施
系统 SHALL 提供完整的项目脚手架，包含 Vite + React 18 + TypeScript 5.x 构建配置、Tailwind CSS v3 样式体系、shadcn/ui 组件库集成、ESLint + Prettier 代码规范配置，以及 Cloudflare Pages Functions 目录结构。

#### Scenario: 项目可正常构建与开发
- **WHEN** 执行 `npm run dev`
- **THEN** 本地开发服务器启动，支持 HMR 热更新
- **WHEN** 执行 `npm run build`
- **THEN** 生成 Cloudflare Pages 兼容的构建产物

### Requirement: 单管理员 JWT 认证
系统 SHALL 实现基于 JWT 的单管理员认证机制，管理员用户名和密码哈希通过 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD_HASH` 环境变量配置，JWT 密钥通过 `JWT_SECRET` 环境变量配置。

#### Scenario: 管理员登录成功
- **WHEN** 管理员提交正确的用户名和密码
- **THEN** 后端验证密码 bcrypt 哈希匹配，签发 24 小时有效期的 JWT 令牌，返回给前端

#### Scenario: 管理员登录失败
- **WHEN** 管理员提交错误的密码
- **THEN** 返回 401 错误，记录失败次数；5 次失败后锁定 15 分钟

#### Scenario: JWT 令牌自动刷新
- **WHEN** JWT 令牌即将过期（距过期不足 1 小时）
- **THEN** 前端自动发起刷新请求，获取新令牌

#### Scenario: 未认证访问拦截
- **WHEN** 未携带有效 JWT 令牌访问受保护 API
- **THEN** 返回 401 错误，前端重定向到登录页

#### Scenario: 敏感操作二次验证
- **WHEN** 执行添加/删除 API 账号等敏感操作
- **THEN** 要求重新输入管理员密码确认

### Requirement: DNS 平台适配器架构
系统 SHALL 定义标准 `DNSPlatformAdapter` 接口，所有平台相关代码独立封装在 `src/plugins/dns-platforms/` 目录下，提供统一的域名与解析记录模型。

#### Scenario: 适配器接口定义
- **WHEN** 开发者查看 `DNSPlatformAdapter` 接口
- **THEN** 可见以下方法签名：`listDomains`、`getDomainDetail`、`listRecords`、`createRecord`、`updateRecord`、`deleteRecord`、`toggleRecordStatus`、`batchOperation`、`testConnection`

#### Scenario: DNSHE 适配器实现
- **WHEN** 系统调用 DNSHE 适配器
- **THEN** 适配器正确将统一模型转换为 DNSHE API 的 `?m=domain_hub&endpoint=xxx&action=xxx` 路由格式，使用 `X-API-Key` + `X-API-Secret` 认证头

#### Scenario: DNSNEKO 适配器实现
- **WHEN** 系统调用 DNSNEKO 适配器
- **THEN** 适配器正确将统一模型转换为 DNSNEKO API 的 RESTful 路径格式，使用 `X-DNSNEKO-USERNAME` + `X-DNSNEKO-API-KEY` 认证头

### Requirement: API 账号管理
系统 SHALL 支持管理多个 DNS 平台的 API 账号，API 密钥使用 `ENCRYPTION_KEY` 环境变量加密后存储在 D1 数据库中。

#### Scenario: 添加 API 账号
- **WHEN** 管理员填写平台类型、账号名称、API 密钥等信息并提交
- **THEN** 系统加密存储密钥，自动检测连接性，显示连接状态

#### Scenario: 编辑 API 账号
- **WHEN** 管理员修改账号名称或 API 密钥
- **THEN** 系统更新加密存储的密钥，重新检测连接性

#### Scenario: 删除 API 账号
- **WHEN** 管理员删除一个 API 账号（需二次验证）
- **THEN** 系统从 D1 数据库中删除该账号及其关联数据

#### Scenario: 启用/禁用 API 账号
- **WHEN** 管理员切换账号启用状态
- **THEN** 禁用的账号不参与域名数据同步，但保留在数据库中

#### Scenario: 账号分组管理
- **WHEN** 管理员创建/编辑/删除分组
- **THEN** 分组信息（名称、颜色标签）保存在 D1 数据库，账号可分配到分组

#### Scenario: API 连接性检测
- **WHEN** 管理员手动触发或系统自动检测 API 连接性
- **THEN** 调用对应平台的最轻量 API 验证凭证有效性，显示在线/离线/错误状态

#### Scenario: 批量导入/导出
- **WHEN** 管理员导出 API 账号配置
- **THEN** 生成加密 JSON 文件下载
- **WHEN** 管理员导入加密 JSON 文件
- **THEN** 解密并验证后写入 D1 数据库

### Requirement: 域名统一管理中心
系统 SHALL 聚合展示所有平台的域名列表，支持跨平台筛选、搜索、到期预警和批量操作。

#### Scenario: 域名列表聚合展示
- **WHEN** 管理员访问域名管理页面
- **THEN** 系统从所有启用的 API 账号拉取域名数据，聚合展示域名名称、所属平台、API 账号、注册时间、到期时间、剩余天数、状态

#### Scenario: 域名筛选与搜索
- **WHEN** 管理员按平台、分组、状态筛选或输入关键词搜索
- **THEN** 列表实时过滤显示匹配结果

#### Scenario: 到期预警
- **WHEN** 域名到期时间在 30 天内
- **THEN** 该行黄色高亮显示
- **WHEN** 域名到期时间在 7 天内
- **THEN** 该行红色高亮显示
- **WHEN** 域名已过期
- **THEN** 该行红色闪烁显示

#### Scenario: 域名详情页
- **WHEN** 管理员点击某个域名
- **THEN** 展示该域名完整信息及所有 DNS 解析记录，支持记录的增删改查

#### Scenario: 批量刷新域名信息
- **WHEN** 管理员触发批量刷新
- **THEN** 系统异步刷新所有或选中账号的域名数据，显示刷新进度

#### Scenario: 批量导出域名列表
- **WHEN** 管理员导出域名列表
- **THEN** 生成 CSV 文件下载，包含域名名称、平台、到期时间等字段

### Requirement: DNS 记录管理
系统 SHALL 提供统一的 DNS 记录管理界面，支持跨平台的记录增删改查操作。

#### Scenario: 查看 DNS 记录列表
- **WHEN** 管理员进入域名详情页
- **THEN** 展示该域名下所有 DNS 记录，显示主机记录、类型、记录值、线路、TTL、优先级、状态

#### Scenario: 添加 DNS 记录
- **WHEN** 管理员填写记录信息并提交
- **THEN** 系统通过对应平台适配器创建记录，刷新列表

#### Scenario: 修改 DNS 记录
- **WHEN** 管理员编辑某条记录
- **THEN** 系统通过对应平台适配器更新记录，刷新列表

#### Scenario: 删除 DNS 记录
- **WHEN** 管理员删除某条记录（需确认）
- **THEN** 系统通过对应平台适配器删除记录，刷新列表

#### Scenario: 暂停/启用 DNS 记录
- **WHEN** 管理员切换记录状态
- **THEN** 系统通过对应平台适配器更新记录状态

#### Scenario: 批量操作 DNS 记录（DNSNEKO）
- **WHEN** 管理员对 DNSNEKO 平台的记录执行批量暂停/启用/删除/修改TTL/修改线路
- **THEN** 系统调用 DNSNEKO 批量操作 API

### Requirement: 自动化与提醒
系统 SHALL 支持可配置的自动刷新、域名到期检测、邮件提醒和 API 限流控制。

#### Scenario: 自动刷新
- **WHEN** 管理员配置自动刷新间隔（15分钟-24小时）
- **THEN** 前端按配置间隔自动刷新域名数据

#### Scenario: 域名到期邮件提醒
- **WHEN** 系统检测到域名即将到期（30天/7天/已过期）
- **THEN** 通过 Cloudflare Email Routing 发送提醒邮件

#### Scenario: API 限流控制
- **WHEN** 系统调用平台 API
- **THEN** 按平台限速规则（DNSHE: 60次/分钟, DNSNEKO: 30次/60秒账号+60次/60秒IP）控制请求频率，避免触发限速

#### Scenario: 失败自动重试
- **WHEN** API 请求失败（网络错误或 5xx 错误）
- **THEN** 系统按指数退避算法自动重试，最多 3 次

### Requirement: 系统管理
系统 SHALL 提供操作日志、主题切换、数据备份恢复等系统管理功能。

#### Scenario: 操作日志记录
- **WHEN** 管理员执行任何操作
- **THEN** 系统记录操作时间、IP 地址、操作内容、结果到 D1 数据库

#### Scenario: 日志查询与清理
- **WHEN** 管理员查看操作日志
- **THEN** 支持按时间范围、操作类型筛选
- **WHEN** 管理员配置日志保留时间
- **THEN** 系统自动清理过期日志

#### Scenario: 主题切换
- **WHEN** 管理员切换深色/浅色/跟随系统主题
- **THEN** 界面立即切换主题，偏好保存在 localStorage

#### Scenario: 数据备份与恢复
- **WHEN** 管理员触发数据备份
- **THEN** 系统导出所有 D1 数据（加密格式）供下载
- **WHEN** 管理员上传备份文件恢复数据
- **THEN** 系统解密验证后写入 D1 数据库

### Requirement: 界面设计
系统 SHALL 采用深色科技风主题，左侧固定折叠导航栏 + 顶部状态栏 + 卡片式仪表盘主区域的布局。

#### Scenario: 主题色彩
- **WHEN** 页面渲染
- **THEN** 底色为深蓝(#0f172a)，强调色为蓝紫霓虹渐变(#6366f1 → #a855f7)，使用 Inter 无衬线字体

#### Scenario: 响应式布局
- **WHEN** 在桌面、平板、移动设备上访问
- **THEN** 界面自适应适配，导航栏在移动端折叠为汉堡菜单

#### Scenario: 交互反馈
- **WHEN** 执行任何操作
- **THEN** 显示明确的加载状态与成功/失败反馈，API 错误友好提示

### Requirement: Cloudflare Pages 适配
系统 SHALL 严格适配 Cloudflare Pages 运行限制，函数 CPU 时间不超过 10ms，内存不超过 128MB。

#### Scenario: API 请求优化
- **WHEN** 系统调用平台 API
- **THEN** 实现请求队列与并发控制，响应数据缓存，优雅降级

#### Scenario: 错误边界
- **WHEN** 前端组件渲染出错
- **THEN** 错误边界捕获异常，显示友好的错误页面

### Requirement: D1 数据库设计
系统 SHALL 使用 Cloudflare D1 SQLite 数据库存储 API 账号、分组、操作日志、系统设置等元数据。

#### Scenario: 数据库表结构
- **WHEN** 系统初始化
- **THEN** 创建以下表：`api_accounts`（API账号）、`account_groups`（账号分组）、`operation_logs`（操作日志）、`system_settings`（系统设置）

### Requirement: 扩展性设计
系统 SHALL 提供标准的平台适配器开发模板，便于后续添加新 DNS 平台。

#### Scenario: 新增平台适配器
- **WHEN** 开发者在 `src/plugins/dns-platforms/` 下创建新适配器文件
- **THEN** 实现 `DNSPlatformAdapter` 接口即可接入新平台，无需修改核心代码
