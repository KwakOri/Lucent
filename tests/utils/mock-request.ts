/**
 * Mock Request Utilities
 *
 * Next.js API Route 테스트를 위한 요청/응답 모킹 유틸리티
 */

import { NextRequest } from 'next/server';

/**
 * NextRequest 모킹 생성
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  // URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  // Request options
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Add body for POST/PUT/PATCH
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit);
}

/**
 * Supabase 클라이언트 모킹 헬퍼
 */
export function createMockSupabaseClient(overrides = {}) {
  const mockClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockReturnThis(),
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    ...overrides,
  };

  return mockClient;
}

/**
 * 응답 데이터 파싱 헬퍼
 */
export async function parseResponse(response: Response) {
  // Response를 복제하여 여러 번 읽을 수 있도록 함
  const clonedResponse = response.clone();

  try {
    // json() 메소드로 직접 파싱 시도
    const data = await clonedResponse.json();
    return data;
  } catch (error) {
    // JSON 파싱 실패 시 텍스트로 반환
    try {
      const text = await response.text();
      return text;
    } catch {
      return null;
    }
  }
}

/**
 * 응답이 성공인지 확인
 */
export function isSuccessResponse(data: any): boolean {
  return data?.status === 'success';
}

/**
 * 응답이 에러인지 확인
 */
export function isErrorResponse(data: any): boolean {
  return data?.status === 'error';
}
