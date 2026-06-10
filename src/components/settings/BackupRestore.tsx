import { useState, useRef, useCallback } from 'react';
import {
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  FileJson,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useBackup, useRestore, useSettings } from '@/hooks/useSettings';
import { useVerifyPassword } from '@/hooks/useAuth';
import { toast } from 'sonner';

function getSettingValue(settings: { key: string; value: string }[] | undefined, key: string, fallback: string): string {
  if (!settings) return fallback;
  const s = settings.find((item) => item.key === key);
  return s ? s.value : fallback;
}

function formatDateTime(iso: string): string {
  if (!iso) return '从未';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BackupRestore() {
  const { data: settings } = useSettings();
  const backupMutation = useBackup();
  const restoreMutation = useRestore();
  const verifyPassword = useVerifyPassword();

  const lastBackup = getSettingValue(settings, 'last_backup_at', '');

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restorePasswordError, setRestorePasswordError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = useCallback(async () => {
    try {
      await backupMutation.mutateAsync();
      toast.success('备份导出成功');
    } catch {
      toast.error('备份导出失败');
    }
  }, [backupMutation]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('请选择 .json 格式的备份文件');
      return;
    }
    setRestoreFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleRestoreClick = useCallback(() => {
    if (!restoreFile) return;
    setRestorePassword('');
    setRestorePasswordError('');
    setRestoreDialogOpen(true);
  }, [restoreFile]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!restoreFile) return;

    if (!restorePassword) {
      setRestorePasswordError('请输入密码以验证身份');
      return;
    }

    try {
      const result = await verifyPassword.mutateAsync({ password: restorePassword });
      if (!result.valid) {
        setRestorePasswordError('密码错误');
        return;
      }
    } catch {
      setRestorePasswordError('密码验证失败');
      return;
    }

    try {
      await restoreMutation.mutateAsync(restoreFile);
      toast.success('数据恢复成功');
      setRestoreDialogOpen(false);
      setRestoreFile(null);
    } catch {
      toast.error('数据恢复失败');
    }
  }, [restoreFile, restorePassword, verifyPassword, restoreMutation]);

  const removeFile = useCallback(() => {
    setRestoreFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <Card className="bg-slate-800/50 border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-foreground">数据备份与恢复</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Backup section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">备份</h3>
          <p className="text-xs text-muted-foreground">
            导出加密的 JSON 备份文件，包含所有系统数据。
          </p>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackup}
              disabled={backupMutation.isPending}
              className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#6366f1]/90 hover:to-[#a855f7]/90 text-white border-0"
            >
              {backupMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              导出备份
            </Button>
            {lastBackup && (
              <span className="text-xs text-muted-foreground">
                上次备份: {formatDateTime(lastBackup)}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Restore section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">恢复</h3>
          <p className="text-xs text-muted-foreground">
            从备份文件恢复数据。恢复操作需要密码验证。
          </p>

          {/* Warning */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                恢复操作将覆盖所有现有数据，请确保已备份当前数据
              </p>
            </div>
          </div>

          {/* File upload area */}
          {!restoreFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                isDragging
                  ? 'border-accent-indigo bg-accent-indigo/5'
                  : 'border-white/[0.1] hover:border-accent-indigo/50 hover:bg-white/[0.02]'
              }`}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                拖拽文件到此处或点击选择
              </p>
              <p className="text-xs text-muted-foreground">仅支持 .json 文件</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-slate-900/50 px-4 py-3">
              <FileJson className="size-5 text-accent-indigo shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{restoreFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(restoreFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={removeFile}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}

          {restoreFile && (
            <Button
              variant="outline"
              onClick={handleRestoreClick}
              disabled={restoreMutation.isPending}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              {restoreMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              恢复数据
            </Button>
          )}
        </div>
      </CardContent>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              确认恢复数据
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              此操作将覆盖所有现有数据，且不可撤销。请输入登录密码以确认身份。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-foreground">登录密码</Label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={restorePassword}
              onChange={(e) => {
                setRestorePassword(e.target.value);
                if (restorePasswordError) setRestorePasswordError('');
              }}
              className="bg-input/30 border-input"
              onKeyDown={(e) => e.key === 'Enter' && handleRestoreConfirm()}
            />
            {restorePasswordError && (
              <p className="text-xs text-red-500">{restorePasswordError}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button
              variant="destructive"
              onClick={handleRestoreConfirm}
              disabled={verifyPassword.isPending || restoreMutation.isPending}
            >
              {(verifyPassword.isPending || restoreMutation.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
