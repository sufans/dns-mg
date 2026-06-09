# Tasks

- [x] Task 1: 项目初始化与基础架构搭建
  - [x] 1.1 使用 Vite + React 18 + TypeScript 初始化项目
  - [x] 1.2 安装配置 Tailwind CSS、shadcn/ui、React Router、Zustand、TanStack Query/Table、Recharts
  - [x] 1.3 建立规范目录结构：`src/{components,pages,hooks,lib,stores,types,providers,layouts}`
  - [x] 1.4 配置 ESLint + Prettier，统一代码风格
  - [x] 1.5 配置明暗双主题（CSS 变量 + Tailwind dark mode），深蓝+青色+灰白配色体系
  - [x] 1.6 实现全局布局组件：DashboardLayout（左侧固定导航+顶部状态栏+内容区）、AuthLayout、LandingLayout

- [x] Task 2: Provider 抽象层与 API 集成
  - [x] 2.1 定义 Provider 抽象接口（DomainProvider）：域名列表、域名详情、DNS 记录 CRUD、批量操作等
  - [x] 2.2 实现 DNSHE Provider：子域名管理、DNS 记录管理、API 密钥管理、配额查询、WHOIS 查询
  - [x] 2.3 实现 DNSNeko Provider：域名管理、DNS 记录 CRUD、暂停/启用、批量操作
  - [x] 2.4 实现统一数据转换层，将两个平台不同响应格式映射为统一数据模型
  - [x] 2.5 实现 API 请求封装（fetch wrapper）：错误处理、重试逻辑、速率限制、请求/响应拦截
  - [x] 2.6 实现 Provider 注册表，支持动态注册新平台

- [x] Task 3: 用户认证与初始化流程
  - [x] 3.1 实现登录页面（用户名+密码表单，JWT Token 签发与存储）
  - [x] 3.2 实现首次访问引导流程：欢迎页 → 创建管理员账号 → 基础信息填写 → 安全配置
  - [x] 3.3 实现 Auth Store（Zustand）：Token 管理、登录状态、用户信息
  - [x] 3.4 实现路由守卫：未登录跳转登录页、Token 过期自动登出
  - [x] 3.5 实现 API 凭证安全存储：Cloudflare Secrets 集成 / 本地加密存储，凭证脱敏显示

- [x] Task 4: 仪表盘总览页面
  - [x] 4.1 实现统计卡片组件：域名总数、即将到期域名、DNS 记录总数、同步任务状态
  - [x] 4.2 实现各平台配额使用情况展示（进度条 + 数字）
  - [x] 4.3 实现到期预警卡片：30天内到期域名列表，按剩余天数排序
  - [x] 4.4 实现近期操作日志摘要卡片
  - [x] 4.5 实现简单图表：域名趋势、记录类型分布（Recharts）

- [x] Task 5: 域名管理页面
  - [x] 5.1 实现域名列表表格（TanStack Table）：域名、平台来源、状态徽章、到期时间、记录数量
  - [x] 5.2 实现搜索、筛选（平台/状态/到期时间范围）、排序功能
  - [x] 5.3 实现分页组件
  - [x] 5.4 实现域名导出为 CSV 功能
  - [x] 5.5 实现域名详情抽屉/弹窗（DNSHE: 子域名详情+续期+删除; DNSNeko: 域名详情）

- [x] Task 6: DNS 记录管理页面
  - [x] 6.1 实现 DNS 记录列表表格：主机记录、类型、记录值、线路、TTL、优先级、状态、备注
  - [x] 6.2 实现搜索筛选（类型/线路/状态/关键词）、排序
  - [x] 6.3 实现添加 DNS 记录表单（根据平台动态展示字段）
  - [x] 6.4 实现编辑 DNS 记录表单
  - [x] 6.5 实现删除 DNS 记录（确认弹窗）
  - [x] 6.6 实现暂停/启用 DNS 记录切换
  - [x] 6.7 实现批量操作：批量删除、批量修改 TTL、批量修改线路、批量暂停/启用
  - [x] 6.8 实现自定义列显示/隐藏
  - [x] 6.9 实现分页

- [x] Task 7: API 账号管理面板
  - [x] 7.1 实现已配置平台列表：平台名称、凭证状态徽章（有效/无效/未配置）、最后验证时间
  - [x] 7.2 实现添加/编辑平台凭证表单（DNSHE: API Key + Secret; DNSNeko: Username + API Key）
  - [x] 7.3 实现测试连接功能：调用平台 API 验证凭证有效性
  - [x] 7.4 实现凭证脱敏显示和删除功能

- [x] Task 8: 同步任务管理
  - [x] 8.1 实现手动同步触发按钮
  - [x] 8.2 实现同步任务列表：任务类型、触发时间、状态标签（排队中/执行中/已完成/失败）、进度条
  - [x] 8.3 实现异步分批任务执行逻辑（前端模拟 + 状态轮询）

- [x] Task 9: 操作日志页面
  - [x] 9.1 实现操作日志列表：时间、操作人、操作类型、目标资源、结果
  - [x] 9.2 实现按时间范围和操作类型筛选

- [x] Task 10: 安全设置页面
  - [x] 10.1 实现密码修改表单（旧密码 + 新密码 + 确认密码）
  - [x] 10.2 实现会话管理（查看活跃会话、强制登出）
  - [x] 10.3 实现 API 速率限制配置

- [x] Task 11: 官网落地页
  - [x] 11.1 实现 Hero 区域：标题、副标题、CTA 按钮
  - [x] 11.2 实现功能概览区：统一管理、多平台支持、安全存储、智能预警等特性卡片
  - [x] 11.3 实现平台支持区：DNSHE、DNSNeko 平台介绍，预留更多平台
  - [x] 11.4 实现安全特性区：Cloudflare Secrets、JWT、速率限制
  - [x] 11.5 实现引导步骤区：注册 → 配置 API → 同步域名 → 管理记录
  - [x] 11.6 实现底部 CTA 和页脚

- [x] Task 12: UI 反馈与状态组件
  - [x] 12.1 实现骨架屏组件（Table Skeleton、Card Skeleton）
  - [x] 12.2 实现 Toast 通知系统（成功/失败/警告/信息）
  - [x] 12.3 实现确认弹窗组件（危险操作二次确认）
  - [x] 12.4 实现空状态组件（插图 + 引导文案 + 操作按钮）
  - [x] 12.5 实现错误状态页（404、500、网络错误）
  - [x] 12.6 实现状态徽章、标签、进度条组件

- [x] Task 13: 响应式适配
  - [x] 13.1 实现移动端导航折叠（汉堡菜单 + 抽屉）
  - [x] 13.2 实现表格在小屏幕下的卡片视图切换
  - [x] 13.3 实现触屏操作按钮适配

- [x] Task 14: 测试与质量保障
  - [x] 14.1 配置 Vitest 测试框架
  - [x] 14.2 编写 Provider 层单元测试（DNSHE、DNSNeko 数据转换）
  - [x] 14.3 编写认证流程集成测试
  - [x] 14.4 编写核心组件渲染测试
  - [x] 14.5 确保测试覆盖率 >= 70%（核心业务逻辑）

- [x] Task 15: 文档与部署
  - [x] 15.1 编写 README：项目简介、技术栈、目录结构、开发环境搭建
  - [x] 15.2 编写构建部署步骤（Cloudflare Pages 部署配置）
  - [x] 15.3 编写配置示例和环境变量说明
  - [x] 15.4 编写排障指南和边缘运行时兼容说明

# Task Dependencies

- [Task 2] depends on [Task 1] (Provider 层需要项目基础架构)
- [Task 3] depends on [Task 1] (认证需要布局和路由)
- [Task 4] depends on [Task 2, Task 3] (仪表盘需要 Provider 数据和认证)
- [Task 5] depends on [Task 2, Task 3] (域名管理需要 Provider 和认证)
- [Task 6] depends on [Task 2, Task 3, Task 5] (DNS 记录管理依赖域名管理)
- [Task 7] depends on [Task 2, Task 3] (API 账号管理需要 Provider 和认证)
- [Task 8] depends on [Task 2, Task 3] (同步任务需要 Provider 和认证)
- [Task 9] depends on [Task 3] (操作日志需要认证)
- [Task 10] depends on [Task 3] (安全设置需要认证)
- [Task 11] depends on [Task 1] (官网需要基础架构)
- [Task 12] depends on [Task 1] (UI 反馈组件需要基础架构)
- [Task 13] depends on [Task 4-10] (响应式适配依赖各页面组件)
- [Task 14] depends on [Task 2, Task 3] (测试需要核心逻辑完成)
- [Task 15] depends on [Task 1-14] (文档在功能完成后编写)
