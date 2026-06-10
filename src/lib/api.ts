const API_BASE = '/api';
const TOKEN_KEY = 'dns-manager-token';
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

interface ApiErrorResponse {
  code: number;
  message: string;
  data: null;
}

interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() > exp - REFRESH_THRESHOLD_MS;
    } catch {
      return true;
    }
  }

  private async refreshToken(): Promise<string | null> {
    // Mutex: if a refresh is already in progress, reuse that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const token = this.getToken();
    if (!token) return null;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          this.removeToken();
          window.location.href = '/login';
          return null;
        }

        const result: ApiResponse<{ token: string }> = await response.json();
        if (result.code === 0 && result.data) {
          this.setToken(result.data.token);
          return result.data.token;
        }

        this.removeToken();
        window.location.href = '/login';
        return null;
      } catch {
        this.removeToken();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    let token = this.getToken();

    // Auto-refresh token if expiring soon
    if (token && this.isTokenExpiringSoon(token)) {
      const newToken = await this.refreshToken();
      if (newToken) {
        token = newToken;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      this.removeToken();
      window.location.href = '/login';
      throw new Error('认证已过期，请重新登录');
    }

    // Parse response
    let result: ApiResponse<T>;
    try {
      result = await response.json();
    } catch {
      throw new Error(`请求失败 (${response.status})`);
    }

    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `请求失败 (${response.status})`);
    }

    return result.data as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** Download a file (blob response) with auth and token refresh */
  async download(path: string, filename: string): Promise<void> {
    let token = this.getToken();

    if (token && this.isTokenExpiringSoon(token)) {
      const newToken = await this.refreshToken();
      if (newToken) {
        token = newToken;
      }
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, { headers });

    if (response.status === 401) {
      this.removeToken();
      window.location.href = '/login';
      throw new Error('认证已过期，请重新登录');
    }

    if (!response.ok) {
      // Try to parse error message from JSON response
      let errorMessage = `下载失败 (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Response is not JSON, use default error message
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /** Upload a file (FormData) with auth and token refresh */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    let token = this.getToken();

    if (token && this.isTokenExpiringSoon(token)) {
      const newToken = await this.refreshToken();
      if (newToken) {
        token = newToken;
      }
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type for FormData; browser sets it with boundary

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.removeToken();
      window.location.href = '/login';
      throw new Error('认证已过期，请重新登录');
    }

    let result: ApiResponse<T>;
    try {
      result = await response.json();
    } catch {
      throw new Error(`上传失败 (${response.status})`);
    }

    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `上传失败 (${response.status})`);
    }

    return result.data as T;
  }
}

export const api = new ApiClient();
