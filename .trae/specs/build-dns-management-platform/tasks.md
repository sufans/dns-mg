# Tasks

- [ ] Task 1: 项目脚手架与基础配置
  - [ ] 1.1 初始化 Vite + React 18 + TypeScript 5.x 项目
  - [ ] 1.2 配置 Tailwind CSS v3 与自定义主题（深蓝底色、蓝紫霓虹渐变强调色、Inter 字体）
  - [ ] 1.3 集成 shadcn/ui 组件库
  - [ ] 1.4 配置 ESLint + Prettier 代码规范
  - [ ] 1.5 配置 Cloudflare Pages Functions 目录结构（`functions/` 目录）
  - [ ] 1.6 配置 wrangler.toml（D1 绑定、环境变量声明）
  - [ ] 1.7 安装核心依赖：TanStack React Query v5、Zod、Lucide React、bcryptjs、jose

- [ ] Task 2: D1 数据库设计与初始化
  - [ ] 2.1 编写数据库 Schema SQL（api_accounts、account_groups、operation_logs、system_settings 表）
  - [ ] 2.2 创建 D1 数据库初始化迁移脚本
  - [ ] 2.3 实现 Zod Schema 定义所有数据库模型

- [ ] Task 3: DNS 平台适配器架构
  - [ ] 3.1 定义 `DNSPlatformAdapter` 接口与统一数据模型（UnifiedDomain、UnifiedRecord）
  - [ ] 3.2 定义平台适配器注册机制
  - [ ] 3.3 实现 DNSHE 适配器（子域名列表、详情、DNS记录CRUD、配额查询）
  - [ ] 3.4 实现 DNSNEKO 适配器（域名列表、详情、DNS记录CRUD、批量操作、状态切换）
  - [ ] 3.5 实现适配器工厂函数，根据平台类型返回对应适配器实例

- [ ] Task 4: 后端 API - 认证系统
  - [ ] 4.1 实现 `POST /api/auth/login` 登录端点（bcrypt 密码验证、JWT 签发、失败计数与锁定）
  - [ ] 4.2 实现 `POST /api/auth/refresh` 令牌刷新端点
  - [ ] 4.3 实现 `POST /api/auth/verify-password` 二次验证端点
  - [ ] 4.4 实现 JWT 认证中间件（验证令牌、注入用户信息）
  - [ ] 4.5 实现登录限流中间件（5次失败锁定15分钟）

- [ ] Task 5: 后端 API - API 账号管理
  - [ ] 5.1 实现 `GET /api/accounts` 获取账号列表
  - [ ] 5.2 实现 `POST /api/accounts` 添加账号（加密存储密钥、自动连接性检测）
  - [ ] 5.3 实现 `PUT /api/accounts/:id` 编辑账号
  - [ ] 5.4 实现 `DELETE /api/accounts/:id` 删除账号（需二次验证）
  - [ ] 5.5 实现 `PATCH /api/accounts/:id/toggle` 启用/禁用账号
  - [ ] 5.6 实现 `POST /api/accounts/:id/test` 测试连接性
  - [ ] 5.7 实现密钥加密/解密工具函数（使用 ENCRYPTION_KEY）
  - [ ] 5.8 实现 `POST /api/accounts/import` 和 `GET /api/accounts/export` 导入导出

- [ ] Task 6: 后端 API - 账号分组管理
  - [ ] 6.1 实现 `GET /api/groups` 获取分组列表
  - [ ] 6.2 实现 `POST /api/groups` 创建分组
  - [ ] 6.3 实现 `PUT /api/groups/:id` 编辑分组
  - [ ] 6.4 实现 `DELETE /api/groups/:id` 删除分组

- [ ] Task 7: 后端 API - 域名与记录代理
  - [ ] 7.1 实现 `GET /api/domains` 聚合域名列表（从所有启用账号拉取）
  - [ ] 7.2 实现 `GET /api/domains/:accountId/:domainId` 域名详情
  - [ ] 7.3 实现 `GET /api/records/:accountId/:domainId` DNS 记录列表
  - [ ] 7.4 实现 `POST /api/records/:accountId/:domainId` 添加 DNS 记录
  - [ ] 7.5 实现 `PUT /api/records/:accountId/:domainId/:recordId` 修改 DNS 记录
  - [ ] 7.6 实现 `DELETE /api/records/:accountId/:domainId/:recordId` 删除 DNS 记录
  - [ ] 7.7 实现 `POST /api/records/:accountId/:recordId/status` 切换记录状态
  - [ ] 7.8 实现 `POST /api/records/batch/status` 批量状态切换
  - [ ] 7.9 实现 `POST /api/records/batch/delete` 批量删除
  - [ ] 7.10 实现 `POST /api/records/batch/ttl` 批量修改 TTL
  - [ ] 7.11 实现 `POST /api/records/batch/line` 批量修改线路
  - [ ] 7.12 实现 API 请求队列与限流控制（DNSHE 60次/分, DNSNEKO 30次/60秒）
  - [ ] 7.13 实现失败自动重试（指数退避，最多3次）

- [ ] Task 8: 后端 API - 系统管理
  - [ ] 8.1 实现 `GET /api/logs` 操作日志查询（支持筛选）
  - [ ] 8.2 实现 `DELETE /api/logs/cleanup` 日志清理
  - [ ] 8.3 实现 `GET /api/settings` 获取系统设置
  - [ ] 8.4 实现 `PUT /api/settings` 更新系统设置
  - [ ] 8.5 实现 `GET /api/backup` 数据备份导出
  - [ ] 8.6 实现 `POST /api/backup` 数据恢复导入
  - [ ] 8.7 实现操作日志记录中间件

- [ ] Task 9: 前端 - 布局与导航
  - [ ] 9.1 实现主布局组件（左侧折叠导航栏 + 顶部状态栏 + 主内容区）
  - [ ] 9.2 实现导航菜单项（仪表盘、域名管理、API 账号、系统设置）
  - [ ] 9.3 实现响应式适配（移动端汉堡菜单）
  - [ ] 9.4 实现主题切换（深色/浅色/跟随系统）

- [ ] Task 10: 前端 - 登录页
  - [ ] 10.1 实现登录表单组件（用户名、密码输入）
  - [ ] 10.2 实现登录逻辑（调用 API、存储 JWT、重定向）
  - [ ] 10.3 实现登录失败提示与锁定倒计时显示
  - [ ] 10.4 实现 JWT 自动刷新逻辑

- [ ] Task 11: 前端 - 仪表盘页面
  - [ ] 11.1 实现统计卡片（域名总数、即将到期、API 账号数、记录总数）
  - [ ] 11.2 实现到期预警列表
  - [ ] 11.3 实现最近操作日志

- [ ] Task 12: 前端 - API 账号管理页面
  - [ ] 12.1 实现账号列表（表格展示，含平台图标、名称、分组、连接状态、启用状态）
  - [ ] 12.2 实现添加/编辑账号对话框（含连接性测试按钮）
  - [ ] 12.3 实现删除确认对话框（需二次密码验证）
  - [ ] 12.4 实现启用/禁用切换
  - [ ] 12.5 实现分组管理（创建/编辑/删除分组，拖拽分配账号到分组）
  - [ ] 12.6 实现导入/导出功能

- [ ] Task 13: 前端 - 域名管理页面
  - [ ] 13.1 实现域名聚合列表（表格展示，含平台标签、到期预警高亮）
  - [ ] 13.2 实现筛选栏（平台、分组、状态、关键词搜索）
  - [ ] 13.3 实现域名详情页（域名信息 + DNS 记录列表）
  - [ ] 13.4 实现 DNS 记录 CRUD 对话框
  - [ ] 13.5 实现记录状态切换
  - [ ] 13.6 实现批量操作工具栏（批量暂停/启用/删除/修改TTL/修改线路）
  - [ ] 13.7 实现批量刷新与 CSV 导出

- [ ] Task 14: 前端 - 系统设置页面
  - [ ] 14.1 实现操作日志列表（支持筛选与清理）
  - [ ] 14.2 实现刷新间隔配置
  - [ ] 14.3 实现邮件提醒设置
  - [ ] 14.4 实现数据备份与恢复功能
  - [ ] 14.5 实现日志保留时间配置

- [ ] Task 15: 前端 - 全局状态与错误处理
  - [ ] 15.1 配置 TanStack React Query（全局 QueryClient、缓存策略、自动刷新）
  - [ ] 15.2 实现全局错误边界组件
  - [ ] 15.3 实现 API 错误统一处理与友好提示（Toast 通知）
  - [ ] 15.4 实现全局加载状态指示器
  - [ ] 15.5 实现 XSS/CSRF 防护（输入过滤、CSRF Token）

- [ ] Task 16: 邮件提醒集成
  - [ ] 16.1 实现 Cloudflare Email Routing 邮件发送函数
  - [ ] 16.2 实现域名到期检测定时任务（通过 Cloudflare Cron Triggers）
  - [ ] 16.3 实现邮件模板（30天/7天/已过期提醒）

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1, Task 2]
- [Task 5] depends on [Task 2, Task 3, Task 4]
- [Task 6] depends on [Task 2, Task 4]
- [Task 7] depends on [Task 3, Task 4, Task 5]
- [Task 8] depends on [Task 2, Task 4]
- [Task 9] depends on [Task 1]
- [Task 10] depends on [Task 4, Task 9]
- [Task 11] depends on [Task 7, Task 8, Task 9, Task 15]
- [Task 12] depends on [Task 5, Task 6, Task 9, Task 15]
- [Task 13] depends on [Task 7, Task 9, Task 15]
- [Task 14] depends on [Task 8, Task 9, Task 15]
- [Task 15] depends on [Task 1]
- [Task 16] depends on [Task 2, Task 8]
