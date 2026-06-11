# 新增 DNS 平台开发指南

平台代码完全隔离在 `functions/_shared/platforms/`。前端只接收统一模型，不关心具体平台字段。

## 统一模型

必须把上游域名转换为：

```ts
interface UnifiedDomain {
  id: string;
  name: string;
  platform: DNSPlatform;
  accountId: number;
  accountName: string;
  status: string;
  dnsStatus: string;
  createdAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  remainingDays: number | null;
  renewStatus: string;
  recordCount: number | null;
}
```

必须把上游解析记录转换为：

```ts
interface UnifiedRecord {
  id: string;
  name: string;
  type: string;
  value: string;
  line: string | null;
  ttl: number;
  priority: number | null;
  remark: string | null;
  status: 'active' | 'paused';
}
```

## 接入步骤

1. 扩展 `functions/_shared/types.ts` 的 `DNSPlatform`。
2. 在 D1 schema 中扩展 `api_accounts.platform` 的 CHECK 约束。
3. 新增 `functions/_shared/platforms/<platform>.ts`。
4. 实现 `DNSPlatformAdapter`。
5. 在 `factory.ts` 注册。
6. 在 `validators.ts` 增加凭证 Zod 校验。
7. 在 `AccountsPage.tsx` 添加表单字段。

## 安全要求

- 上游 API Key 只允许在 Functions 端解密和使用。
- 任何前端接口都只能返回脱敏凭证。
- 所有写操作必须经过 CSRF 校验。
- 添加、删除、修改密钥等敏感动作必须要求管理员二次验证。
- 平台适配器必须定义限流参数，避免触发上游封禁。

## 当前平台实现

- DNSHE：`https://api005.dnshe.com/index.php?m=domain_hub`，Header 使用 `X-API-Key` / `X-API-Secret`。
- DNSNEKO：`https://www.dnsneko.com/api/v1/dns`，Header 使用 `X-DNSNEKO-USERNAME` / `X-DNSNEKO-API-KEY`。
