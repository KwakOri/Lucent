/**
 * API Client
 *
 * fetch 기반 HTTP 클라이언트
 */

import { createClient } from '@/utils/supabase/client';
import { ApiError } from './api-error';

interface APIRequestOptions extends RequestInit {
  requiresAuth?: boolean;
  retryOnNetworkError?: boolean;
}

class APIClient {
  private baseURL: string;
  private supabaseClient: ReturnType<typeof createClient> | null = null;

  constructor(baseURL = '') {
    this.baseURL = baseURL.replace(/\/$/, '');
  }

  /**
   * HTTP 요청 공통 처리
   */
  private async request<T>(url: string, options: APIRequestOptions = {}): Promise<T> {
    const {
      requiresAuth = true,
      retryOnNetworkError = true,
      headers: customHeaders,
      ...requestInit
    } = options;
    const method = (requestInit.method ?? 'GET').toUpperCase();
    const headers = new Headers(customHeaders || {});

    if (!(requestInit.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (requiresAuth) {
      const accessToken = await this.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }

    const resolvedUrl = this.resolveUrl(url);
    console.log(`[apiClient] ${method} ${resolvedUrl}`);

    let response: Response;
    try {
      response = await this.fetchWithRetry(
        resolvedUrl,
        {
          credentials: 'include',
          ...requestInit,
          method,
          headers,
        },
        {
          enabled:
            retryOnNetworkError &&
            this.isRetryableMethod(method) &&
            !(requestInit.body instanceof FormData),
        },
      );
    } catch (networkError) {
      throw this.toNetworkApiError(networkError);
    }

    console.log(`[apiClient] 응답 상태: ${response.status} ${response.statusText}`);

    if (response.status === 204) {
      return {} as T;
    }

    const rawBody = await response.text();
    const payload = this.safeParseBody(rawBody);

    // 에러 처리
    if (!response.ok) {
      console.error('[apiClient] 에러 응답 body:', rawBody);
      throw new ApiError(
        this.getErrorMessage(payload),
        response.status,
        this.getErrorCode(payload)
      );
    }

    return payload as T;
  }

  /**
   * GET 요청
   */
  async get<T>(url: string, options?: APIRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 요청
   */
  async post<T>(url: string, body: unknown, options?: APIRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  /**
   * PATCH 요청
   */
  async patch<T>(url: string, body: unknown, options?: APIRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  /**
   * PUT 요청
   */
  async put<T>(url: string, body: unknown, options?: APIRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  /**
   * DELETE 요청
   */
  async delete<T>(url: string, options?: APIRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  private resolveUrl(url: string): string {
    if (/^https?:\/\//.test(url) || !this.baseURL) {
      return url;
    }

    return `${this.baseURL}${url}`;
  }

  private safeParseBody(rawBody: string): unknown {
    if (!rawBody) {
      return null;
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  }

  private isRetryableMethod(method: string): boolean {
    return ['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method);
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retry: { enabled: boolean },
  ): Promise<Response> {
    const maxAttempts = retry.enabled ? 2 : 1;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        const shouldRetry =
          attempt < maxAttempts && this.isRetryableNetworkError(error);
        if (!shouldRetry) {
          break;
        }
        await this.delay(250 * attempt);
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('Network request failed');
  }

  private isRetryableNetworkError(error: unknown): boolean {
    const details = this.extractErrorDetails(error);
    if (/AbortError/i.test(details)) {
      return false;
    }

    return /ERR_NETWORK_CHANGED|Failed to fetch|NetworkError|fetch failed|Network request failed/i.test(
      details,
    );
  }

  private toNetworkApiError(error: unknown): ApiError {
    const details = this.extractErrorDetails(error);
    if (/ERR_NETWORK_CHANGED/i.test(details)) {
      return new ApiError(
        '네트워크 환경이 변경되어 요청이 중단되었습니다. 다시 시도해 주세요.',
        0,
        'NETWORK_CHANGED',
      );
    }

    return new ApiError(
      '네트워크 요청에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.',
      0,
      'NETWORK_ERROR',
    );
  }

  private extractErrorDetails(error: unknown): string {
    if (error instanceof Error) {
      const cause = (error as { cause?: unknown }).cause;
      const causeText =
        cause instanceof Error
          ? `${cause.name} ${cause.message}`
          : typeof cause === 'string'
            ? cause
            : '';
      return `${error.name} ${error.message} ${causeText}`;
    }

    if (typeof error === 'string') {
      return error;
    }

    return '';
  }

  private async delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private getErrorMessage(payload: unknown): string {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return '요청 실패';
  }

  private getErrorCode(payload: unknown): string | undefined {
    if (payload && typeof payload === 'object' && 'errorCode' in payload) {
      const errorCode = (payload as { errorCode?: unknown }).errorCode;
      if (typeof errorCode === 'string' && errorCode.length > 0) {
        return errorCode;
      }
    }

    return undefined;
  }

  private getBrowserSupabaseClient() {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!this.supabaseClient) {
      this.supabaseClient = createClient();
    }

    return this.supabaseClient;
  }

  private async getAccessToken(): Promise<string | null> {
    const supabase = this.getBrowserSupabaseClient();
    if (!supabase) {
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }
}

// Keep browser requests same-origin and route through Next API routes (BFF).
const apiBaseUrl = '';
export const apiClient = new APIClient(apiBaseUrl);
