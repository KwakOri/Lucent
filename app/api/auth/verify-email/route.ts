/**
 * GET /api/auth/verify-email
 *
 * 이메일 링크 클릭 인증 API (Signup v2)
 * - 이메일에서 링크 클릭 시 호출됨
 * - 검증 성공 시 회원가입 완료 페이지로 리디렉트
 * - 검증 실패 시 로그인 페이지로 리디렉트 (에러 메시지 포함)
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmailVerificationService } from '@/lib/server/services/email-verification.service';
import { LogService } from '@/lib/server/services/log.service';
import { getClientIp } from '@/lib/server/utils/request';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // 1. 입력 검증
    if (!token) {
      const redirectUrl = new URL('/signup', request.url);
      redirectUrl.searchParams.set('error', 'no_token');
      redirectUrl.searchParams.set('message', '인증 토큰이 없습니다. 다시 시도해주세요.');
      return NextResponse.redirect(redirectUrl);
    }

    // 2. 토큰 검증
    const verification = await EmailVerificationService.verifyToken(token);

    // 3. 로그 기록
    const clientIp = getClientIp(request);
    await LogService.log({
      category: 'auth',
      action: 'verify_email_link',
      description: `이메일 링크 인증 성공: ${verification.email}`,
      metadata: { email: verification.email, token },
      ip_address: clientIp,
    });

    // 4. 회원가입 완료 페이지로 리디렉트 (토큰 포함)
    const redirectUrl = new URL('/signup/complete', request.url);
    redirectUrl.searchParams.set('verified', 'true');
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    // 로그 기록
    const clientIp = getClientIp(request);
    await LogService.log({
      category: 'auth',
      action: 'verify_email_link',
      description: `이메일 링크 인증 실패: ${error.message}`,
      metadata: { error: error.message },
      ip_address: clientIp,
      severity: 'error',
    });

    // 실패 시 회원가입 페이지로 리디렉트 (에러 메시지 포함)
    const redirectUrl = new URL('/signup', request.url);
    redirectUrl.searchParams.set('error', 'invalid_token');
    redirectUrl.searchParams.set('message', error.message || '인증 링크가 유효하지 않습니다.');
    return NextResponse.redirect(redirectUrl);
  }
}
