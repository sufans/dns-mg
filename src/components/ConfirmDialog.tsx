import { useEffect } from 'react';
import { Button } from './ui/button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  loading,
  error,
  destructive,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-neon">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {error ? <div role="alert" className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-700 dark:text-red-200">{error}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>取消</Button>
          <Button variant={destructive ? 'destructive' : 'neon'} onClick={onConfirm} disabled={loading}>{loading ? '处理中...' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
