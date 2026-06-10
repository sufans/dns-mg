import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UnifiedRecord } from '@/plugins/dns-platforms/types';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'] as const;

interface RecordFormData {
  name: string;
  type: string;
  value: string;
  line: string;
  ttl: number;
  priority: number;
  remark: string;
  // SRV-specific
  weight: number;
  port: number;
  target: string;
  // CAA-specific
  caaFlag: number;
  caaTag: string;
  caaValue: string;
}

const defaultFormData: RecordFormData = {
  name: '',
  type: 'A',
  value: '',
  line: 'default',
  ttl: 600,
  priority: 10,
  remark: '',
  weight: 0,
  port: 0,
  target: '',
  caaFlag: 0,
  caaTag: 'issue',
  caaValue: '',
};

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RecordFormData) => Promise<void>;
  loading?: boolean;
}

export function AddRecordDialog({ open, onOpenChange, onSubmit, loading }: AddRecordDialogProps) {
  const [form, setForm] = useState<RecordFormData>({ ...defaultFormData });

  useEffect(() => {
    if (open) {
      setForm({ ...defaultFormData });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const updateField = <K extends keyof RecordFormData>(key: K, value: RecordFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showPriority = form.type === 'MX' || form.type === 'SRV';
  const showSrvFields = form.type === 'SRV';
  const showCaaFields = form.type === 'CAA';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加记录</DialogTitle>
          <DialogDescription>为当前域名添加新的 DNS 解析记录</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 主机记录 */}
            <div className="space-y-1.5">
              <Label>主机记录</Label>
              <Input
                placeholder="@ 或 www"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>

            {/* 记录类型 */}
            <div className="space-y-1.5">
              <Label>记录类型</Label>
              <Select value={form.type} onValueChange={(v) => updateField('type', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 记录值 */}
          <div className="space-y-1.5">
            <Label>记录值</Label>
            <Input
              placeholder={form.type === 'A' ? '1.2.3.4' : form.type === 'CNAME' ? 'example.com' : '记录值'}
              value={form.value}
              onChange={(e) => updateField('value', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 解析线路 */}
            <div className="space-y-1.5">
              <Label>解析线路</Label>
              <Input
                placeholder="default"
                value={form.line}
                onChange={(e) => updateField('line', e.target.value)}
              />
            </div>

            {/* TTL */}
            <div className="space-y-1.5">
              <Label>TTL</Label>
              <Input
                type="number"
                min={1}
                value={form.ttl}
                onChange={(e) => updateField('ttl', Number(e.target.value))}
              />
            </div>
          </div>

          {/* 优先级 (MX/SRV) */}
          {showPriority && (
            <div className="space-y-1.5">
              <Label>优先级</Label>
              <Input
                type="number"
                min={0}
                max={65535}
                value={form.priority}
                onChange={(e) => updateField('priority', Number(e.target.value))}
              />
            </div>
          )}

          {/* SRV fields */}
          {showSrvFields && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>权重</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.weight}
                  onChange={(e) => updateField('weight', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>端口</Label>
                <Input
                  type="number"
                  min={0}
                  max={65535}
                  value={form.port}
                  onChange={(e) => updateField('port', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>目标</Label>
                <Input
                  placeholder="target host"
                  value={form.target}
                  onChange={(e) => updateField('target', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* CAA fields */}
          {showCaaFields && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>CAA Flag</Label>
                <Input
                  type="number"
                  min={0}
                  max={255}
                  value={form.caaFlag}
                  onChange={(e) => updateField('caaFlag', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CAA Tag</Label>
                <Select value={form.caaTag} onValueChange={(v) => updateField('caaTag', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="issue">issue</SelectItem>
                    <SelectItem value="issuewild">issuewild</SelectItem>
                    <SelectItem value="iodef">iodef</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CAA Value</Label>
                <Input
                  placeholder="e.g. letsencrypt.org"
                  value={form.caaValue}
                  onChange={(e) => updateField('caaValue', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 备注 */}
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Input
              placeholder="可选备注"
              value={form.remark}
              onChange={(e) => updateField('remark', e.target.value)}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>取消</DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: UnifiedRecord | null;
  onSubmit: (data: RecordFormData) => Promise<void>;
  loading?: boolean;
}

export function EditRecordDialog({ open, onOpenChange, record, onSubmit, loading }: EditRecordDialogProps) {
  const [form, setForm] = useState<RecordFormData>({ ...defaultFormData });

  useEffect(() => {
    if (open && record) {
      setForm({
        name: record.name || '',
        type: record.type || 'A',
        value: record.value || '',
        line: record.line || 'default',
        ttl: record.ttl || 600,
        priority: record.priority ?? 10,
        remark: record.remark || '',
        weight: 0,
        port: 0,
        target: '',
        caaFlag: 0,
        caaTag: 'issue',
        caaValue: '',
      });
    }
  }, [open, record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const updateField = <K extends keyof RecordFormData>(key: K, value: RecordFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showPriority = form.type === 'MX' || form.type === 'SRV';
  const showSrvFields = form.type === 'SRV';
  const showCaaFields = form.type === 'CAA';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑记录</DialogTitle>
          <DialogDescription>修改 DNS 解析记录配置</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>主机记录</Label>
              <Input
                placeholder="@ 或 www"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>记录类型</Label>
              <Select value={form.type} onValueChange={(v) => updateField('type', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>记录值</Label>
            <Input
              value={form.value}
              onChange={(e) => updateField('value', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>解析线路</Label>
              <Input
                value={form.line}
                onChange={(e) => updateField('line', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>TTL</Label>
              <Input
                type="number"
                min={1}
                value={form.ttl}
                onChange={(e) => updateField('ttl', Number(e.target.value))}
              />
            </div>
          </div>

          {showPriority && (
            <div className="space-y-1.5">
              <Label>优先级</Label>
              <Input
                type="number"
                min={0}
                max={65535}
                value={form.priority}
                onChange={(e) => updateField('priority', Number(e.target.value))}
              />
            </div>
          )}

          {showSrvFields && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>权重</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.weight}
                  onChange={(e) => updateField('weight', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>端口</Label>
                <Input
                  type="number"
                  min={0}
                  max={65535}
                  value={form.port}
                  onChange={(e) => updateField('port', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>目标</Label>
                <Input
                  value={form.target}
                  onChange={(e) => updateField('target', e.target.value)}
                />
              </div>
            </div>
          )}

          {showCaaFields && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>CAA Flag</Label>
                <Input
                  type="number"
                  min={0}
                  max={255}
                  value={form.caaFlag}
                  onChange={(e) => updateField('caaFlag', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CAA Tag</Label>
                <Select value={form.caaTag} onValueChange={(v) => updateField('caaTag', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="issue">issue</SelectItem>
                    <SelectItem value="issuewild">issuewild</SelectItem>
                    <SelectItem value="iodef">iodef</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CAA Value</Label>
                <Input
                  value={form.caaValue}
                  onChange={(e) => updateField('caaValue', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>备注</Label>
            <Input
              placeholder="可选备注"
              value={form.remark}
              onChange={(e) => updateField('remark', e.target.value)}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>取消</DialogClose>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: UnifiedRecord | null;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export function DeleteRecordDialog({ open, onOpenChange, record, onConfirm, loading }: DeleteRecordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除记录 <span className="font-medium text-foreground">{record?.name}</span>（{record?.type} - {record?.value}）吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { RecordFormData };
