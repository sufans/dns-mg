import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SystemSetting, OperationLog } from '@/types';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SystemSetting[]>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, string>) => api.put<SystemSetting[]>('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export interface LogFilters {
  action?: string;
  targetType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

interface LogListResponse {
  logs: OperationLog[];
  total: number;
  page: number;
  pageSize: number;
}

export function useOperationLogs(filters?: LogFilters) {
  return useQuery({
    queryKey: ['operationLogs', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.action) params.set('action', filters.action);
      if (filters?.targetType) params.set('targetType', filters.targetType);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
      const query = params.toString();
      return api.get<LogListResponse>(`/settings/logs${query ? `?${query}` : ''}`);
    },
  });
}

export function useCleanupLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (retentionDays: number) => api.post<{ deleted: number }>('/settings/logs/cleanup', { retentionDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
    },
  });
}

export function useBackup() {
  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('dns-manager-token');
      const response = await fetch('/api/settings/backup', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('备份失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dns-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = localStorage.getItem('dns-manager-token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/settings/restore', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error('恢复失败');
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
