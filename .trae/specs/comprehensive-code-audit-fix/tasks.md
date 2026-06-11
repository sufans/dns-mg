# Tasks

- [x] Task 1: 修复 useDeleteRecord 使用 api.delete
  - [x] 1.1 RED: 写测试 `应使用 DELETE 方法调用删除路径`
  - [x] 1.2 GREEN: `api.post` → `api.delete`
  - [x] 1.3 验证测试通过

- [x] Task 2: 修复 useSettings 类型定义
  - [x] 2.1 RED: 写测试验证 settings 响应类型
  - [x] 2.2 GREEN: `SystemSetting[]` → `Record<string, unknown>`，同步修复 SettingsPage 消费方式
  - [x] 2.3 验证构建通过

- [x] Task 3: 新增日志 API 端点
  - [x] 3.1 创建 `functions/api/logs/index.ts`（GET 查询分页日志）
  - [x] 3.2 创建 `functions/api/logs/cleanup.ts`（POST 清理过期日志）
  - [x] 3.3 验证前端 useSettings hooks 路径匹配

- [x] Task 4: 修复备份恢复前后端数据格式
  - [x] 4.1 RED: 写测试验证 useRestore 发送 JSON 而非 FormData
  - [x] 4.2 GREEN: 修改 useRestore 读取文件文本后发送 `{ data, password }`
  - [x] 4.3 验证测试通过

- [x] Task 5: UI 状态完善 — 表格加载/空/错误状态
  - [x] 5.1 AccountsPage 添加加载骨架、空状态、错误重试
  - [x] 5.2 DomainsPage 添加加载骨架、空状态、错误重试
  - [x] 5.3 DomainDetailPage 添加加载骨架、空状态、错误重试
  - [x] 5.4 DashboardPage 添加加载骨架和错误状态

- [x] Task 6: UI 修复 — 长文本截断与无障碍
  - [x] 6.1 DashboardPage/DomainDetailPage 表格长文本添加 truncate + tooltip
  - [x] 6.2 表格列添加 `max-w-[200px] truncate` 类

- [x] Task 7: 构建验证 + 全量测试 + 推送

# Task Dependencies
- Task 1, 2, 3, 4 相互独立，可并行
- Task 5, 6 依赖 Task 2 完成
- Task 7 依赖所有前序任务