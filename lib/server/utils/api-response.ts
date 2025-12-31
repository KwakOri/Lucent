/**
 * API Response Utilities
 *
 * 일관된 API 응답 형식을 위한 유틸리티
 */

import { NextResponse } from 'next/server';
import { ApiError } from './errors';

/**
 * 성공 응답
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
) {
  return NextResponse.json(
    {
      status: 'success',
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * 페이지네이션 응답
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    total: number;
    page: number;
    limit: number;
  },
  status: number = 200
) {
  return NextResponse.json(
    {
      status: 'success',
      data,
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    },
    { status }
  );
}

/**
 * 에러 응답
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  errorCode: string = 'INTERNAL_ERROR'
) {
  return NextResponse.json(
    {
      status: 'error',
      message,
      errorCode,
    },
    { status: statusCode }
  );
}

/**
 * API 에러 핸들러
 *
 * try-catch의 catch 블록에서 사용
 */
export function handleApiError(error: unknown, defaultStatusCode?: number) {
  console.error('[API Error]:', error);

  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, error.errorCode);
  }

  if (error instanceof Error) {
    return errorResponse(error.message, defaultStatusCode || 500, 'INTERNAL_ERROR');
  }

  return errorResponse('알 수 없는 오류가 발생했습니다', defaultStatusCode || 500, 'UNKNOWN_ERROR');
}
