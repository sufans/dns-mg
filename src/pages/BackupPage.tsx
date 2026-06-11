import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { ConfirmPasswordDialog } from '../components/ConfirmPasswordDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { api } from '../lib/api';
import { downloadText } from '../lib/utils';

export function BackupPage(): JSX.Element {
  const [payload, setPayload] = useState('');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const exportBackup = useMutation({
    mutationFn: () => api.get<{ encryptedPayload: string }>('/api/backup/export'),
    onSuccess: (data) => downloadText(`dns-manager-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
  });
  const importBackup = useMutation({ mutationFn: (verifyPassword: string) => api.post('/api/backup/import', { encryptedPayload: payload.trim(), verifyPassword }) });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold tracking-tight">数据备份与恢复</h1><p className="mt-2 text-slate-400">导出内容使用 ENCRYPTION_KEY 加密，可恢复分组、账号和设置。</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>导出备份</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-slate-400">导出的 JSON 不包含管理员凭证，API 账号配置保持加密状态。</p><Button variant="neon" onClick={() => exportBackup.mutate()} disabled={exportBackup.isPending}><Download className="mr-2 h-4 w-4" />导出加密备份</Button></CardContent></Card>
        <Card><CardHeader><CardTitle>恢复备份</CardTitle></CardHeader><CardContent className="space-y-4"><Textarea placeholder="粘贴 encryptedPayload 字符串或完整 JSON 中的 encryptedPayload" value={payload} onChange={(e) => setPayload(e.target.value)} /><Button variant="outline" disabled={!payload || importBackup.isPending} onClick={() => setVerifyOpen(true)}><Upload className="mr-2 h-4 w-4" />恢复</Button>{importBackup.isSuccess ? <div className="text-sm text-emerald-300">恢复完成</div> : null}{importBackup.error ? <div className="text-sm text-red-300">{importBackup.error.message}</div> : null}</CardContent></Card>
      </div>
      <ConfirmPasswordDialog open={verifyOpen} title="恢复备份" description="恢复数据属于敏感操作，请输入管理员密码确认。" loading={importBackup.isPending} onCancel={() => setVerifyOpen(false)} onConfirm={(password) => importBackup.mutate(password)} />
    </div>
  );
}
