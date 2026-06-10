import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiAccount, CreateApiAccountInput, UpdateApiAccountInput } from '@/types';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<ApiAccount[]>('/accounts'),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiAccountInput) => api.post<ApiAccount>('/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateApiAccountInput & { id: string }) =>
      api.put<ApiAccount>(`/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useToggleAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch<ApiAccount>(`/accounts/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean; message: string }>(`/accounts/${id}/test`),
  });
}

export function useImportAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) =>
      fetch('/api/accounts/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('dns-manager-token')}`,
        },
        body: data,
      }).then(async (res) => {
        if (!res.ok) throw new Error('导入失败');
        const result = await res.json();
        return result.data;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useExportAccounts() {
  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('dns-manager-token');
      const response = await fetch('/api/accounts/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('导出失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dns-accounts-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}
