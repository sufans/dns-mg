import { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Badge,
  ConfirmDialog,
} from '../ui';
import { useAuthStore } from '../../stores/auth';

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

// --- Mock Sessions ---
interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

const mockSessions: Session[] = [
  {
    id: 's1',
    device: 'Desktop',
    browser: 'Chrome 126',
    ip: '192.168.1.100',
    lastActive: '2026-06-09T14:30:00Z',
    current: true,
  },
  {
    id: 's2',
    device: 'Mobile',
    browser: 'Safari 18',
    ip: '10.0.0.55',
    lastActive: '2026-06-08T20:15:00Z',
    current: false,
  },
];

function formatTime(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'Mobile') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
  );
}

export function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);

  // Password section
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Rate limit section
  const [globalRateLimit, setGlobalRateLimit] = useState('50');
  const [dnsheInterval, setDnsheInterval] = useState('1000');
  const [dnsnekoInterval, setDnsnekoInterval] = useState('1000');
  const [autoRetry, setAutoRetry] = useState(true);
  const [maxRetries, setMaxRetries] = useState('2');
  const [rateLimitSuccess, setRateLimitSuccess] = useState('');

  // Session section
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);

  const strength = getPasswordStrength(newPwd);

  const handleUpdatePassword = () => {
    setPwdError('');
    setPwdSuccess('');

    if (!currentPwd) {
      setPwdError('请输入当前密码');
      return;
    }
    if (newPwd.length < 8) {
      setPwdError('新密码至少需要 8 个字符');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('两次输入的密码不一致');
      return;
    }
    if (newPwd === currentPwd) {
      setPwdError('新密码不能与当前密码相同');
      return;
    }

    // Simulate success
    setPwdSuccess('密码已更新');
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
  };

  const handleSaveRateLimit = () => {
    setRateLimitSuccess('');
    // Simulate save
    setRateLimitSuccess('配置已保存');
  };

  const handleForceLogout = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleLogoutAll = () => {
    setSessions((prev) => prev.filter((s) => s.current));
    setLogoutAllOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">安全设置</h1>
        <p className="text-muted-foreground mt-1">账号安全与系统配置</p>
      </div>

      {/* Section 1: 修改密码 */}
      <Card>
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
              />
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
            {pwdError && <p className="text-sm text-destructive">{pwdError}</p>}
            {pwdSuccess && <p className="text-sm text-green-600 dark:text-green-400">{pwdSuccess}</p>}
            <Button onClick={handleUpdatePassword}>更新密码</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: 会话管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">会话管理</CardTitle>
          <CardDescription>管理您的活跃登录会话</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    <DeviceIcon device={session.device} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {session.browser} · {session.device}
                      </span>
                      {session.current && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          当前会话
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      IP: {session.ip} · 最后活跃: {formatTime(session.lastActive)}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleForceLogout(session.id)}
                  >
                    强制登出
                  </Button>
                )}
              </div>
            ))}
          </div>
          {sessions.some((s) => !s.current) && (
            <div className="mt-4">
              <Button variant="destructive" size="sm" onClick={() => setLogoutAllOpen(true)}>
                登出所有设备
              </Button>
            </div>
          )}
          <ConfirmDialog
            open={logoutAllOpen}
            onOpenChange={setLogoutAllOpen}
            title="登出所有设备"
            description="确定要登出所有其他设备上的会话吗？当前会话将保持登录状态。"
            confirmText="确认登出"
            onConfirm={handleLogoutAll}
          />
        </CardContent>
      </Card>

      {/* Section 3: API 速率限制 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API 速率限制</CardTitle>
          <CardDescription>
            配置 API 请求频率限制，防止因请求过快被服务商限制
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">全局请求速率限制</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={globalRateLimit}
                  onChange={(e) => setGlobalRateLimit(e.target.value)}
                  className="w-full sm:w-32"
                />
                <span className="text-sm text-muted-foreground">次/分钟</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">DNSHE 请求间隔</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={dnsheInterval}
                  onChange={(e) => setDnsheInterval(e.target.value)}
                  className="w-full sm:w-32"
                />
                <span className="text-sm text-muted-foreground">毫秒</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">DNSNeko 请求间隔</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={dnsnekoInterval}
                  onChange={(e) => setDnsnekoInterval(e.target.value)}
                  className="w-full sm:w-32"
                />
                <span className="text-sm text-muted-foreground">毫秒</span>
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
            {rateLimitSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{rateLimitSuccess}</p>
            )}
            <Button onClick={handleSaveRateLimit}>保存配置</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: 安全信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">安全信息</CardTitle>
          <CardDescription>账号安全相关只读信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">JWT Token 过期时间</span>
              <span className="text-sm font-medium">24 小时</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">凭证存储方式</span>
              <span className="text-sm font-medium">本地加密 / Cloudflare Secrets</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">最后密码修改时间</span>
              <span className="text-sm font-medium">
                {user?.createdAt ? formatTime(user.createdAt) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">账号创建时间</span>
              <span className="text-sm font-medium">
                {user?.createdAt ? formatTime(user.createdAt) : '—'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
