# Tasks

- [x] Task 1: 类型系统重构 - 扩展多账号类型定义
  - [x] 1.1 在 `types/index.ts` 中新增 `AccountEntry` 接口
  - [x] 1.2 新增 `UsageStats` 接口
  - [x] 1.3 新增 `DailyRequest` 接口
  - [x] 1.4 新增 `RecentCall` 接口
  - [x] 1.5 新增 `ProviderInfo`、`CredentialField`、`GlobalConfig` 接口

- [x] Task 2: Credentials Store 重构 - 多账号支持
  - [x] 2.1 重构 `stores/credentials.ts`：支持同平台多账号
  - [x] 2.2 新增 `addAccount`、`updateAccount`、`removeAccount`、`getAccount`、`getAccountsByProvider`、`setDefaultAccount`、`getDefaultAccount` 方法
  - [x] 2.3 自动默认逻辑：首个账号自动设为默认
  - [x] 2.4 新存储键 `dns-mgr-accounts`

- [x] Task 3: 移除无关页面与路由
  - [x] 3.1 删除 `components/landing/` 目录
  - [x] 3.2 删除 `components/domains/` 目录
  - [x] 3.3 删除 `components/dns-records/` 目录
  - [x] 3.4 删除 `components/sync/` 目录
  - [x] 3.5 更新 `App.tsx` 路由
  - [x] 3.6 清理 `lib/mock-data.ts`

- [x] Task 4: DashboardLayout 导航精简
  - [x] 4.1 更新导航项为：概览、账号管理、操作日志、设置
  - [x] 4.2 移除无关导航项
  - [x] 4.3 更新路由路径

- [x] Task 5: 概览页重构
  - [x] 5.1 统计卡片：已配置/有效/无效账号数、今日请求
  - [x] 5.2 账号状态分布饼图
  - [x] 5.3 请求频率折线图
  - [x] 5.4 平台配额概览
  - [x] 5.5 近期操作日志摘要

- [x] Task 6: API 账号管理核心页重构
  - [x] 6.1 卡片网格展示账号
  - [x] 6.2 搜索筛选
  - [x] 6.3 添加账号流程
  - [x] 6.4 编辑账号表单
  - [x] 6.5 API Key 显示/隐藏切换
  - [x] 6.6 默认账号设置
  - [x] 6.7 账号详情展开面板
  - [x] 6.8 空状态引导
  - [x] 6.9 Sonner toast 替换 alert

- [x] Task 7: 操作日志页重构
  - [x] 7.1 关联账号维度
  - [x] 7.2 按目标账号筛选
  - [x] 7.3 新操作类型映射

- [x] Task 8: 设置页重构
  - [x] 8.1 API 请求配置
  - [x] 8.2 密码修改
  - [x] 8.3 系统信息

- [x] Task 9: 测试更新
  - [x] 9.1 credentials store 测试（27 tests）
  - [x] 9.2 auth store 测试（11 tests）
  - [x] 9.3 Provider 测试（18 tests）
  - [x] 9.4 utils 测试（4 tests）
  - [x] 9.5 全部 60 个测试通过

- [x] Task 10: README 重构
  - [x] 10.1 架构概览（含 ASCII 图）
  - [x] 10.2 快速开始
  - [x] 10.3 多账号配置示例
  - [x] 10.4 环境变量说明
  - [x] 10.5 Cloudflare 部署
  - [x] 10.6 常见问题排查

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 2]
- [Task 6] depends on [Task 1, Task 2]
- [Task 7] depends on [Task 2]
- [Task 9] depends on [Task 1, Task 2]
- [Task 10] depends on [Task 1-9]
