import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OperationLog } from '@/types';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, unknown>>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, string>) => api.put<Record<string, unknown>>('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export interface LogFilters {
  action?: string;
  targetType?: string;
  status?: string;
  search?: string;
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
      if (filters?.search) params.set('search', filters.search);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
      const query = params.toString();
      return api.get<LogListResponse>(`/logs${query ? `?${query}` : ''}`);
    },
  });
}

export function useCleanupLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (retentionDays: number) => api.post<{ deleted: number }>('/logs/cleanup', { retentionDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
    },
  });
}

export function useBackup() {
  return useMutation({
    mutationFn: async () => {
      await api.download(
        '/backup',
        `dns-manager-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
    },
  });
}

export function useRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, password }: { file: File; password: string }) => {
      const fileContent = await file.text();
      return api.post<{ accountCount: number; groupCount: number; settingCount: number }>('/backup', {
        data: fileContent,
        password,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
