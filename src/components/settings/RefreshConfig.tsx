import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

const REFRESH_INTERVALS = [
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
  { value: 7200, label: '2 小时' },
  { value: 21600, label: '6 小时' },
  { value: 43200, label: '12 小时' },
  { value: 86400, label: '24 小时' },
];

function getSettingValue(settings: Record<string, unknown> | undefined, key: string, fallback: string): string {
  if (!settings) return fallback;
  const val = settings[key];
  return typeof val === 'string' ? val : String(val ?? fallback);
}

export function RefreshConfig() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const autoRefreshEnabled = getSettingValue(settings, 'auto_refresh_enabled', 'false') === 'true';
  const currentInterval = Number(getSettingValue(settings, 'auto_refresh_interval', '3600'));

  const [enabled, setEnabled] = useState(autoRefreshEnabled);
  const [interval, setIntervalValue] = useState(currentInterval);

  useEffect(() => {
    setEnabled(autoRefreshEnabled);
  }, [autoRefreshEnabled]);

  useEffect(() => {
    setIntervalValue(currentInterval);
  }, [currentInterval]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        auto_refresh_enabled: String(enabled),
        auto_refresh_interval: String(interval),
      });
      toast.success('刷新配置已保存');
    } catch {
      toast.error('保存失败');
    }
  };

  return (
    <Card className="bg-slate-800/50 border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-foreground">自动刷新配置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-foreground">启用自动刷新</Label>
            <p className="text-xs text-muted-foreground">开启后将按设定间隔自动刷新数据</p>
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
          <Label className="text-foreground">刷新间隔</Label>
          <select
            value={interval}
            onChange={(e) => setIntervalValue(Number(e.target.value))}
            disabled={!enabled}
            className="h-8 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            {REFRESH_INTERVALS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

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
      </CardContent>
    </Card>
  );
}
