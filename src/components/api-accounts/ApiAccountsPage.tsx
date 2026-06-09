import { useState, useCallback, useMemo } from 'react';
import type { ProviderType, ProviderInfo, AccountEntry, PlatformCredential } from '../../types';
import { useCredentialsStore, maskSecret } from '../../stores/credentials';
import { useLogsStore } from '../../stores/logs';
import { providerRegistry } from '../../providers/registry';
import { DnsheProvider } from '../../providers/dnshe';
import { DnsnekoProvider } from '../../providers/dnsneko';
import { useIsMobile } from '../../hooks';
import { toast } from 'sonner';
import {
  Plus,
  Eye,
  EyeOff,
  Star,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  ConfirmDialog,
  EmptyState,
  Input,
} from '../ui';

// --- Provider Info Configuration ---

const PROVIDERS: ProviderInfo[] = [
  {
    type: 'dnshe',
    name: 'DNSHE',
    description: 'DNSHE 免费域名服务',
    icon: '🌐',
    endpoint: 'https://api005.dnshe.com',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '请输入 API Key', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: '请输入 API Secret', required: true },
    ],
  },
  {
    type: 'dnsneko',
    name: 'DNSNeko',
    description: 'DNSNeko 域名解析服务',
    icon: '🐱',
    endpoint: 'https://www.dnsneko.com/api/v1/dns',
    credentialFields: [
      { key: 'username', label: '用户名', type: 'text', placeholder: '请输入用户名', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '请输入 API Key', required: true },
    ],
  },
];

// --- Helper: generate default label ---

function generateLabel(provider: ProviderType): string {
  const accounts = useCredentialsStore.getState().getAccountsByProvider(provider);
  const providerInfo = PROVIDERS.find((p) => p.type === provider);
  const prefix = providerInfo?.name ?? provider;
  let idx = accounts.length + 1;
  const existingLabels = new Set(accounts.map((a) => a.label));
  while (existingLabels.has(`${prefix} 账号 ${idx}`)) {
    idx++;
  }
  return `${prefix} 账号 ${idx}`;
}

// --- Status Badge ---

function StatusBadge({ status }: { status: 'valid' | 'invalid' | 'unverified' }) {
  switch (status) {
    case 'valid':
      return <Badge variant="success">有效</Badge>;
    case 'invalid':
      return <Badge variant="destructive">无效</Badge>;
    case 'unverified':
      return <Badge variant="secondary">未验证</Badge>;
  }
}

// --- Credential Field Row (display with mask/show toggle) ---

function CredentialFieldDisplay({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground min-w-[80px]">{label}:</span>
      <span className="font-mono text-xs flex-1 break-all">
        {visible ? value : maskSecret(value)}
      </span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// --- Test Connection ---

async function testAccountConnection(account: AccountEntry): Promise<boolean> {
  const provider = providerRegistry.createProvider(account.provider);
  if (!provider) return false;

  if (provider instanceof DnsheProvider) {
    provider.setCredentials(account.credentials as { apiKey: string; apiSecret: string });
  } else if (provider instanceof DnsnekoProvider) {
    provider.setCredentials(account.credentials as { username: string; apiKey: string });
  }

  return provider.testConnection();
}

// --- Account Card ---

function AccountCard({
  account,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
}: {
  account: AccountEntry;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onTest: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const providerInfo = PROVIDERS.find((p) => p.type === account.provider);

  const handleTest = async () => {
    setTesting(true);
    await onTest();
    setTesting(false);
  };

  const credEntries = providerInfo?.credentialFields ?? [];
  const cred = account.credentials as unknown as Record<string, string>;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{providerInfo?.icon}</span>
            <span className="font-medium truncate">{account.label}</span>
            <StatusBadge status={account.status} />
          </div>
          {account.isDefault && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
          )}
        </div>

        {/* Credential fields */}
        <div className="space-y-1">
          {credEntries.map((field) => (
            <CredentialFieldDisplay
              key={field.key}
              label={field.label}
              value={cred[field.key] ?? ''}
            />
          ))}
        </div>

        {/* Tags */}
        {account.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {account.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            上次验证: {account.lastVerified ? new Date(account.lastVerified).toLocaleString('zh-CN') : '从未'}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              编辑
            </Button>
            <Button variant="ghost" size="sm" onClick={handleTest} disabled={testing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${testing ? 'animate-spin' : ''}`} />
              测试
            </Button>
            {!account.isDefault && (
              <Button variant="ghost" size="sm" onClick={onSetDefault}>
                <Star className="h-3.5 w-3.5 mr-1" />
                设为默认
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              删除
            </Button>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-1"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? '收起详情' : '展开详情'}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">总请求数</span>
                <div className="font-medium">{account.usageStats.totalRequests}</div>
              </div>
              <div>
                <span className="text-muted-foreground">最后请求</span>
                <div className="font-medium">
                  {account.usageStats.lastRequestAt
                    ? new Date(account.usageStats.lastRequestAt).toLocaleString('zh-CN')
                    : '从未'}
                </div>
              </div>
            </div>
            {account.usageStats.recentCalls.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">最近调用</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1 pr-2">时间</th>
                        <th className="text-left py-1 pr-2">端点</th>
                        <th className="text-right py-1 pr-2">状态</th>
                        <th className="text-right py-1">耗时</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.usageStats.recentCalls.slice(0, 5).map((call, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-2 whitespace-nowrap">
                            {new Date(call.timestamp).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-1 pr-2 font-mono truncate max-w-[120px]">
                            {call.endpoint}
                          </td>
                          <td className={`py-1 pr-2 text-right ${call.statusCode >= 400 ? 'text-destructive' : 'text-success'}`}>
                            {call.statusCode}
                          </td>
                          <td className="py-1 text-right">{call.duration}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Add Account Dialog ---

function AddAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const addAccount = useCredentialsStore((s) => s.addAccount);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [credForm, setCredForm] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('');
  const [tags, setTags] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [testing, setTesting] = useState(false);

  const providerInfo = PROVIDERS.find((p) => p.type === selectedProvider);

  const resetForm = () => {
    setStep(1);
    setSelectedProvider(null);
    setCredForm({});
    setLabel('');
    setTags('');
    setIsDefault(false);
    setTesting(false);
  };

  const handleSelectProvider = (type: ProviderType) => {
    setSelectedProvider(type);
    setLabel(generateLabel(type));
    setCredForm({});
    setStep(2);
  };

  const isFormValid = useMemo(() => {
    if (!providerInfo) return false;
    return providerInfo.credentialFields.every(
      (f) => !f.required || credForm[f.key]?.trim() !== ''
    );
  }, [providerInfo, credForm]);

  const handleTest = useCallback(async () => {
    if (!selectedProvider || !providerInfo) return;
    setTesting(true);
    try {
      const provider = providerRegistry.createProvider(selectedProvider);
      if (!provider) return;
      if (provider instanceof DnsheProvider) {
        provider.setCredentials(credForm as unknown as import('../../types').DnsheCredential);
      } else if (provider instanceof DnsnekoProvider) {
        provider.setCredentials(credForm as unknown as import('../../types').DnsnekoCredential);
      }
      const result = await provider.testConnection();
      if (result) {
        toast.success('连接成功');
      } else {
        toast.error('连接失败: 无法验证凭证');
      }
    } catch (err) {
      toast.error(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setTesting(false);
    }
  }, [selectedProvider, providerInfo, credForm]);

  const handleSave = () => {
    if (!selectedProvider || !isFormValid) return;
    const newAccount = addAccount({
      provider: selectedProvider,
      label: label.trim() || generateLabel(selectedProvider),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isDefault,
      credentials: credForm as unknown as PlatformCredential,
    });
    useLogsStore.getState().recordOperation('add_account', newAccount.label, 'success');
    toast.success(`账号 ${newAccount.label} 已添加`);
    resetForm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep(1);
    setCredForm({});
    setLabel('');
    setTags('');
    setIsDefault(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); else onOpenChange(v); }}>
      <DialogContent className={isMobile ? 'max-w-full h-full rounded-none' : ''}>
        <DialogHeader>
          <DialogTitle>添加账号</DialogTitle>
          <DialogDescription>
            {step === 1 ? '选择要配置的平台' : `填写 ${providerInfo?.name} 凭证信息`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid gap-3 py-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.type}
                type="button"
                className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => handleSelectProvider(p.type)}
              >
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.description}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {providerInfo?.credentialFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="text-sm font-medium">{field.label}</label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={credForm[field.key] ?? ''}
                  onChange={(e) => setCredForm((f) => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-medium">账号标签</label>
              <Input
                type="text"
                placeholder="输入账号标签"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标签 (逗号分隔)</label>
              <Input
                type="text"
                placeholder="例如: 生产, 备用"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              设为默认账号
            </label>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={handleTest} disabled={!isFormValid || testing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                测试连接
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>返回</Button>
              <Button variant="outline" onClick={handleCancel}>取消</Button>
              <Button onClick={handleSave} disabled={!isFormValid}>保存</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Edit Account Dialog ---

function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: {
  account: AccountEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const updateAccount = useCredentialsStore((s) => s.updateAccount);
  const updateAccountStatus = useCredentialsStore((s) => s.updateAccountStatus);

  const providerInfo = PROVIDERS.find((p) => p.type === account?.provider);

  const [credForm, setCredForm] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('');
  const [tags, setTags] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [testing, setTesting] = useState(false);

  // Initialize form when dialog opens or account changes
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevAccount, setPrevAccount] = useState(account);
  if (open && account && (open !== prevOpen || account !== prevAccount)) {
    setPrevOpen(open);
    setPrevAccount(account);
    const c = (account.credentials ?? {}) as unknown as Record<string, string>;
    const init: Record<string, string> = {};
    providerInfo?.credentialFields.forEach((f) => {
      init[f.key] = c[f.key] ?? '';
    });
    setCredForm(init);
    setLabel(account.label);
    setTags(account.tags.join(', '));
    setIsDefault(account.isDefault);
    setTesting(false);
  }

  const isFormValid = useMemo(() => {
    if (!providerInfo) return false;
    return providerInfo.credentialFields.every(
      (f) => !f.required || credForm[f.key]?.trim() !== ''
    );
  }, [providerInfo, credForm]);

  const handleTest = useCallback(async () => {
    if (!account || !providerInfo) return;
    setTesting(true);
    try {
      const provider = providerRegistry.createProvider(account.provider);
      if (!provider) return;
      if (provider instanceof DnsheProvider) {
        provider.setCredentials(credForm as unknown as import('../../types').DnsheCredential);
      } else if (provider instanceof DnsnekoProvider) {
        provider.setCredentials(credForm as unknown as import('../../types').DnsnekoCredential);
      }
      const result = await provider.testConnection();
      if (result) {
        updateAccountStatus(account.id, 'valid');
        toast.success('连接成功');
      } else {
        updateAccountStatus(account.id, 'invalid');
        toast.error('连接失败: 无法验证凭证');
      }
    } catch (err) {
      updateAccountStatus(account.id, 'invalid');
      toast.error(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setTesting(false);
    }
  }, [account, providerInfo, credForm, updateAccountStatus, setTesting]);

  const handleSave = () => {
    if (!account || !isFormValid) return;
    updateAccount(account.id, {
      label: label.trim() || account.label,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      credentials: credForm as unknown as PlatformCredential,
      isDefault,
    });
    useLogsStore.getState().recordOperation('edit_account', account.label, 'success');
    toast.success(`账号 ${label.trim() || account.label} 已更新`);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile ? 'max-w-full h-full rounded-none' : ''}>
        <DialogHeader>
          <DialogTitle>编辑账号</DialogTitle>
          <DialogDescription>
            修改 {providerInfo?.name} 账号凭证信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {providerInfo?.credentialFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium">{field.label}</label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={credForm[field.key] ?? ''}
                onChange={(e) => setCredForm((f) => ({ ...f, [field.key]: e.target.value }))}
              />
            </div>
          ))}

          <div className="space-y-2">
            <label className="text-sm font-medium">账号标签</label>
            <Input
              type="text"
              placeholder="输入账号标签"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">标签 (逗号分隔)</label>
            <Input
              type="text"
              placeholder="例如: 生产, 备用"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300"
            />
            设为默认账号
          </label>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={handleTest} disabled={!isFormValid || testing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              测试连接
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>取消</Button>
            <Button onClick={handleSave} disabled={!isFormValid}>保存</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---

export function ApiAccountsPage() {
  const isMobile = useIsMobile();
  const accounts = useCredentialsStore((s) => s.accounts);
  const removeAccount = useCredentialsStore((s) => s.removeAccount);
  const setDefaultAccount = useCredentialsStore((s) => s.setDefaultAccount);
  const updateAccountStatus = useCredentialsStore((s) => s.updateAccountStatus);

  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountEntry | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<AccountEntry | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | ProviderType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'unverified'>('all');

  const hasFilters = searchQuery !== '' || platformFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    setStatusFilter('all');
  };

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      // Platform filter
      if (platformFilter !== 'all' && a.provider !== platformFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      // Search filter (label, tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = a.label.toLowerCase().includes(q);
        const matchesTags = a.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesLabel && !matchesTags) return false;
      }
      return true;
    });
  }, [accounts, platformFilter, statusFilter, searchQuery]);

  // Handlers
  const handleTest = async (account: AccountEntry) => {
    try {
      const result = await testAccountConnection(account);
      if (result) {
        updateAccountStatus(account.id, 'valid');
        useLogsStore.getState().recordOperation('test_connection', account.label, 'success', '连接测试成功');
        toast.success(`${account.label} 连接成功`);
      } else {
        updateAccountStatus(account.id, 'invalid');
        useLogsStore.getState().recordOperation('test_connection', account.label, 'failure', '无法验证凭证');
        toast.error(`${account.label} 连接失败: 无法验证凭证`);
      }
    } catch (err) {
      updateAccountStatus(account.id, 'invalid');
      useLogsStore.getState().recordOperation('test_connection', account.label, 'failure', err instanceof Error ? err.message : '未知错误');
      toast.error(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const handleSetDefault = (account: AccountEntry) => {
    setDefaultAccount(account.id);
    useLogsStore.getState().recordOperation('set_default', account.label, 'success');
    toast.success(`${account.label} 已设为默认账号`);
  };

  const handleDelete = () => {
    if (!deleteAccount) return;
    const label = deleteAccount.label;
    removeAccount(deleteAccount.id);
    useLogsStore.getState().recordOperation('delete_account', label, 'success');
    toast.success(`账号 ${label} 已删除`);
    setDeleteAccount(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API 账号管理</h1>
          <p className="text-muted-foreground">管理所有平台的 API 凭证与状态</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          添加账号
        </Button>
      </div>

      {/* Search & Filter Bar */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索标签、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={platformFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlatformFilter('all')}
            >
              全部
            </Button>
            {PROVIDERS.map((p) => (
              <Button
                key={p.type}
                variant={platformFilter === p.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPlatformFilter(p.type)}
              >
                {p.icon} {p.name}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'valid', 'invalid', 'unverified'] as const).map((s) => {
              const labels: Record<string, string> = {
                all: '全部',
                valid: '有效',
                invalid: '无效',
                unverified: '未验证',
              };
              return (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {labels[s]}
                </Button>
              );
            })}
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              清除筛选
            </Button>
          )}
        </div>
      )}

      {/* Account Cards Grid or Empty State */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-12 w-12" />}
          title="暂无 API 账号"
          description="添加第一个 API 账号以开始管理 DNS 服务"
          actionLabel="添加第一个 API 账号"
          onAction={() => setAddOpen(true)}
        />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="没有匹配的账号"
          description="尝试调整搜索条件或筛选器"
          actionLabel="清除筛选"
          onAction={clearFilters}
        />
      ) : (
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => setEditAccount(account)}
              onDelete={() => setDeleteAccount(account)}
              onSetDefault={() => handleSetDefault(account)}
              onTest={() => handleTest(account)}
            />
          ))}
        </div>
      )}

      {/* Add Account Dialog */}
      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} />

      {/* Edit Account Dialog */}
      <EditAccountDialog
        account={editAccount}
        open={editAccount !== null}
        onOpenChange={(v) => { if (!v) setEditAccount(null); }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteAccount !== null}
        onOpenChange={(v) => { if (!v) setDeleteAccount(null); }}
        title="删除账号"
        description={deleteAccount ? `确定要删除账号 ${deleteAccount.label} 吗？` : ''}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}
