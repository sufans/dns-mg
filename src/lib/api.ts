import type { ApiResponse } from '../types';
import { useConfigStore } from '../stores/config';
import { useAlertsStore } from '../stores/alerts';

class ApiClient {
  private rateLimiter = new Map<string, { count: number; resetAt: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private get maxRequests(): number {
    try {
      return useConfigStore.getState().rateLimitPerMinute;
    } catch {
      return 50;
    }
  }

  constructor() {
    // Periodically clean up expired rate limiter entries (older than 2 minutes)
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.rateLimiter) {
        if (now >= entry.resetAt + 60000) {
          this.rateLimiter.delete(key);
        }
      }
    }, 120000);
  }

  private getRateLimitKey(url: string, method?: string): string {
    try {
      const parsed = new URL(url);
      return `${method ?? 'GET'}:${parsed.host}${parsed.pathname}`;
    } catch {
      return `${method ?? 'GET'}:${url}`;
    }
  }

  private checkRateLimit(url: string, method?: string): void {
    const key = this.getRateLimitKey(url, method);
    const now = Date.now();
    const entry = this.rateLimiter.get(key);
    if (entry && now < entry.resetAt) {
      if (entry.count >= this.maxRequests) {
        throw new Error(`Rate limit exceeded for ${key}. Please wait and try again.`);
      }
      entry.count++;
    } else {
      this.rateLimiter.set(key, { count: 1, resetAt: now + 60000 });
    }
  }

  async request<T>(
    url: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<ApiResponse<T>> {
    this.checkRateLimit(url, options.method);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 429) {
        useAlertsStore.getState().addAlert({
          type: 'rate_limit',
          severity: 'warning',
          message: `API 请求频率超限: ${url}`,
        });
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        if (retries > 0) {
          const backoffMs = Math.min(waitMs, 5000) * Math.pow(2, 2 - retries);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          return this.request<T>(url, options, retries - 1);
        }
        return { success: false, data: null, error: '请求过于频繁，请稍后重试', errorCode: 'RATE_LIMITED' };
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          useAlertsStore.getState().addAlert({
            type: 'credential_invalid',
            severity: 'critical',
            message: `API 认证失败 (${response.status}): ${url}`,
          });
        }
        let errorMessage = `HTTP ${response.status}`;
        let errorCode = `HTTP_${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData === 'object') {
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorCode = errorData.errorCode || errorData.error_code || errorCode;
          }
        } catch {
          // Response body is not JSON; use default error message
        }
        return { success: false, data: null, error: errorMessage, errorCode };
      }

      const data = await response.json();
      return { success: true, data: data as T, error: null, errorCode: null };
    } catch (error) {
      if (retries > 0 && error instanceof TypeError && error.message.includes('fetch')) {
        const backoffMs = 1000 * Math.pow(2, 2 - retries);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.request<T>(url, options, retries - 1);
      }
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : '未知错误',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  dispose(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const apiClient = new ApiClient();

if (import.meta.hot) {
  import.meta.hot.dispose(() => apiClient.dispose());
}
