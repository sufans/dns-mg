# Tasks

- [x] Task 1: 修复阻断性缺陷 — OperationLogsPage 缺失
  - [x] 1.1 创建 `src/components/logs/OperationLogsPage.tsx`：操作日志列表页面
  - [x] 1.2 创建 `src/components/logs/index.ts`：导出模块
  - [x] 1.3 实现 OperationLog store (`src/stores/logs.ts`)：日志记录、查询、筛选
  - [x] 1.4 编写 logs store 测试 (`src/stores/logs.test.ts`)
  - [x] 1.5 验证构建通过：`pnpm build`

- [x] Task 2: 修复 ESLint 错误与代码清理
  - [x] 2.1 修复 `useMediaQuery.ts`：移除 effect 内同步 setState，改用初始化函数
  - [x] 2.2 修复 `utils.test.ts`：替换 `false && 'bar'` 常量表达式
  - [x] 2.3 移除 `LoginPage.tsx` 中未使用的 rememberMe 状态和 UI
  - [x] 2.4 修复 `api.ts`：添加模块级清理机制，导出 dispose 调用点
  - [x] 2.5 验证 ESLint 零错误：`pnpm lint`

- [x] Task 3: Provider 凭证隔离
  - [x] 3.1 编写测试：验证并发 setCredentials 不互相覆盖
  - [x] 3.2 重构 `testAccountConnection`：创建临时 Provider 实例而非修改全局单例
  - [x] 3.3 在 `registry.ts` 新增 `createProvider(type)` 工厂方法，返回新实例
  - [x] 3.4 更新 `ApiAccountsPage.tsx` 和 `DashboardPage.tsx` 使用工厂方法
  - [x] 3.5 验证所有 Provider 测试通过

- [x] Task 4: 凭证 AES-GCM 加密存储
  - [x] 4.1 编写测试：加密/解密往返正确性
  - [x] 4.2 实现 `src/lib/crypto.ts`：AES-GCM 加密/解密、PBKDF2 密钥派生
  - [x] 4.3 重构 `credentials.ts` storage：使用 AES-GCM 替代 Base64
  - [x] 4.4 实现旧格式自动检测与迁移逻辑
  - [x] 4.5 修正 `SetupWizard.tsx` 中加密描述与实际实现一致
  - [x] 4.6 编写 crypto 模块测试
  - [x] 4.7 验证 credentials store 测试全部通过

- [x] Task 5: 密码修改实际执行
  - [x] 5.1 编写测试：密码修改成功更新存储哈希
  - [x] 5.2 编写测试：当前密码错误拒绝修改
  - [x] 5.3 在 auth store 新增 `changePassword(currentPwd, newPwd)` 方法
  - [x] 5.4 更新 `SecuritySettingsPage.tsx` 调用 changePassword
  - [x] 5.5 验证 auth store 测试通过

- [x] Task 6: 全局配置持久化 Store
  - [x] 6.1 编写测试：配置保存与读取
  - [x] 6.2 创建 `src/stores/config.ts`：GlobalConfig Zustand store（persist 中间件）
  - [x] 6.3 更新 `SetupWizard.tsx`：步骤 3/4 配置写入 config store
  - [x] 6.4 更新 `SecuritySettingsPage.tsx`：从 config store 读取/写入配置
  - [x] 6.5 更新 `api.ts`：从 config store 读取速率限制和重试配置
  - [x] 6.6 编写 config store 测试

- [x] Task 7: Dashboard 真实数据流
  - [x] 7.1 创建 `src/hooks/useDashboardData.ts`：React Query hooks 聚合仪表盘数据
  - [x] 7.2 重构 `DashboardPage.tsx`：替换 mockDailyRequests 为 usageStats 聚合数据
  - [x] 7.3 重构配额展示：使用 React Query 调用 DNSHE Provider getQuota()
  - [x] 7.4 添加骨架屏加载状态
  - [x] 7.5 保留 mockDnsheQuota 作为 fallback（API 不可用时）
  - [x] 7.6 验证仪表盘正常渲染

- [x] Task 8: 风控告警中心
  - [x] 8.1 编写测试：告警生成、确认、清除
  - [x] 8.2 创建 `src/stores/alerts.ts`：Alert Zustand store
  - [x] 8.3 定义 Alert 类型：id, type(rate_limit|credential_invalid|quota_warning), severity(info|warning|critical), message, accountId, createdAt, acknowledged
  - [x] 8.4 在 `api.ts` 响应拦截中集成告警触发（429→速率超限，401/403→凭证失效）
  - [x] 8.5 在配额查询中集成配额预警（>80%）
  - [x] 8.6 创建 `src/components/alerts/AlertCenterPage.tsx`：告警列表页面
  - [x] 8.7 更新 `DashboardLayout.tsx`：导航新增告警中心、顶部栏告警徽章
  - [x] 8.8 更新 `App.tsx`：新增 /alerts 路由
  - [x] 8.9 编写 alerts store 测试

- [x] Task 9: Cloudflare 适配配置面板
  - [x] 9.1 在 `SecuritySettingsPage.tsx` 新增 Cloudflare 配置区块
  - [x] 9.2 展示当前部署环境信息（通过 env 变量检测）
  - [x] 9.3 实现存储方式切换逻辑（local ↔ cloudflare）
  - [x] 9.4 添加 Cloudflare 配置指引说明
  - [x] 9.5 验证设置页面正常渲染

- [x] Task 10: 调用频率与运行限制面板
  - [x] 10.1 创建 `src/components/rate-limits/RateLimitsPanel.tsx`：频率与限制可视化
  - [x] 10.2 展示各账号当前速率、速率限制、剩余配额
  - [x] 10.3 实现近 24 小时请求趋势迷你图
  - [x] 10.4 集成到 DashboardPage 或作为独立页面区块
  - [x] 10.5 验证面板正常渲染

- [x] Task 11: 操作日志页面完善
  - [x] 11.1 实现时间范围筛选器
  - [x] 11.2 实现操作类型筛选器
  - [x] 11.3 实现目标账号筛选器
  - [x] 11.4 实现结果状态筛选器（成功/失败）
  - [x] 11.5 实现分页控件
  - [x] 11.6 集成 logs store，自动记录关键操作
  - [x] 11.7 验证日志页面完整功能

- [x] Task 12: 集成测试与最终验证
  - [x] 12.1 运行全部测试：`pnpm test`
  - [x] 12.2 运行 ESLint：`pnpm lint`
  - [x] 12.3 运行 TypeScript 检查：`tsc --noEmit`
  - [x] 12.4 运行构建：`pnpm build`
  - [x] 12.5 验证所有页面路由可访问

# Task Dependencies

- [Task 2] depends on [Task 1]（先确保构建通过再修 ESLint）
- [Task 3] depends on [Task 1]（Provider 重构需要构建通过）
- [Task 4] depends on [Task 5]（加密密钥依赖密码体系）
- [Task 5] depends on [Task 1]（密码修改需要构建通过）
- [Task 6] depends on [Task 1]（配置 store 需要构建通过）
- [Task 7] depends on [Task 3, Task 6]（真实数据流依赖 Provider 隔离和配置 store）
- [Task 8] depends on [Task 6]（告警需要配置 store 中的速率限制）
- [Task 9] depends on [Task 6]（Cloudflare 配置依赖配置 store）
- [Task 10] depends on [Task 6, Task 7]（频率面板依赖真实数据和配置）
- [Task 11] depends on [Task 1]（日志页面完善依赖基础页面存在）
- [Task 12] depends on [Task 1-11]（最终验证依赖所有任务完成）
