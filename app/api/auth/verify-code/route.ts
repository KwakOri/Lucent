/**
 * POST /api/auth/verify-code
 *
 * 이메일 인증 코드 검증 API (Signup v2)
 * - 6자리 코드 입력으로 이메일 인증
 * - 검증 성공 시 토큰 반환 (회원가입 API에서 사용)
 */

import { NextRequest } from 'next/server';
import { EmailVerificationService } from '@/lib/server/services/email-verification.service';
import { LogService } from '@/lib/server/services/log.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getClientIp } from '@/lib/server/utils/request';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    console.log('[DEBUG] verify-code - Request:', { email, code });

    // 1. 입력값 검증
    if (!email || !code) {
      return handleApiError(new Error('이메일과 인증 코드를 입력해주세요'), 400);
    }

    // 코드 형식 검증 (6자리 숫자)
    if (!/^\d{6}$/.test(code)) {
      return handleApiError(new Error('올바른 인증 코드를 입력해주세요 (6자리 숫자)'), 400);
    }

    // 2. 코드 검증
    const verificationToken = await EmailVerificationService.verifyCode({ email, code });

    console.log('[DEBUG] verify-code - Success:', {
      email,
      tokenLength: verificationToken.length,
      tokenPrefix: verificationToken.substring(0, 8)
    });

    // 3. 로그 기록
    const clientIp = getClientIp(request);
    await LogService.log({
      eventType: 'EMAIL_CODE_VERIFIED',
      eventCategory: 'auth',
      message: `이메일 인증 코드 검증 성공: ${email}`,
      metadata: { email },
      ipAddress: clientIp,
    });

    // 4. 성공 응답
    return successResponse(
      {
        token: verificationToken,
      },
      '이메일 인증이 완료되었습니다'
    );
  } catch (error: any) {
    // 로그 기록
    const body = await request.json().catch(() => ({}));
    const clientIp = getClientIp(request);
    await LogService.log({
      eventType: 'EMAIL_CODE_VERIFY_FAILED',
      eventCategory: 'auth',
      message: `이메일 인증 코드 검증 실패: ${error.message}`,
      metadata: { email: body.email, error: error.message },
      ipAddress: clientIp,
      severity: 'error',
    });

    return handleApiError(error);
  }
}
