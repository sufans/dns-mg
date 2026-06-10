import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DnsRecord } from '@/types';

export function useRecords(accountId: string, domainId: string) {
  return useQuery({
    queryKey: ['records', accountId, domainId],
    queryFn: () => api.get<DnsRecord[]>(`/accounts/${accountId}/domains/${domainId}/records`),
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
    }) => api.post<DnsRecord>(`/accounts/${accountId}/domains/${domainId}/records`, data),
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
    }) => api.put<DnsRecord>(`/accounts/${accountId}/domains/${domainId}/records/${recordId}`, data),
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
    }) => api.delete<void>(`/accounts/${accountId}/domains/${domainId}/records/${recordId}`),
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
      domainId,
      recordId,
    }: {
      accountId: string;
      domainId: string;
      recordId: string;
    }) => api.patch<DnsRecord>(`/accounts/${accountId}/domains/${domainId}/records/${recordId}/toggle`),
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
    }) => api.post<{ success: number; failed: number }>(
      `/accounts/${accountId}/domains/${domainId}/records/batch`,
      { operation, recordIds, ttl, line }
    ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['records', variables.accountId, variables.domainId],
      });
    },
  });
}
