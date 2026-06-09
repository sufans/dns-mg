# DNS Manager - API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控与使用统计。

## 架构概览

```
┌─────────────────────────────────────────────┐
│                  浏览器                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │ React   │  │ Zustand  │  │ Provider  │  │
│  │ UI 层   │←→│ 状态管理 │←→│ 抽象层    │  │
│  └─────────┘  └──────────┘  └─────┬─────┘  │
│                                   │         │
│                              ┌────┴────┐    │
│                              │ API     │    │
│                              │ Client  │    │
│                              └────┬────┘    │
└───────────────────────────────────┼─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼                               ▼
            ┌──────────────┐                ┌──────────────┐
            │   DNSHE API  │                │ DNSNeko API  │
            └──────────────┘                └──────────────┘
```

### 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| UI 组件 | `src/components/ui/` | Button, Card, Badge, Dialog, Table 等基础组件 |
| 页面组件 | `src/components/` | 概览、账号管理、操作日志、设置 |
| 状态管理 | `src/stores/` | 认证状态、多账号凭证管理 |
| Provider 层 | `src/providers/` | DNSHE/DNSNeko API 抽象与实现 |
| 类型定义 | `src/types/` | 全局 TypeScript 类型 |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/sufans/dns-mg.git
cd dns-mg

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test
```

## 多账号配置

系统支持同一平台配置多个 API 账号，每个账号独立管理凭证、状态与使用统计。

### 添加账号

1. 进入「API 账号管理」页面
2. 点击「添加账号」
3. 选择平台（DNSHE / DNSNeko）
4. 填写 API 凭证
5. 设置账号标签（如"生产环境"、"测试账号"）
6. 可选：添加标签、设为默认账号
7. 点击「测试连接」验证凭证
8. 保存

### 默认账号

每个平台有且仅有一个默认账号。系统自动将首个添加的账号设为默认。手动设置默认账号时，同平台其他账号的默认标记自动取消。

### 账号切换

在账号卡片中点击「设为默认」即可切换当前活跃账号。

### 凭证安全

- API 凭证使用 Base64 编码存储于浏览器 localStorage
- 界面默认脱敏显示（`cfsd****xxxx`）
- 点击眼睛图标可切换明文/脱敏显示
- **生产环境建议**：使用 Cloudflare Secrets 或后端加密存储

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_DNSHE_API_URL` | `https://api005.dnshe.com/index.php` | DNSHE API 地址 |
| `VITE_DNSNEKO_API_URL` | `https://www.dnsneko.com/api/v1/dns` | DNSNeko API 地址 |
| `VITE_JWT_EXPIRY` | `86400000` | JWT Token 过期时间（毫秒） |
| `VITE_CREDENTIAL_STORAGE` | `local` | 凭证存储方式 |

```bash
cp .env.example .env.local
# 编辑 .env.local 配置环境变量
```

## Cloudflare 部署

### Dashboard 部署（推荐）

1. 推送代码到 GitHub
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
3. 构建设置：

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Build command | `pnpm build` |
| Build output | `dist` |

4. 部署后访问 `https://dns-mg.pages.dev`

### Wrangler CLI 部署

```bash
pnpm add -g wrangler && wrangler login
pnpm build
wrangler pages deploy dist --project-name=dns-mg
```

### GitHub Actions 自动部署

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name=dns-mg
```

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| 登录后页面空白 | 清除 localStorage（`localStorage.clear()`），刷新重新初始化 |
| API 连接测试失败 | 检查凭证是否正确，确认网络可达，检查 CORS 限制 |
| 账号列表为空 | 首次使用需添加 API 账号 |
| 无法添加同平台第二个账号 | 确认账号标签不同，系统支持同平台多账号 |
| Pages 部署后刷新 404 | 已内置 `_redirects`，检查 `dist/` 中是否包含 |
| 请求频率限制 | 默认 50 次/分钟，可在设置页调整 |

## 许可证

MIT
# DNS Manager - 企业级 DNS# DNS Manager - 企业级 DNS API 账号管理后台

> 面向# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API 账号管理后台，集中管理 DNSHE 与# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控、风控# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控、风控告警与使用统计。采用企业级控制台布局# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控、风控告警与使用统计。采用企业级控制台布局，支持深色/浅色科技风主题。
# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控、风控告警与使用统计。采用企业级控制台布局，支持深色/浅色科技风主题。

## 功能特性

- **多# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控、风控告警与使用统计。采用企业级控制台布局，支持深色/浅色科技风主题。

## 功能特性

- **多平台账号管理** — 支持 DNSHE、DNSNeko 双平台，同平台多# DNS Manager - 企业级 DNS API 账号管理后台

> 面向 Cloudflare 原生部署的多平台 DNS API 账号管理后台，集中管理 DNSHE 与 DNSNeko 凭证、状态监控、风控告警与使用统计。采用企业级控制台布局，支持深色/浅色科技风主题。

## 功能特性

- **多平台账号管理** — 支持 DNSHE、DNSNeko 双平台，同平台多账号独立管理
- **凭证安全加密**