import { useState, useEffect } from 'react';
import { Loader2, Save, Mail, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const NOTIFY_DAYS_OPTIONS = [
  { value: 30, label: '30 天' },
  { value: 14, label: '14 天' },
  { value: 7, label: '7 天' },
  { value: 3, label: '3 天' },
  { value: 1, label: '1 天' },
];

function getSettingValue(settings: Record<string, unknown> | undefined, key: string, fallback: string): string {
  if (!settings) return fallback;
  const val = settings[key];
  return typeof val === 'string' ? val : String(val ?? fallback);
}

export function EmailSettings() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const emailEnabled = getSettingValue(settings, 'email_notification_enabled', 'false') === 'true';
  const currentEmail = getSettingValue(settings, 'notification_email', '');
  const currentNotifyDays = getSettingValue(settings, 'notify_days_before', '7,3,1');

  const [enabled, setEnabled] = useState(emailEnabled);
  const [email, setEmail] = useState(currentEmail);
  const [notifyDays, setNotifyDays] = useState<number[]>([]);
  const [emailError, setEmailError] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setEnabled(emailEnabled);
  }, [emailEnabled]);

  useEffect(() => {
    setEmail(currentEmail);
  }, [currentEmail]);

  useEffect(() => {
    const days = currentNotifyDays.split(',').map(Number).filter((n) => !isNaN(n));
    setNotifyDays(days);
  }, [currentNotifyDays]);

  const toggleDay = (day: number) => {
    setNotifyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('邮箱地址不能为空');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('邮箱格式无效');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSave = async () => {
    if (enabled && !validateEmail(email)) return;

    try {
      await updateSettings.mutateAsync({
        email_notification_enabled: String(enabled),
        notification_email: email,
        notify_days_before: notifyDays.join(','),
      });
      toast.success('邮件通知设置已保存');
    } catch {
      toast.error('保存失败');
    }
  };

  const handleTestEmail = async () => {
    if (!validateEmail(email)) return;

    setTesting(true);
    try {
      await api.post('/settings/test-email', { email });
      toast.success('测试邮件已发送，请检查收件箱');
    } catch {
      toast.error('发送测试邮件失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Mail className="size-5 text-accent-indigo" />
          邮件通知设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-foreground">启用邮件通知</Label>
            <p className="text-xs text-muted-foreground">域名到期前发送邮件提醒（由 Cloudflare Email Routing 处理）</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              enabled ? 'bg-accent-indigo' : 'bg-slate-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">通知邮箱地址</Label>
          <Input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            disabled={!enabled}
            className="bg-input/30 border-input"
          />
          {emailError && <p className="text-xs text-red-500">{emailError}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">到期提醒天数</Label>
          <div className="flex flex-wrap gap-2">
            {NOTIFY_DAYS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                  notifyDays.includes(opt.value)
                    ? 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo'
                    : 'border-input bg-input/30 text-muted-foreground hover:border-accent-indigo/50'
                } ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={notifyDays.includes(opt.value)}
                  onChange={() => toggleDay(opt.value)}
                  disabled={!enabled}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {enabled && notifyDays.length === 0 && (
            <p className="text-xs text-amber-500">请至少选择一个提醒天数</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#6366f1]/90 hover:to-[#a855f7]/90 text-white border-0"
          >
            {updateSettings.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            保存
          </Button>
          <Button
            variant="outline"
            onClick={handleTestEmail}
            disabled={testing || !enabled || !email}
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            发送测试邮件
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
