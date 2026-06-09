import { useState, useCallback } from 'react';
import type { ProviderType, DnsheCredential, DnsnekoCredential } from '../../types';
import { useCredentialsStore, maskSecret } from '../../stores/credentials';
import { providerRegistry } from '../../providers/registry';
import { DnsheProvider } from '../../providers/dnshe';
import { DnsnekoProvider } from '../../providers/dnsneko';
import { useIsMobile } from '../../hooks';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  ConfirmDialog,
  Input,
} from '../ui';

interface PlatformInfo {
  type: ProviderType;
  name: string;
  description: string;
  icon: string;
  endpoint: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    type: 'dnshe',
    name: 'DNSHE',
    description: 'DNSHE 免费域名服务',
    icon: '🌐',
    endpoint: 'https://api005.dnshe.com',
  },
  {
    type: 'dnsneko',
    name: 'DNSNeko',
    description: 'DNSNeko 域名解析服务',
    icon: '🐱',
    endpoint: 'https://www.dnsneko.com/api/v1/dns',
  },
];

function StatusBadge({ status }: { status: 'valid' | 'invalid' | 'unconfigured' }) {
  switch (status) {
    case 'valid':
      return <Badge variant="success">已配置</Badge>;
    case 'invalid':
      return <Badge variant="destructive">无效</Badge>;
    case 'unconfigured':
      return <Badge variant="secondary">未配置</Badge>;
  }
}

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
    >
      {visible ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function CredentialForm({
  provider,
  onSave,
  onCancel,
}: {
  provider: ProviderType;
  onSave: (credentials: DnsheCredential | DnsnekoCredential) => void;
  onCancel: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  const [dnsheForm, setDnsheForm] = useState<DnsheCredential>({ apiKey: '', apiSecret: '' });
  const [dnsnekoForm, setDnsnekoForm] = useState<DnsnekoCredential>({ username: '', apiKey: '' });

  const existingEntry = useCredentialsStore((s) => s.getCredential(provider));
  const updateStatus = useCredentialsStore((s) => s.updateStatus);

  const toggleShow = (field: string) => {
    setShowFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      let providerInstance: DnsheProvider | DnsnekoProvider;
      if (provider === 'dnshe') {
        if (!dnsheForm.apiKey || !dnsheForm.apiSecret) return;
        providerInstance = new DnsheProvider();
        providerInstance.setCredentials(dnsheForm);
      } else {
        if (!dnsnekoForm.username || !dnsnekoForm.apiKey) return;
        providerInstance = new DnsnekoProvider();
        providerInstance.setCredentials(dnsnekoForm);
      }
      const result = await providerInstance.testConnection();
      if (result) {
        updateStatus(provider, 'valid');
        alert('连接成功');
      } else {
        updateStatus(provider, 'invalid');
        alert('连接失败: 无法验证凭证');
      }
    } catch (err) {
      updateStatus(provider, 'invalid');
      alert(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setTesting(false);
    }
  }, [provider, dnsheForm, dnsnekoForm, updateStatus]);

  const handleSave = () => {
    if (provider === 'dnshe') {
      if (!dnsheForm.apiKey || !dnsheForm.apiSecret) return;
      onSave(dnsheForm);
    } else {
      if (!dnsnekoForm.username || !dnsnekoForm.apiKey) return;
      onSave(dnsnekoForm);
    }
  };

  const isFormValid =
    provider === 'dnshe'
      ? dnsheForm.apiKey.trim() !== '' && dnsheForm.apiSecret.trim() !== ''
      : dnsnekoForm.username.trim() !== '' && dnsnekoForm.apiKey.trim() !== '';

  return (
    <div className="space-y-4">
      {provider === 'dnshe' ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showFields['dnshe_apiKey'] ? 'text' : 'password'}
                placeholder={existingEntry ? maskSecret((existingEntry.credentials as DnsheCredential).apiKey) : '请输入 API Key'}
                value={dnsheForm.apiKey}
                onChange={(e) => setDnsheForm((f) => ({ ...f, apiKey: e.target.value }))}
                className="pr-10"
              />
              <EyeToggle visible={showFields['dnshe_apiKey'] ?? false} onToggle={() => toggleShow('dnshe_apiKey')} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">API Secret</label>
            <div className="relative">
              <Input
                type={showFields['dnshe_apiSecret'] ? 'text' : 'password'}
                placeholder={existingEntry ? maskSecret((existingEntry.credentials as DnsheCredential).apiSecret) : '请输入 API Secret'}
                value={dnsheForm.apiSecret}
                onChange={(e) => setDnsheForm((f) => ({ ...f, apiSecret: e.target.value }))}
                className="pr-10"
              />
              <EyeToggle visible={showFields['dnshe_apiSecret'] ?? false} onToggle={() => toggleShow('dnshe_apiSecret')} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">用户名</label>
            <div className="relative">
              <Input
                type={showFields['dnsneko_username'] ? 'text' : 'password'}
                placeholder={existingEntry ? maskSecret((existingEntry.credentials as DnsnekoCredential).username) : '请输入用户名'}
                value={dnsnekoForm.username}
                onChange={(e) => setDnsnekoForm((f) => ({ ...f, username: e.target.value }))}
                className="pr-10"
              />
              <EyeToggle visible={showFields['dnsneko_username'] ?? false} onToggle={() => toggleShow('dnsneko_username')} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showFields['dnsneko_apiKey'] ? 'text' : 'password'}
                placeholder={existingEntry ? maskSecret((existingEntry.credentials as DnsnekoCredential).apiKey) : '请输入 API Key'}
                value={dnsnekoForm.apiKey}
                onChange={(e) => setDnsnekoForm((f) => ({ ...f, apiKey: e.target.value }))}
                className="pr-10"
              />
              <EyeToggle visible={showFields['dnsneko_apiKey'] ?? false} onToggle={() => toggleShow('dnsneko_apiKey')} />
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={!isFormValid || testing}
        >
          {testing && (
            <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          测试连接
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSave} disabled={!isFormValid}>保存</Button>
      </DialogFooter>
    </div>
  );
}

function PlatformCard({ platform }: { platform: PlatformInfo }) {
  const entry = useCredentialsStore((s) => s.getCredential(platform.type));
  const addCredential = useCredentialsStore((s) => s.addCredential);
  const removeCredential = useCredentialsStore((s) => s.removeCredential);
  const updateStatus = useCredentialsStore((s) => s.updateStatus);
  const isMobile = useIsMobile();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  const status = entry?.status ?? 'unconfigured';
  const lastVerified = entry?.lastVerified;

  const handleTestConnection = async () => {
    if (!entry) return;
    setTesting(true);
    try {
      const provider = providerRegistry.get(platform.type);
      if (!provider) return;

      if (provider instanceof DnsheProvider) {
        provider.setCredentials(entry.credentials as DnsheCredential);
      } else if (provider instanceof DnsnekoProvider) {
        provider.setCredentials(entry.credentials as DnsnekoCredential);
      }

      const result = await provider.testConnection();
      if (result) {
        updateStatus(platform.type, 'valid');
        alert('连接成功');
      } else {
        updateStatus(platform.type, 'invalid');
        alert('连接失败: 无法验证凭证');
      }
    } catch (err) {
      updateStatus(platform.type, 'invalid');
      alert(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (credentials: DnsheCredential | DnsnekoCredential) => {
    addCredential({
      provider: platform.type,
      label: platform.name,
      status: 'valid',
      lastVerified: null,
      credentials,
    });
    setEditOpen(false);
  };

  const handleDelete = () => {
    removeCredential(platform.type);
    setDeleteOpen(false);
  };

  const renderMaskedFields = () => {
    if (!entry) return null;
    if (platform.type === 'dnshe') {
      const cred = entry.credentials as DnsheCredential;
      return (
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>API Key: {maskSecret(cred.apiKey)}</div>
          <div>API Secret: {maskSecret(cred.apiSecret)}</div>
        </div>
      );
    } else {
      const cred = entry.credentials as DnsnekoCredential;
      return (
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>用户名: {maskSecret(cred.username)}</div>
          <div>API Key: {maskSecret(cred.apiKey)}</div>
        </div>
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{platform.icon}</span>
              <div>
                <CardTitle className="text-lg">{platform.name}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">API 端点: </span>
            <span className="font-mono text-xs">{platform.endpoint}</span>
          </div>
          {lastVerified && (
            <div className="text-sm">
              <span className="text-muted-foreground">上次验证: </span>
              <span>{new Date(lastVerified).toLocaleString('zh-CN')}</span>
            </div>
          )}
          {renderMaskedFields()}
        </CardContent>
        <CardFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            {entry ? '编辑' : '配置'}
          </Button>
          {entry && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <svg className="mr-1 h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : null}
                测试连接
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                删除
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={isMobile ? 'max-w-full h-full rounded-none' : ''}>
          <DialogHeader>
            <DialogTitle>{entry ? '编辑' : '配置'} {platform.name} 凭证</DialogTitle>
            <DialogDescription>
              请输入 {platform.name} 平台的 API 凭证信息
            </DialogDescription>
          </DialogHeader>
          <CredentialForm
            provider={platform.type}
            onSave={handleSave}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除 API 凭证"
        description={`确定要删除 ${platform.name} 的 API 凭证吗？`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </>
  );
}

export function ApiAccountsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const addCredential = useCredentialsStore((s) => s.addCredential);
  const isMobile = useIsMobile();

  const unconfiguredPlatforms = PLATFORMS.filter((p) => {
    const entry = useCredentialsStore.getState().getCredential(p.type);
    return !entry;
  });

  const handleAddSave = (credentials: DnsheCredential | DnsnekoCredential) => {
    if (!selectedProvider) return;
    const platform = PLATFORMS.find((p) => p.type === selectedProvider)!;
    addCredential({
      provider: platform.type,
      label: platform.name,
      status: 'valid',
      lastVerified: null,
      credentials,
    });
    setAddOpen(false);
    setSelectedProvider(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API 账号管理</h1>
          <p className="text-muted-foreground">管理各平台的 API 凭证配置</p>
        </div>
        {unconfiguredPlatforms.length > 0 && (
          <Button onClick={() => setAddOpen(true)}>添加平台</Button>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <PlatformCard key={platform.type} platform={platform} />
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setSelectedProvider(null); }}>
        <DialogContent className={isMobile ? 'max-w-full h-full rounded-none' : ''}>
          <DialogHeader>
            <DialogTitle>添加平台</DialogTitle>
            <DialogDescription>选择要配置的平台</DialogDescription>
          </DialogHeader>
          {!selectedProvider ? (
            <div className="grid gap-3 py-2">
              {unconfiguredPlatforms.map((platform) => (
                <button
                  key={platform.type}
                  type="button"
                  className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                  onClick={() => setSelectedProvider(platform.type)}
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <div className="font-medium">{platform.name}</div>
                    <div className="text-sm text-muted-foreground">{platform.description}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <CredentialForm
              provider={selectedProvider}
              onSave={handleAddSave}
              onCancel={() => { setSelectedProvider(null); setAddOpen(false); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
