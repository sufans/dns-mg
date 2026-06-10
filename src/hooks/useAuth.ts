import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { LoginInput, VerifyPasswordInput } from '@/types';

interface AuthResponse {
  token: string;
}

interface LoginErrorData {
  message: string;
  remainingAttempts?: number;
  unlockAt?: string;
}

export function useLogin() {
  const navigate = useNavigate();

  return useMutation<AuthResponse, Error, LoginInput>({
    mutationFn: async (data: LoginInput) => {
      return api.post<AuthResponse>('/auth/login', data);
    },
    onSuccess: (data) => {
      localStorage.setItem('dns-manager-token', data.token);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      navigate('/dashboard', { replace: true });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      api.removeToken();
      queryClient.clear();
    },
    onSuccess: () => {
      navigate('/login', { replace: true });
    },
  });
}

export function useVerifyPassword() {
  return useMutation({
    mutationFn: (data: VerifyPasswordInput) => api.post<{ valid: boolean }>('/auth/verify-password', data),
  });
}

export function useIsAuthenticated(): boolean {
  const token = localStorage.getItem('dns-manager-token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export type { LoginErrorData };
