# 多平台域名统一管理系统 Spec

## Why

当前 DNSHE 和 DNSNeko 两个免费域名平台的 API 分散管理，缺乏统一的管理界面。需要构建一个现代化、专业级的一体化官网与控制台网站，实现多平台域名集中管理、DNS 记录统一操作、API 账号安全存储，面向 Cloudflare 原生部署。

## What Changes

- 新建 React 18 + TypeScript + Tailwind CSS + shadcn/ui 前端项目
- 实现官网落地页（功能概览、引导步骤、账号信息面板）
- 实现高密度 SaaS Dashboard 控制台（左侧导航、统计卡片、域名列表、DNS 管理、API 账号、同步任务、操作日志、安全设置）
- 集成 DNSHE API（子域名管理、DNS 记录 CRUD、API 密钥管理、配额查询、WHOIS 查询）
- 集成 DNSNeko API（域名管理、DNS 记录 CRUD、批量操作、暂停/启用）
- 实现可扩展的多平台接入架构（Provider 抽象层）
- 实现用户系统（JWT 登录、首次初始化引导、Cloudflare Secrets 安全存储）
- 实现明暗双主题、响应式布局、骨架屏、Toast、确认弹窗、空状态、错误状态
- 实现域名同步与到期预警、搜索筛选排序、分页、自定义列、导出
- 实现系统日志与异步分批任务队列状态展示
- 编写 README、部署步骤、配置示例、排障文档

## Impact

- Affected code: 全新项目，无现有代码影响
- 依赖: React 18, TypeScript, Tailwind CSS, shadcn/ui, Vite, React Router, Zustand, TanStack Query/Table, Recharts, Cloudflare Workers/Pages

---

## ADDED Requirements

### Requirement: 项目初始化与基础架构

系统 SHALL 使用 Vite + React 18 + TypeScript 初始化项目，采用 Tailwind CSS + shadcn/ui 组件库，建立规范目录结构。

#### Scenario: 项目结构就绪
- **WHEN** 开发者克隆仓库并运行 `pnpm install`
- **THEN** 项目可正常启动开发服务器，目录结构包含 `src/{components,pages,hooks,lib,stores,types,providers,layouts}` 等规范目录

### Requirement: 多平台 Provider 抽象层

系统 SHALL 提供统一的 DNS Provider 抽象接口，支持 DNSHE 和 DNSNeko 两个平台实现，并预留扩展其他平台的能力。

#### Scenario: 统一接口调用
- **WHEN** 前端调用域名列表接口
- **THEN** 系统根据当前选中的 Provider 自动路由到 DNSHE 或 DNSNeko 的 API 实现，返回统一格式的数据

#### Scenario: 新平台接入
- **WHEN** 需要接入新的 DNS 平台
- **THEN** 只需实现 Provider 接口并注册，无需修改业务逻辑代码

### Requirement: DNSHE API 集成

系统 SHALL 完整集成 DNSHE API，包括：
- 子域名管理（列表、注册、详情、删除、续期）
- DNS 记录管理（列表、创建、更新、删除）
- API 密钥管理（列表、创建、删除、重新生成）
- 配额查询
- WHOIS 查询

#### Scenario: DNSHE 子域名列表
- **WHEN** 用户选择 DNSHE 平台并查看域名列表
- **THEN** 系统调用 `GET /index.php?m=domain_hub&endpoint=subdomains&action=list` 并展示分页结果，支持搜索、过滤、排序

#### Scenario: DNSHE DNS 记录创建
- **WHEN** 用户在 DNSHE 域名下添加 DNS 记录
- **THEN** 系统调用 `POST /index.php?m=domain_hub&endpoint=dns_records&action=create` 并刷新记录列表

### Requirement: DNSNeko API 集成

系统 SHALL 完整集成 DNSNeko API，包括：
- 域名管理（列表、详情）
- DNS 记录管理（查询、添加、修改、删除、暂停/启用）
- 批量操作（批量暂停/启用、批量删除、批量修改 TTL、批量修改线路）

#### Scenario: DNSNeko 域名列表
- **WHEN** 用户选择 DNSNeko 平台并查看域名列表
- **THEN** 系统调用 `GET /api/v1/dns/domains` 并展示分页结果

#### Scenario: DNSNeko 批量操作
- **WHEN** 用户选中多条 DNS 记录并执行批量删除
- **THEN** 系统调用 `POST /api/v1/dns/records/batch/delete` 并刷新列表

### Requirement: 用户认证与初始化

系统 SHALL 实现基于 JWT 的单账号认证系统，支持首次进入时的欢迎引导和账号初始化设置。

#### Scenario: 首次访问引导
- **WHEN** 用户首次访问系统且未完成初始化
- **THEN** 系统展示欢迎引导流程，包含：创建管理员账号、基础信息填写、安全配置（API 凭证存储方式选择）

#### Scenario: JWT 登录
- **WHEN** 用户输入正确的用户名和密码
- **THEN** 系统签发 JWT Token 并存储，跳转至 Dashboard

#### Scenario: Token 过期
- **WHEN** JWT Token 过期
- **THEN** 系统自动跳转至登录页面并提示重新登录

### Requirement: API 凭证安全存储

系统 SHALL 使用 Cloudflare Secrets 或本地加密存储 API 凭证（DNSHE 的 API Key/Secret、DNSNeko 的 Username/API Key），凭证在传输和存储时均加密。

#### Scenario: 凭证保存
- **WHEN** 用户在 API 账号管理面板添加平台凭证
- **THEN** 系统加密存储凭证，界面仅显示脱敏后的部分信息（如 `cfsd_xxx***xxx`）

#### Scenario: 凭证验证
- **WHEN** 用户保存凭证后点击"测试连接"
- **THEN** 系统调用对应平台的认证接口验证凭证有效性，返回成功或失败提示

### Requirement: 仪表盘总览

系统 SHALL 提供仪表盘总览页面，展示关键统计数据和状态信息。

#### Scenario: 仪表盘数据展示
- **WHEN** 用户进入仪表盘页面
- **THEN** 页面展示：域名总数、即将到期域名数、DNS 记录总数、同步任务状态、各平台配额使用情况，以及近期操作日志摘要

#### Scenario: 到期预警
- **WHEN** 存在 30 天内即将到期的域名
- **THEN** 仪表盘显示到期预警卡片，列出即将到期的域名及剩余天数

### Requirement: 域名管理

系统 SHALL 提供统一的域名管理界面，支持跨平台域名列表展示、搜索、筛选、排序、分页。

#### Scenario: 域名列表
- **WHEN** 用户进入域名管理页面
- **THEN** 系统展示所有平台的域名列表，包含域名、平台来源、状态徽章、到期时间、记录数量等列

#### Scenario: 域名搜索筛选
- **WHEN** 用户输入搜索关键词或选择筛选条件（平台、状态、到期时间范围）
- **THEN** 系统实时过滤域名列表

#### Scenario: 域名导出
- **WHEN** 用户点击导出按钮
- **THEN** 系统将当前筛选结果导出为 CSV 文件

### Requirement: DNS 记录管理

系统 SHALL 提供统一的 DNS 记录管理表格，支持增删改查、批量操作、搜索筛选排序、分页、自定义列。

#### Scenario: DNS 记录列表
- **WHEN** 用户点击某个域名查看 DNS 记录
- **THEN** 系统展示该域名下的所有 DNS 记录，支持按类型、线路、状态筛选

#### Scenario: DNS 记录编辑
- **WHEN** 用户点击某条记录的编辑按钮
- **THEN** 系统弹出编辑表单，用户修改后提交，系统调用对应平台 API 更新记录

#### Scenario: 批量操作
- **WHEN** 用户选中多条记录并选择批量操作（删除、修改 TTL、修改线路、暂停/启用）
- **THEN** 系统执行批量操作并显示进度和结果

#### Scenario: 自定义列
- **WHEN** 用户点击表格列设置
- **THEN** 用户可选择显示或隐藏特定列

### Requirement: API 账号管理面板

系统 SHALL 提供 API 账号管理面板，管理各平台的 API 凭证信息。

#### Scenario: 查看已配置平台
- **WHEN** 用户进入 API 账号管理页面
- **THEN** 系统展示已配置的平台列表，包含平台名称、凭证状态（有效/无效/未配置）、最后验证时间

#### Scenario: 添加/编辑平台凭证
- **WHEN** 用户点击添加或编辑平台凭证
- **THEN** 系统展示对应平台的凭证输入表单（DNSHE: API Key + API Secret; DNSNeko: Username + API Key），支持测试连接

### Requirement: 同步任务管理

系统 SHALL 支持域名数据同步任务，可手动触发或定时执行。

#### Scenario: 手动同步
- **WHEN** 用户点击"立即同步"按钮
- **THEN** 系统创建异步同步任务，从各平台拉取最新域名和记录数据

#### Scenario: 同步状态查看
- **WHEN** 同步任务执行中
- **THEN** 系统展示任务进度条和状态标签（排队中/执行中/已完成/失败）

### Requirement: 操作日志

系统 SHALL 记录所有关键操作日志，支持查看和筛选。

#### Scenario: 日志查看
- **WHEN** 用户进入操作日志页面
- **THEN** 系统展示操作时间、操作人、操作类型、目标资源、操作结果等字段，支持按时间和类型筛选

### Requirement: 安全设置

系统 SHALL 提供安全设置页面，包含密码修改、会话管理、API 速率限制配置。

#### Scenario: 密码修改
- **WHEN** 用户在安全设置页面修改密码
- **THEN** 系统验证旧密码后更新，所有现有会话失效

#### Scenario: 速率限制配置
- **WHEN** 用户配置 API 请求速率限制
- **THEN** 系统按配置限制对上游 API 的请求频率，避免触发平台限速

### Requirement: 明暗双主题

系统 SHALL 支持亮色和暗色主题切换，默认跟随系统偏好。

#### Scenario: 主题切换
- **WHEN** 用户点击主题切换按钮
- **THEN** 界面立即切换为对应主题，偏好保存至本地存储

### Requirement: 响应式布局

系统 SHALL 支持桌面端和移动端自适应布局。

#### Scenario: 移动端访问
- **WHEN** 用户在移动端访问控制台
- **THEN** 左侧导航折叠为汉堡菜单，表格切换为卡片视图，操作按钮适配触屏

### Requirement: UI 反馈组件

系统 SHALL 提供完整的 UI 反馈组件：骨架屏、Toast 通知、确认弹窗、空状态、错误状态页。

#### Scenario: 数据加载中
- **WHEN** 页面数据正在加载
- **THEN** 显示骨架屏占位

#### Scenario: 操作成功/失败
- **WHEN** 用户执行操作后
- **THEN** 系统显示 Toast 通知提示操作结果

#### Scenario: 确认危险操作
- **WHEN** 用户执行删除等不可逆操作
- **THEN** 系统弹出确认弹窗，用户确认后执行

#### Scenario: 空数据
- **WHEN** 列表无数据
- **THEN** 显示空状态插图和引导文案

#### Scenario: 页面错误
- **WHEN** 发生未捕获的错误
- **THEN** 显示友好的错误状态页，提供重试按钮

### Requirement: 官网落地页

系统 SHALL 提供官网落地页，展示产品功能概览、引导步骤、特性介绍。

#### Scenario: 访问官网
- **WHEN** 用户访问根路径且未登录
- **THEN** 展示官网落地页，包含：顶部导航栏、Hero 区域、功能概览、平台支持、安全特性、引导步骤、底部 CTA

### Requirement: 生产级工程质量

系统 SHALL 满足生产级实现质量要求。

#### Scenario: 代码规范
- **WHEN** 开发者提交代码
- **THEN** 代码通过 ESLint + Prettier 检查，TypeScript 类型完整，无 any 类型滥用

#### Scenario: 异常处理
- **WHEN** API 请求失败或网络异常
- **THEN** 系统捕获异常并展示友好错误提示，不暴露内部错误信息

#### Scenario: 测试覆盖
- **WHEN** 运行测试套件
- **THEN** 核心业务逻辑（Provider 层、认证流程、数据转换）测试覆盖率 >= 70%

### Requirement: 文档与部署

系统 SHALL 提供完整的文档和部署指南。

#### Scenario: README 文档
- **WHEN** 开发者查看 README
- **THEN** 文档包含：项目简介、技术栈、目录结构说明、开发环境搭建、构建部署步骤、配置示例、环境变量说明、排障指南、Cloudflare 部署说明

#### Scenario: Cloudflare 部署
- **WHEN** 按文档部署至 Cloudflare Pages
- **THEN** 应用可正常运行，边缘运行时兼容，Secrets 配置正确
