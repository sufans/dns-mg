# 全面代码检测与修复 Spec

## Why
网页端多个按钮功能失效（记录删除、日志查看、备份恢复），部分界面显示错乱（缺少加载/空/错误状态，长文本无截断），前后端 API 存在多处不匹配。

## What Changes
- 修复 useRecords 删除方法 POST→DELETE，匹配后端 `onRequestDelete`
- 修复 useSettings 类型定义 `SystemSetting[]`→`Record<string, any>`，匹配后端返回格式
- 修复备份恢复：前端发送 JSON（`{data, password}`）而非 FormData，匹配后端 `context.request.json()`
- **新增** `/functions/api/logs/index.ts` 日志查询端点（`onRequestGet`）
- **新增** `/functions/api/logs/cleanup.ts` 日志清理端点（`onRequestPost`）
- UI 修复：表格空状态/加载骨架/错误提示/长文本截断/无障碍属性
- **BREAKING**: 备份恢复前端不再使用 FormData，改为读取文件内容后发送 JSON

## Impact
- Affected code: `src/hooks/useRecords.ts`, `src/hooks/useSettings.ts`, `functions/api/logs/` (新增), `src/pages/DashboardPage.tsx`, `src/pages/DomainDetailPage.tsx`, `src/pages/AccountsPage.tsx`

## ADDED Requirements

### Requirement: 日志 API
系统 SHALL 提供操作日志查询和清理 API。

#### Scenario: 查询操作日志
- **WHEN** 前端 GET 请求 `/api/logs?page=1&pageSize=20`
- **THEN** 返回分页日志列表 `{ code: 0, data: { logs: OperationLog[], total: number, page: number, pageSize: number } }`

#### Scenario: 清理过期日志
- **WHEN** 前端 POST 请求 `/api/logs/cleanup` 带 `{ retentionDays: 30 }`
- **THEN** 删除 retentionDays 之前的日志，返回删除数量

### Requirement: 记录删除方法修正
记录删除操作 SHALL 使用 HTTP DELETE 方法。

#### Scenario: 删除 DNS 记录
- **WHEN** 用户点击删除记录按钮
- **THEN** 前端发送 DELETE 请求到 `/api/records/{accountId}/{domainId}/{recordId}/delete`

### Requirement: Settings 类型对齐
前端 SystemSetting 类型 SHALL 匹配后端返回的键值对对象格式。

#### Scenario: 加载设置
- **WHEN** 前端 GET `/api/settings`
- **THEN** 接收 `Record<string, any>` 类型数据，正确渲染各项设置

### Requirement: 备份恢复数据格式修正
前端恢复备份 SHALL 读取文件内容后作为 JSON 发送。

#### Scenario: 恢复备份
- **WHEN** 用户选择备份文件并输入密码
- **THEN** 前端读取文件文本内容，发送 `{ data: fileContent, password }` JSON POST 到 `/api/backup`

### Requirement: UI 状态完善
所有数据表格 SHALL 显示加载骨架、空状态提示、错误重试按钮。

#### Scenario: 数据加载中
- **WHEN** 数据查询处于 loading 状态
- **THEN** 显示骨架屏（Skeleton）占位

#### Scenario: 数据为空
- **WHEN** 查询返回空列表
- **THEN** 显示友好空状态提示 "暂无数据"

#### Scenario: 数据加载失败
- **WHEN** 查询返回错误
- **THEN** 显示错误消息和"重试"按钮

### Requirement: 长文本截断
表格中域名/记录值等长文本 SHALL 自动截断并显示省略号。

#### Scenario: 域名过长
- **WHEN** 域名超过表格列宽
- **THEN** 自动截断为 "example-lo..." 格式，hover 显示 tooltip 完整内容