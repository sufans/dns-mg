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
  const accountCount = useCredentialsStore((s) => s.accounts.length);

  // --- Section 1: API 请求配置 ---
  const [rateLimit, setRateLimit] = useState('50');
  const [requestTimeout, setRequestTimeout] = useState('10000');
  const [autoRetry, setAutoRetry] = useState(true);
  const [maxRetries, setMaxRetries] = useState('2');
  const [credentialStorage, setCredentialStorage] = useState('local');

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

    toast.success('配置已保存');
  };

  // --- Section 2: 修改密码 ---
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const strength = getPasswordStrength(newPwd);

  const handleUpdatePassword = () => {
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

    toast.success('密码已更新');
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
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
                onChange={(e) => setCredentialStorage(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveConfig}>保存配置</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: 修改密码 */}
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

      {/* Section 3: 系统信息 */}
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
