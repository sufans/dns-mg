import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { ConfirmPasswordDialog } from '../components/ConfirmPasswordDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { api } from '../lib/api';
import { queryClient } from '../lib/query';
import { downloadText } from '../lib/utils';

/** Accepts either a bare encryptedPayload string or the full exported JSON object. */
function normalizePayload(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith('{')) return text;
  try {
    const parsed = JSON.parse(text) as { encryptedPayload?: unknown };
    return typeof parsed.encryptedPayload === 'string' ? parsed.encryptedPayload : text;
  } catch {
    return text;
  }
}

export function BackupPage(): JSX.Element {
  const [payload, setPayload] = useState('');
  const [verifyOpen, setVerifyOpen] = useState(false);

  const exportBackup = useMutation({
    mutationFn: () => api.get<{ encryptedPayload: string }>('/api/backup/export'),
    onSuccess: (data) => downloadText(`dns-manager-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
  });

  const importBackup = useMutation({
    mutationFn: (verifyPassword: string) => api.post('/api/backup/import', { encryptedPayload: normalizePayload(payload), verifyPassword }),
    onSuccess: async () => {
      setVerifyOpen(false);
      setPayload('');
      await queryClient.invalidateQueries();
    }
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold tracking-tight">数据备份与恢复</h1><p className="mt-2 text-muted-foreground">导出内容使用 ENCRYPTION_KEY 加密，可恢复分组、账号和设置。</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>导出备份</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">导出的 JSON 不包含管理员凭证，API 账号配置保持加密状态。</p>
            <Button variant="neon" onClick={() => exportBackup.mutate()} disabled={exportBackup.isPending}>
              <Download className="mr-2 h-4 w-4" />{exportBackup.isPending ? '导出中...' : '导出加密备份'}
            </Button>
            {exportBackup.isSuccess ? <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">备份文件已开始下载。</div> : null}
            {exportBackup.error ? <div className="mt-3 text-sm text-red-600 dark:text-red-400">导出失败：{exportBackup.error.message}</div> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>恢复备份</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup-payload">备份内容</Label>
              <Textarea id="backup-payload" placeholder="粘贴 encryptedPayload 字符串或完整 JSON 中的 encryptedPayload" value={payload} onChange={(e) => setPayload(e.target.value)} />
            </div>
            <Button variant="outline" disabled={!payload.trim() || importBackup.isPending} onClick={() => setVerifyOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />{importBackup.isPending ? '恢复中...' : '恢复'}
            </Button>
            {importBackup.isSuccess ? <div className="text-sm text-emerald-600 dark:text-emerald-400">恢复完成，数据已刷新。</div> : null}
            {importBackup.error ? <div className="text-sm text-red-600 dark:text-red-400">{importBackup.error.message}</div> : null}
          </CardContent>
        </Card>
      </div>
      <ConfirmPasswordDialog
        open={verifyOpen}
        title="恢复备份"
        description="恢复数据属于敏感操作，会覆盖同名分组、账号与设置，请输入管理员密码确认。"
        loading={importBackup.isPending}
        error={importBackup.error?.message ?? null}
        onCancel={() => {
          if (importBackup.isPending) return;
          setVerifyOpen(false);
          importBackup.reset();
        }}
        onConfirm={(password) => importBackup.mutate(password)}
      />
    </div>
  );
}
