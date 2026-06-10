import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Domain } from '@/types';

export interface DomainFilters {
  platform?: string;
  groupId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface DomainListResponse {
  domains: Domain[];
  total: number;
  page: number;
  pageSize: number;
}

export function useDomains(filters?: DomainFilters) {
  return useQuery({
    queryKey: ['domains', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.platform) params.set('platform', filters.platform);
      if (filters?.groupId) params.set('groupId', filters.groupId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
      const query = params.toString();
      return api.get<DomainListResponse>(`/domains${query ? `?${query}` : ''}`);
    },
  });
}

export function useDomainDetail(accountId: string, domainId: string) {
  return useQuery({
    queryKey: ['domains', accountId, domainId],
    queryFn: () => api.get<Domain>(`/domains/${accountId}/${domainId}`),
    enabled: !!accountId && !!domainId,
  });
}
