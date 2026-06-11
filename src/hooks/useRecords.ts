import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DnsRecord } from '@/types';

export function useRecords(accountId: string, domainId: string) {
  return useQuery({
    queryKey: ['records', accountId, domainId],
    queryFn: () => api.get<DnsRecord[]>(`/records/${accountId}/${domainId}`),
    enabled: !!accountId && !!domainId,
  });
}

export function useCreateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      domainId,
      ...data
    }: Omit<DnsRecord, 'id' | 'updatedAt' | 'accountId' | 'platform' | 'status'> & {
      accountId: string;
      domainId: string;
    }) => api.post<DnsRecord>(`/records/${accountId}/${domainId}/create`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['records', variables.accountId, variables.domainId],
      });
    },
  });
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      domainId,
      recordId,
      ...data
    }: Partial<Omit<DnsRecord, 'id' | 'updatedAt' | 'accountId' | 'platform' | 'status'>> & {
      accountId: string;
      domainId: string;
      recordId: string;
    }) => api.put<DnsRecord>(`/records/${accountId}/${domainId}/${recordId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['records', variables.accountId, variables.domainId],
      });
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      domainId,
      recordId,
    }: {
      accountId: string;
      domainId: string;
      recordId: string;
    }) => api.delete<void>(`/records/${accountId}/${domainId}/${recordId}/delete`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['records', variables.accountId, variables.domainId],
      });
    },
  });
}

export function useToggleRecordStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      domainId: _domainId,
      recordId,
      enabled,
    }: {
      accountId: string;
      domainId: string;
      recordId: string;
      enabled: boolean;
    }) => api.post<DnsRecord>(`/records/${accountId}/${recordId}/status`, { status: enabled ? 1 : 0 }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['records', variables.accountId, variables.domainId],
      });
    },
  });
}

export function useBatchOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      domainId,
      operation,
      recordIds,
      ttl,
      line,
    }: {
      accountId: string;
      domainId: string;
      operation: 'enable' | 'disable' | 'delete' | 'ttl' | 'line';
      recordIds: string[];
      ttl?: number;
      line?: string;
    }) => {
      const baseBody = { accountId, domainId, recordIds };
      switch (operation) {
        case 'enable':
          return api.post<{ success: number; failed: number }>('/records/batch/status', { ...baseBody, status: 1 });
        case 'disable':
          return api.post<{ success: number; failed: number }>('/records/batch/status', { ...baseBody, status: 0 });
        case 'delete':
          return api.post<{ success: number; failed: number }>('/records/batch/delete', baseBody);
        case 'ttl':
          return api.post<{ success: number; failed: number }>('/records/batch/ttl', { ...baseBody, ttl: ttl! });
        case 'line':
          return api.post<{ success: number; failed: number }>('/records/batch/line', { ...baseBody, line: line! });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['records', variables.accountId, variables.domainId],
      });
    },
  });
}
