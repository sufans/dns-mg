# DNS Manager - 多平台域名统一管理系统

> 现代化、专业级的一体化域名管理控制台，面向 Cloudflare 原生部署，集中管理 DNSHE 与 DNSNeko 多平台域名与 DNS 记录。

## 功能特性

- 🌐 **统一域名管理** - 跨平台域名集中展示，搜索筛选排序，到期预警
- 📝 **DNS 记录管理** - 增删改查、批量操作、自定义列、搜索筛选
- 🔑 **API 账号管理** - 多平台凭证安全存储，一键测试连接
- 🔄 **智能同步** - 手动/定时同步，异步任务状态追踪
- 🔒 **安全设计** - JWT 认证、Cloudflare Secrets、速率限制
- 🌙 **明暗主题** - 支持亮色/暗色主题切换
- 📱 **响应式** - 桌面端高效操作，移动端折叠导航

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| TypeScript | 6.x | 类型安全 |
| Vite | 8.x | 构建工具 |
| Tailwind CSS | 4.x | 样式系统 |
| shadcn/ui 风格 | - | UI 组件库 |
| React Router | 7.x | 路由管理 |
| Zustand | 5.x | 状态管理 |
| TanStack Query | 5.x | 数据请求 |
| TanStack Table | 8.x | 表格组件 |
| Recharts | 3.x | 图表 |
| Sonner | 2.x | Toast 通知 |

## 目录结构

```
src/
├── components/          # 组件
│   ├── ui/             # 基础 UI 组件 (Button, Card, Badge, Dialog, Table, etc.)
│   ├── feedback/       # 反馈组件 (CardSkeleton, TableSkeleton)
│   ├── auth/           # 认证组件 (LoginPage, SetupWizard, ProtectedRoute)
│   ├── landing/        # 官网落地页
│   ├── dashboard/      # 仪表盘
│   ├── domains/        # 域名管理
│   ├── dns-records/    # DNS 记录管理
│   ├── api-accounts/   # API 账号管理
│   ├── sync/           # 同步任务
│   ├── logs/           # 操作日志
│   └── security/       # 安全设置
├── layouts/            # 布局组件 (DashboardLayout)
├── lib/                # 工具函数与配置 (api, utils, mock-data)
├── stores/             # Zustand 状态管理 (auth, credentials)
├── types/              # TypeScript 类型定义
├── providers/          # DNS 平台 Provider 实现
│   ├── types.ts        # DomainProvider 接口定义
│   ├── registry.ts     # Provider 注册中心
│   ├── dnshe.ts        # DNSHE 平台实现
│   └── dnsneko.ts      # DNSNeko 平台实现
├── App.tsx             # 应用入口与路由配置
├── main.tsx            # 渲染入口 (QueryClient, Toaster)
└── index.css           # 全局样式与主题变量
```

## 开发环境搭建

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
pnpm build
```

### 代码检查

```bash
pnpm lint
```

### 预览生产构建

```bash
pnpm preview
```

## 配置说明

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_DNSHE_API_URL` | 否 | https://api005.dnshe.com/index.php | DNSHE API 地址 |
| `VITE_DNSNEKO_API_URL` | 否 | https://www.dnsneko.com/api/v1/dns | DNSNeko API 地址 |
| `VITE_JWT_EXPIRY` | 否 | 86400000 | JWT Token 过期时间（毫秒） |
| `VITE_CREDENTIAL_STORAGE` | 否 | local | 凭证存储方式 (local/cloudflare) |

### 创建环境变量文件

```bash
cp .env.example .env.local
```

## 部署

### Cloudflare Pages 部署

1. 在 Cloudflare Dashboard 创建 Pages 项目
2. 连接 Git 仓库
3. 配置构建设置：
   - 构建命令: `pnpm build`
   - 输出目录: `dist`
4. 配置环境变量（如需修改默认 API 地址）
5. 配置 Cloudflare Secrets（如使用 Cloudflare 存储模式）

### 边缘运行时兼容说明

本项目前端为纯静态 SPA，兼容所有边缘运行时环境：
- Cloudflare Pages / Workers
- Vercel
- Netlify
- 任何静态文件服务器

API 请求通过浏览器直接发送到 DNSHE/DNSNeko 服务器，需确保目标 API 允许跨域请求（CORS）。如遇 CORS 问题，可通过 Cloudflare Workers 设置 API 代理。

## 支持平台

### DNSHE
- 子域名管理（列表、注册、详情、删除、续期）
- DNS 记录管理（列表、创建、更新、删除）
- API 密钥管理（列表、创建、删除、重新生成）
- 配额查询
- WHOIS 查询

### DNSNeko
- 域名管理（列表、详情）
- DNS 记录管理（查询、添加、修改、删除、暂停/启用）
- 批量操作（批量暂停/启用、批量删除、批量修改 TTL、批量修改线路）

### 扩展新平台

实现 `DomainProvider` 接口并注册到 `providerRegistry`：

```typescript
import { DomainProvider } from './types';

class MyProvider implements DomainProvider {
  readonly type = 'myplatform';
  readonly name = 'My Platform';
  readonly description = 'My DNS platform';

  // 实现所有接口方法...
}

providerRegistry.register(new MyProvider());
```

`DomainProvider` 接口定义如下：

```typescript
interface DomainProvider {
  readonly type: string;
  readonly name: string;
  readonly description: string;

  // 域名操作
  listDomains(params: DomainListParams): Promise<{ domains: UnifiedDomain[]; pagination: Pagination }>;
  getDomainDetail(domainId: string): Promise<UnifiedDomain>;

  // DNS 记录操作
  listDnsRecords(params: DnsRecordListParams): Promise<{ records: UnifiedDnsRecord[]; pagination: Pagination }>;
  createDnsRecord(params: CreateDnsRecordParams): Promise<UnifiedDnsRecord>;
  updateDnsRecord(params: UpdateDnsRecordParams): Promise<UnifiedDnsRecord>;
  deleteDnsRecord(domainId: string, recordId: string): Promise<void>;
  toggleDnsRecordStatus(recordId: string, enabled: boolean): Promise<void>;

  // 批量操作（可选，DNSNeko 专用）
  batchUpdateStatus?(params: BatchOperationParams): Promise<void>;
  batchDelete?(params: BatchOperationParams): Promise<void>;
  batchUpdateTtl?(params: BatchOperationParams): Promise<void>;
  batchUpdateLine?(params: BatchOperationParams): Promise<void>;

  // 连接测试
  testConnection(): Promise<boolean>;

  // 平台特有功能（可选）
  getQuota?(): Promise<DnsheQuota>;
  listApiKeys?(): Promise<DnsheApiKey[]>;
}
```

## 架构设计

### 认证系统

- 首次使用需通过 Setup Wizard 创建管理员账号
- 登录凭证经 XOR 加密 + Base64 编码后存储于 localStorage
- JWT Token 包含用户信息与过期时间，默认 24 小时有效期
- 路由守卫（ProtectedRoute）保护需认证的页面

### API 客户端

- 内置速率限制（每分钟最多 50 次请求）
- 自动重试机制（网络错误最多重试 2 次，429 响应自动等待重试）
- 统一错误处理与响应封装（`ApiResponse<T>`）

### 凭证存储

- API 凭证存储于 Zustand persist store
- 存储时自动编码（反转 + Base64），读取时自动解码
- 支持本地存储与 Cloudflare Secrets 两种模式

### 主题系统

- 基于 CSS 自定义属性（HSL 色值）实现
- 通过 `.dark` 类名切换暗色主题
- 覆盖背景、前景、主色、强调色、边框等完整色板

## 排障指南

### 常见问题

**Q: 登录后页面空白**
A: 清除浏览器 localStorage，重新初始化账号。

**Q: API 连接测试失败**
A: 检查 API Key 和 Secret 是否正确，确认网络可访问目标 API 地址，检查是否存在 CORS 限制。

**Q: 域名列表为空**
A: 确认已正确配置 API 凭证，点击"同步域名"拉取最新数据。

**Q: 批量操作不可用**
A: 批量操作仅支持 DNSNeko 平台，DNSHE 平台暂不支持批量操作。

**Q: 暗色主题显示异常**
A: 确保浏览器支持 CSS 自定义属性，尝试清除缓存后刷新。

**Q: 请求频率限制**
A: API 客户端内置每分钟 50 次请求的速率限制，超出后需等待 1 分钟重置。如需调整，修改 `src/lib/api.ts` 中的 `maxRequestsPerMinute` 值。

## 许可证

MIT
