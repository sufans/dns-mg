# 修复认证闪烁与登录服务器错误 Spec

## Why
网页进入时会闪现登录后界面然后才显示登录界面，用户体验差；登录时显示"服务器错误，请稍后重试"，无法正常登录。

## What Changes
- MainLayout 添加认证检查加载状态，在认证状态确认前不渲染受保护内容
- 登录端点添加环境变量缺失/无效的防御性检查，避免 bcrypt 对空 hash 抛异常导致 500
- 登录端点添加全局 try-catch，确保任何未预期错误返回友好提示而非 500

## Impact
- Affected code: `src/components/MainLayout.tsx`, `functions/api/auth/login.ts`

## ADDED Requirements

### Requirement: 认证状态加载守卫
系统在确认认证状态前，不得渲染受保护的界面内容。

#### Scenario: 未登录用户访问受保护页面
- **WHEN** 未登录用户访问任何受保护路由（如 /dashboard）
- **THEN** 系统显示加载状态（空白或 spinner），认证检查完成后跳转到登录页
- **AND** 不闪现已登录界面

#### Scenario: 已登录用户访问受保护页面
- **WHEN** 已登录用户（有效 token）访问受保护路由
- **THEN** 系统短暂显示加载状态后正常渲染界面

### Requirement: 登录端点环境变量防御
登录端点在环境变量缺失或无效时，应返回明确的错误提示而非 500 服务器错误。

#### Scenario: ADMIN_PASSWORD_HASH 为空
- **WHEN** 管理员密码哈希未配置（空字符串）
- **THEN** 返回 503 状态码，提示"系统未完成初始化，请联系管理员"

#### Scenario: JWT_SECRET 为空
- **WHEN** JWT 密钥未配置
- **THEN** 返回 503 状态码，提示"系统未完成初始化，请联系管理员"

#### Scenario: 环境变量正常配置
- **WHEN** 所有必要环境变量已正确配置
- **THEN** 登录流程正常工作，不受影响

### Requirement: 登录端点全局错误捕获
登录端点应捕获所有未预期异常，返回友好错误提示。

#### Scenario: 登录过程中发生未预期异常
- **WHEN** 登录处理中抛出任何未捕获的异常
- **THEN** 返回 500 状态码，提示"登录服务暂时不可用，请稍后重试"
- **AND** 不暴露内部错误细节
