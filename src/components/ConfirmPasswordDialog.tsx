import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function ConfirmPasswordDialog({
  open,
  title,
  description,
  loading,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}): JSX.Element | null {
  const [password, setPassword] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950 p-6 shadow-neon">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        <div className="mt-5 space-y-2">
          <Label>管理员密码</Label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>取消</Button>
          <Button variant="neon" onClick={() => onConfirm(password)} disabled={!password || loading}>{loading ? '处理中...' : '确认'}</Button>
        </div>
      </div>
    </div>
  );
}
