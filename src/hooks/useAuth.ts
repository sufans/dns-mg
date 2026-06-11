import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface AuthMe {
  username: string;
  csrf: string;
  exp: number;
}

export function useAuth(): { data: AuthMe | undefined; isLoading: boolean; isAuthenticated: boolean } {
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<AuthMe>('/api/auth/me'),
    retry: false,
    staleTime: 30_000
  });
  return { data: query.data, isLoading: query.isLoading, isAuthenticated: Boolean(query.data) };
}
