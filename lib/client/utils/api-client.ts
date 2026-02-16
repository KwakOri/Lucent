/**
 * API Client
 *
 * fetch 기반 HTTP 클라이언트
 */

import { createClient } from '@/utils/supabase/client';
import { ApiError } from './api-error';

interface APIRequestOptions extends RequestInit {
  requiresAuth?: boolean;
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
    const { requiresAuth = true, headers: customHeaders, ...requestInit } = options;
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

    const response = await fetch(this.resolveUrl(url), {
      credentials: 'include',
      ...requestInit,
      headers,
    });

    if (response.status === 204) {
      return {} as T;
    }

    const rawBody = await response.text();
    const payload = this.safeParseBody(rawBody);

    // 에러 처리
    if (!response.ok) {
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

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';
export const apiClient = new APIClient(backendBaseUrl);
