import { FileText, Settings2, Database } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OperationLogs } from '@/components/settings/OperationLogs';
import { RefreshConfig } from '@/components/settings/RefreshConfig';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { BackupRestore } from '@/components/settings/BackupRestore';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">系统设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理系统配置、操作日志和数据备份</p>
      </div>

      <Tabs defaultValue="logs">
        <TabsList variant="line" className="border-b border-white/[0.06] w-full justify-start rounded-none pb-0">
          <TabsTrigger value="logs" className="flex items-center gap-1.5 px-4 pb-3">
            <FileText className="size-4" />
            操作日志
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-1.5 px-4 pb-3">
            <Settings2 className="size-4" />
            通用设置
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5 px-4 pb-3">
            <Database className="size-4" />
            数据管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-6">
          <OperationLogs />
        </TabsContent>

        <TabsContent value="general" className="mt-6 space-y-6">
          <RefreshConfig />
          <EmailSettings />
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <BackupRestore />
        </TabsContent>
      </Tabs>
    </div>
  );
}
