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
    mutationFn: (id: string) => api.delete<void>(`/accounts/${id}/delete`),
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
      api.upload<{ imported: number }>('/accounts/import', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useExportAccounts() {
  return useMutation({
    mutationFn: async () => {
      await api.download(
        '/accounts/export',
        `dns-accounts-${new Date().toISOString().slice(0, 10)}.json`
      );
    },
  });
}
