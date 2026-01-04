/**
 * POST /api/auth/send-verification
 *
 * 이메일 인증 코드 발송 API (Signup v2)
 * - 회원가입 시 이메일 인증 코드 (6자리) + 링크 발송
 * - 재발송 시 60초 쿨타임 적용
 */

import { EmailVerificationService } from "@/lib/server/services/email-verification.service";
import { LogService } from "@/lib/server/services/log.service";
import {
  handleApiError,
  successResponse,
} from "@/lib/server/utils/api-response";
import { getClientIp } from "@/lib/server/utils/request";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. 입력값 검증
    if (!email || !password) {
      return handleApiError(new Error("이메일과 비밀번호를 입력해주세요"), 400);
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return handleApiError(
        new Error("올바른 이메일 형식을 입력해주세요"),
        400
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return handleApiError(
        new Error("비밀번호는 최소 6자 이상이어야 합니다"),
        400
      );
    }

    // 2. 재발송 쿨타임 확인 (60초)
    const canResend = await EmailVerificationService.checkResendCooldown(email);
    if (!canResend) {
      return handleApiError(
        new Error(
          "이메일 재발송은 60초 후에 가능합니다. 잠시 후 다시 시도해주세요."
        ),
        429
      );
    }

    // 3. 인증 코드 생성 및 이메일 발송
    await EmailVerificationService.createVerification({
      email,
      password,
      purpose: "signup",
    });

    // 4. 로그 기록
    const clientIp = getClientIp(request);
    await LogService.log({
      eventType: "EMAIL_VERIFICATION_SENT",
      eventCategory: "auth",
      message: `인증 코드 발송 성공: ${email}`,
      metadata: { email },
      ipAddress: clientIp,
    });

    // 5. 성공 응답
    return successResponse(
      {
        email,
        expiresIn: 600, // 10분 (초 단위)
      },
      "인증 코드가 이메일로 발송되었습니다"
    );
  } catch (error: any) {
    // 로그 기록
    const body = await request.json().catch(() => ({}));
    const clientIp = getClientIp(request);
    await LogService.log({
      eventType: "EMAIL_VERIFICATION_FAILED",
      eventCategory: "auth",
      message: `인증 코드 발송 실패: ${error.message}`,
      metadata: { email: body.email, error: error.message },
      ipAddress: clientIp,
      severity: "error",
    });

    return handleApiError(error);
  }
}
