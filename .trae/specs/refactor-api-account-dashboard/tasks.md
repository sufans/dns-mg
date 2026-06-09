# Tasks

- [ ] Task 1: 类型系统重构 - 扩展多账号类型定义
  - [ ] 1.1 在 `types/index.ts` 中新增 `AccountEntry` 接口（id, provider, label, tags, isDefault, credentials, status, lastVerified, createdAt, usageStats）
  - [ ] 1.2 新增 `UsageStats` 接口（totalRequests, lastRequestAt, dailyRequests: DailyRequest[]）
  - [ ] 1.3 新增 `DailyRequest` 接口（date, count）
  - [ ] 1.4 新增 `RecentCall` 接口（timestamp, endpoint, statusCode, duration）
  - [ ] 1.5 修改 `CredentialEntry` 为 `AccountEntry`，保留向后兼容的迁移逻辑

- [ ] Task 2: Credentials Store 重构 - 多账号支持
  - [ ] 2.1 重构 `stores/credentials.ts`：entries 从 `Map<ProviderType, Entry>` 改为 `AccountEntry[]`，支持同平台多账号
  - [ ] 2.2 新增 `addAccount`、`updateAccount`、`removeAccount`、`getAccount`、`getAccountsByProvider`、`setDefaultAccount`、`getDefaultAccount` 方法
  - [ ] 2.3 新增 `switchActiveAccount(providerType)` 方法，返回默认账号
  - [ ] 2.4 添加 localStorage 数据迁移：将旧的单账号格式自动迁移为新多账号格式
  - [ ] 2.5 更新凭证编码/解码逻辑适配新结构

- [ ] Task 3: 移除无关页面与路由
  - [ ] 3.1 删除 `components/landing/` 目录及文件
  - [ ] 3.2 删除 `components/domains/` 目录及文件
  - [ ] 3.3 删除 `components/dns-records/` 目录及文件
  - [ ] 3.4 删除 `components/sync/` 目录及文件
  - [ ] 3.5 更新 `App.tsx` 路由：移除无关路由，根路径 `/` 重定向到 `/dashboard`
  - [ ] 3.6 清理 `lib/mock-data.ts` 中域名/DNS/同步相关的 mock 数据

- [ ] Task 4: DashboardLayout 导航精简
  - [ ] 4.1 更新导航项为：概览、账号管理、操作日志、设置
  - [ ] 4.2 移除域名管理、DNS 记录、同步任务导航项
  - [ ] 4.3 更新 `getPageTitle` 函数适配新路由
  - [ ] 4.4 优化侧边栏视觉：更紧凑的图标+文字布局

- [ ] Task 5: 概览页重构（原 DashboardPage）
  - [ ] 5.1 重构统计卡片：已配置账号数、有效账号数、无效账号数、今日请求总数
  - [ ] 5.2 新增账号状态分布图（饼图：有效/无效/未验证）
  - [ ] 5.3 新增近 7 天请求频率折线图（Recharts）
  - [ ] 5.4 新增各平台配额概览卡片
  - [ ] 5.5 新增近期操作日志摘要（最近 5 条）

- [ ] Task 6: API 账号管理核心页重构
  - [ ] 6.1 重构账号列表为卡片网格，每卡片展示：平台图标、标签、状态徽章、默认标记、API Key 脱敏、快捷操作
  - [ ] 6.2 新增搜索栏（关键词搜索标签/凭证）和筛选（平台/状态/标签）
  - [ ] 6.3 重构添加账号流程：选择平台 → 填写凭证 → 命名标签 → 设为默认（可选）→ 保存
  - [ ] 6.4 重构编辑账号表单：预填凭证、修改标签、切换默认
  - [ ] 6.5 新增 API Key 显示/隐藏切换（眼睛图标）
  - [ ] 6.6 新增默认账号设置/取消功能
  - [ ] 6.7 新增账号详情展开面板：配额信息、使用统计、近期调用记录
  - [ ] 6.8 新增空状态引导（无账号时）
  - [ ] 6.9 使用 Sonner toast 替换 alert 调用

- [ ] Task 7: 操作日志页重构
  - [ ] 7.1 重构日志为账号维度：关联账号标签
  - [ ] 7.2 新增按目标账号筛选
  - [ ] 7.3 新增操作类型：添加账号、编辑账号、删除账号、测试连接、切换默认

- [ ] Task 8: 设置页重构（原 SecuritySettingsPage）
  - [ ] 8.1 重构为统一配置管理：API 速率限制、默认超时、自动重试策略、凭证存储方式
  - [ ] 8.2 保留密码修改功能
  - [ ] 8.3 移除会话管理（简化为单账号系统）

- [ ] Task 9: 测试更新
  - [ ] 9.1 更新 `stores/credentials.test.ts` 适配多账号 Store
  - [ ] 9.2 新增多账号相关测试：添加同平台多账号、设置默认、切换账号、数据迁移
  - [ ] 9.3 更新 Provider 测试确保兼容新 Store
  - [ ] 9.4 确保所有测试通过

- [ ] Task 10: README 重构
  - [ ] 10.1 重写为专业技术文档风格
  - [ ] 10.2 包含项目架构说明、安装启动步骤、多账号配置示例、环境变量说明、常见问题排查与使用流程
  - [ ] 10.3 排版简洁分层清晰，代码示例规范易读

# Task Dependencies

- [Task 2] depends on [Task 1] (Store 依赖新类型)
- [Task 3] depends on nothing (可并行)
- [Task 4] depends on [Task 3] (导航精简依赖路由清理)
- [Task 5] depends on [Task 2] (概览页依赖新 Store)
- [Task 6] depends on [Task 1, Task 2] (账号管理页依赖新类型和 Store)
- [Task 7] depends on [Task 2] (日志页依赖新 Store)
- [Task 8] depends on nothing (可并行)
- [Task 9] depends on [Task 1, Task 2, Task 6] (测试依赖核心重构完成)
- [Task 10] depends on [Task 1-9] (文档在功能完成后编写)
