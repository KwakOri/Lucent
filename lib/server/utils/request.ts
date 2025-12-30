/**
 * Request Utilities
 *
 * Next.js Request 관련 유틸리티
 */

import { NextRequest } from 'next/server';

/**
 * Request에서 IP 주소 추출
 *
 * Next.js 16+에서는 request.ip가 없으므로 헤더에서 추출
 */
export function getClientIp(request: NextRequest): string | undefined {
  // Vercel/CloudFlare/AWS 등의 프록시 헤더에서 IP 추출
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 로컬 개발 환경에서는 undefined 반환
  return undefined;
}
