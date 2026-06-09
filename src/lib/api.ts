import type { ApiResponse } from '../types';

class ApiClient {
  private rateLimiter = new Map<string, { count: number; resetAt: number }>();
  private maxRequestsPerMinute = 50;

  private checkRateLimit(key: string): void {
    const now = Date.now();
    const entry = this.rateLimiter.get(key);
    if (entry && now < entry.resetAt) {
      if (entry.count >= this.maxRequestsPerMinute) {
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
    this.checkRateLimit(url);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 5000)));
          return this.request<T>(url, options, retries - 1);
        }
        return { success: false, data: null, error: '请求过于频繁，请稍后重试', errorCode: 'RATE_LIMITED' };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.error || `HTTP ${response.status}`;
        const errorCode = errorData?.errorCode || errorData?.error_code || `HTTP_${response.status}`;
        return { success: false, data: null, error: errorMessage, errorCode };
      }

      const data = await response.json();
      return { success: true, data: data as T, error: null, errorCode: null };
    } catch (error) {
      if (retries > 0 && error instanceof TypeError && error.message.includes('fetch')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
}

export const apiClient = new ApiClient();
