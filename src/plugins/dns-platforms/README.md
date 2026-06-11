# DNS 平台插件开发模板

生产运行的适配器位于 `functions/_shared/platforms/`，前端目录保留接口与类型模板，便于新增平台时保持一致模型。

新增平台步骤：

1. 在 D1 `api_accounts.platform` CHECK 中加入新平台标识。
2. 在 `functions/_shared/types.ts` 扩展 `DNSPlatform`。
3. 在 `functions/_shared/platforms/` 新增适配器，实现 `DNSPlatformAdapter`。
4. 在 `factory.ts` 注册新适配器。
5. 在前端账号表单中加入该平台凭证字段。
6. 用 Zod 为请求体与响应做双向校验。

所有平台适配器都必须：

- 只在 Pages Functions 端调用上游 API。
- 不把 API Key、Secret 或 Username 返回给浏览器。
- 显式定义限流窗口，接入 D1 `api_rate_limits`。
- 把上游响应转换为统一 `UnifiedDomain` 与 `UnifiedRecord`。
