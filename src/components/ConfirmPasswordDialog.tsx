import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function ConfirmPasswordDialog({
  open,
  title,
  description,
  loading,
  error,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}): JSX.Element | null {
  const [password, setPassword] = useState('');

  // Clear the password whenever the dialog opens or closes so a previously
  // typed password never lingers in memory or gets resubmitted by accident.
  useEffect(() => {
    setPassword('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!password || loading) return;
    onConfirm(password);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-neon">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="confirm-password">管理员密码</Label>
          <Input
            id="confirm-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </div>
        {error ? <div role="alert" className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-700 dark:text-red-200">{error}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>取消</Button>
          <Button type="submit" variant="neon" disabled={!password || loading}>{loading ? '处理中...' : '确认'}</Button>
        </div>
      </form>
    </div>
  );
}
