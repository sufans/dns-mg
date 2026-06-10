# Tasks

- [x] Task 1: 修复 MainLayout 认证闪烁问题
  - [x] 1.1 在 MainLayout 中添加 `isAuthChecking` 状态，初始值为 `true`
  - [x] 1.2 在认证检查 useEffect 中，检查完成后将 `isAuthChecking` 设为 `false`
  - [x] 1.3 当 `isAuthChecking` 为 `true` 时，渲染加载占位（空白背景）而非完整布局
  - [x] 1.4 验证：未登录时 MainLayout 不渲染子组件内容

- [x] Task 2: 修复登录端点环境变量缺失导致 500 错误
  - [x] 2.1 在 login.ts 中添加环境变量检查：ADMIN_PASSWORD_HASH 为空或 JWT_SECRET 为空时返回 503
  - [x] 2.2 为整个登录处理逻辑添加 try-catch，捕获未预期异常返回友好 500 错误
  - [x] 2.3 验证：ADMIN_PASSWORD_HASH 为空时返回 503 而非 500
  - [x] 2.4 验证：JWT_SECRET 为空时返回 503 而非 500
  - [x] 2.5 验证：正常登录流程不受影响

# Task Dependencies
- [Task 2] 无外部依赖，可与 Task 1 并行
