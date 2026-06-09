import { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Select,
} from '../ui';
import { useAuthStore } from '../../stores/auth';
import { useCredentialsStore } from '../../stores/credentials';
import { useConfigStore } from '../../stores/config';
import { useLogsStore } from '../../stores/logs';
import { toast } from 'sonner';

// --- Password Strength ---
function getPasswordStrength(pwd: string): { label: string; level: number; color: string } {
  if (!pwd) return { label: '', level: 0, color: '' };
  if (pwd.length < 8) return { label: '弱', level: 1, color: 'bg-red-500' };
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  const variety = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (pwd.length >= 12 && variety >= 3 && hasSpecial) {
    return { label: '强', level: 3, color: 'bg-green-500' };
  }
  if (pwd.length >= 8 && variety >= 2) {
    return { label: '中', level: 2, color: 'bg-yellow-500' };
  }
  return { label: '弱', level: 1, color: 'bg-red-500' };
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const storageOptions = [
  { value: 'local', label: '本地存储' },
  { value: 'cloudflare', label: 'Cloudflare Secrets' },
];

export function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);
  const changePassword = useAuthStore((s) => s.changePassword);
  const accountCount = useCredentialsStore((s) => s.accounts.length);

  // --- Section 1: API 请求配置 ---
  const config = useConfigStore();
  const [rateLimit, setRateLimit] = useState(String(config.rateLimitPerMinute));
  const [requestTimeout, setRequestTimeout] = useState(String(config.requestTimeout));
  const [autoRetry, setAutoRetry] = useState(config.autoRetry);
  const [maxRetries, setMaxRetries] = useState(String(config.maxRetries));
  const [credentialStorage, setCredentialStorage] = useState<'local' | 'cloudflare'>(config.credentialStorage);

  const handleSaveConfig = () => {
    const rl = Number(rateLimit);
    const to = Number(requestTimeout);
    const mr = Number(maxRetries);

    if (!rl || rl < 1) {
      toast.error('速率限制必须大于 0');
      return;
    }
    if (!to || to < 1000) {
      toast.error('超时时间不能小于 1000ms');
      return;
    }
    if (autoRetry && (!mr || mr < 1)) {
      toast.error('最大重试次数必须大于 0');
      return;
    }

    config.updateConfig({
      rateLimitPerMinute: rl,
      requestTimeout: to,
      autoRetry,
      maxRetries: mr,
      credentialStorage: credentialStorage as 'local' | 'cloudflare',
    });
    useLogsStore.getState().recordOperation('update_settings', '系统设置', 'success');
    toast.success('配置已保存');
  };

  // --- Section 2: 修改密码 ---
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const strength = getPasswordStrength(newPwd);

  const handleUpdatePassword = async () => {
    if (!currentPwd) {
      toast.error('请输入当前密码');
      return;
    }
    if (!newPwd) {
      toast.error('请输入新密码');
      return;
    }
    if (newPwd.length < 8) {
      toast.error('新密码至少需要 8 个字符');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (newPwd === currentPwd) {
      toast.error('新密码不能与当前密码相同');
      return;
    }

    const success = await changePassword(currentPwd, newPwd);
    if (success) {
      useLogsStore.getState().recordOperation('change_password', 'admin', 'success');
      toast.success('密码已更新');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } else {
      useLogsStore.getState().recordOperation('change_password', 'admin', 'failure', '当前密码错误');
      toast.error('当前密码错误');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-1">系统配置与安全</p>
      </div>

      {/* Section 1: API 请求配置 */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">API 请求配置</CardTitle>
          <CardDescription>配置全局 API 请求参数与凭证存储方式</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">全局请求速率限制</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  className="w-full sm:w-32"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">次/分钟</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">请求超时时间</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1000"
                  value={requestTimeout}
                  onChange={(e) => setRequestTimeout(e.target.value)}
                  className="w-full sm:w-32"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">ms</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRetry}
                  onChange={(e) => setAutoRetry(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm font-medium">启用自动重试</span>
            </div>
            {autoRetry && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">最大重试次数</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(e.target.value)}
                  className="w-full sm:w-32"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">凭证存储方式</label>
              <Select
                options={storageOptions}
                value={credentialStorage}
                onChange={(e) => setCredentialStorage(e.target.value as 'local' | 'cloudflare')}
              />
            </div>
            <Button onClick={handleSaveConfig}>保存配置</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Cloudflare 适配配置 */}
      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Cloudflare 适配配置</CardTitle>
            {credentialStorage === 'cloudflare' ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                已配置
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                未启用
              </span>
            )}
          </div>
          <CardDescription>配置 Cloudflare 部署环境与 Secrets 存储</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">存储方式</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCredentialStorage('local')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    credentialStorage === 'local'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">本地存储</span>
                  <p className="text-xs text-muted-foreground mt-0.5">凭证存储在浏览器本地</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCredentialStorage('cloudflare')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    credentialStorage === 'cloudflare'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">Cloudflare Secrets</span>
                  <p className="text-xs text-muted-foreground mt-0.5">凭证通过 Workers Secrets 安全存储</p>
                </button>
              </div>
            </div>

            {credentialStorage === 'cloudflare' && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Cloudflare 配置指引</h4>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>在 Cloudflare Dashboard 中创建 Workers 项目</li>
                  <li>使用 wrangler CLI 设置 Secrets: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">wrangler secret put DNSHE_API_KEY</code></li>
                  <li>设置所有需要的 Secrets: DNSHE_API_SECRET, DNSNEKO_USERNAME, DNSNEKO_API_KEY</li>
                  <li>部署项目至 Cloudflare Pages 或 Workers</li>
                </ol>
                <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                  凭证将通过 Cloudflare Workers Secrets 安全存储，仅服务端可访问。
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">环境变量</h4>
              <div className="space-y-1">
                {[
                  { name: 'DNSHE_API_KEY', desc: 'DNSHE API Key' },
                  { name: 'DNSHE_API_SECRET', desc: 'DNSHE API Secret' },
                  { name: 'DNSNEKO_USERNAME', desc: 'DNSNeko 用户名' },
                  { name: 'DNSNEKO_API_KEY', desc: 'DNSNeko API Key' },
                ].map((env) => (
                  <div key={env.name} className="flex items-center justify-between text-sm py-1 border-b border-dashed">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{env.name}</code>
                    <span className="text-muted-foreground">{env.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSaveConfig}>保存配置</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: 修改密码 */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">修改密码</CardTitle>
          <CardDescription>更新您的账号密码</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">当前密码</label>
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="请输入当前密码"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">新密码</label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="请输入新密码（至少 8 个字符）"
                autoComplete="new-password"
                error={!!newPwd && newPwd.length < 8}
              />
              {newPwd && newPwd.length < 8 && (
                <p className="text-xs text-destructive">密码至少需要 8 个字符</p>
              )}
              {newPwd && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          strength.level >= level ? strength.color : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs font-medium ${
                      strength.level === 1
                        ? 'text-red-500'
                        : strength.level === 2
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}
                  >
                    密码强度：{strength.label}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">确认新密码</label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="请再次输入新密码"
                autoComplete="new-password"
                error={!!confirmPwd && newPwd !== confirmPwd}
              />
              {confirmPwd && newPwd !== confirmPwd && (
                <p className="text-xs text-destructive">两次输入的密码不一致</p>
              )}
            </div>
            <Button onClick={handleUpdatePassword}>更新密码</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: 系统信息 */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">系统信息</CardTitle>
          <CardDescription>系统配置与状态只读信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-muted-foreground">JWT Token 过期时间</span>
              <span className="text-sm font-medium">24小时</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-muted-foreground">凭证存储方式</span>
              <span className="text-sm font-medium">
                {credentialStorage === 'local' ? '本地存储' : 'Cloudflare Secrets'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-muted-foreground">账号总数</span>
              <span className="text-sm font-medium">{accountCount}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-muted-foreground">最后密码修改时间</span>
              <span className="text-sm font-medium">
                {user?.createdAt ? formatTime(user.createdAt) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">系统版本</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
