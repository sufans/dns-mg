import { useState } from 'react';
import { Loader2, Pause, Play, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

export type BatchOperation = 'status' | 'delete' | 'ttl' | 'line';

export interface BatchResult {
  ok: number;
  failed: Array<{ name: string; error: string }>;
}

/**
 * Toolbar shown while records are selected. It only collects intent: the page
 * decides whether to call the official batch endpoint or loop single-record
 * calls, because only DNSNEKO supports server-side batching.
 */
export function RecordBatchBar({
  selectedCount,
  supportsServerBatch,
  pending,
  progress,
  result,
  onClear,
  onRun,
  onRequestDelete
}: {
  selectedCount: number;
  supportsServerBatch: boolean;
  pending: boolean;
  progress: { done: number; total: number } | null;
  result: BatchResult | null;
  onClear: () => void;
  onRun: (operation: Exclude<BatchOperation, 'delete'>, value?: string | number | boolean) => void;
  onRequestDelete: () => void;
}): JSX.Element | null {
  const [ttl, setTtl] = useState('600');
  const [line, setLine] = useState('default');

  if (selectedCount === 0) return null;

  const ttlValue = Number(ttl);
  const ttlInvalid = !Number.isInteger(ttlValue) || ttlValue < 60 || ttlValue > 86400;

  return (
    <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium">已选 {selectedCount} 条</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs', supportsServerBatch ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' : 'bg-amber-500/15 text-amber-700 dark:text-amber-200')}>
          {supportsServerBatch ? '官方批量接口' : '逐条执行（并发 2）'}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onRun('status', true)}>
            <Play className="mr-1 h-4 w-4" />启用
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onRun('status', false)}>
            <Pause className="mr-1 h-4 w-4" />暂停
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={onRequestDelete}>
            <Trash2 className="mr-1 h-4 w-4" />删除
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={onClear}>
            <X className="mr-1 h-4 w-4" />取消选择
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="batch-ttl" className="text-xs">批量 TTL（秒）</Label>
            <Input id="batch-ttl" type="number" min={60} max={86400} value={ttl} onChange={(event) => setTtl(event.target.value)} className="h-9 w-32" />
          </div>
          <Button size="sm" variant="outline" disabled={pending || ttlInvalid} onClick={() => onRun('ttl', ttlValue)}>应用 TTL</Button>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="batch-line" className="text-xs">批量线路</Label>
            <Input id="batch-line" value={line} maxLength={64} onChange={(event) => setLine(event.target.value)} className="h-9 w-32" />
          </div>
          <Button size="sm" variant="outline" disabled={pending || !line.trim()} onClick={() => onRun('line', line.trim())}>应用线路</Button>
        </div>
      </div>

      {pending ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress ? `正在执行 ${progress.done} / ${progress.total}` : '正在提交...'}
        </div>
      ) : null}

      {result ? (
        <div className={cn('mt-3 rounded-lg border p-3 text-sm', result.failed.length ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200')}>
          成功 {result.ok} 条{result.failed.length ? `，失败 ${result.failed.length} 条` : ''}。
          {result.failed.length ? (
            <ul className="mt-1 list-disc pl-5">
              {result.failed.slice(0, 5).map((item) => <li key={item.name}>{item.name}：{item.error}</li>)}
              {result.failed.length > 5 ? <li>其余 {result.failed.length - 5} 条失败已省略。</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
