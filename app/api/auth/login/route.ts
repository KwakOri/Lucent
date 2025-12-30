/**
 * POST /api/auth/login
 *
 * 로그인 API
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/server/services/auth.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getClientIp } from '@/lib/server/utils/request';
import type { LoginRequest } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LoginRequest;
    const { email, password } = body;

    // 입력 검증
    if (!email || !password) {
      return handleApiError(
        new Error('이메일과 비밀번호를 입력해주세요')
      );
    }

    // 로그인 처리 (로깅 포함)
    const { user, session } = await AuthService.login(
      { email, password },
      getClientIp(request),
      request.headers.get('user-agent') || undefined
    );

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
      },
      session: {
        accessToken: session.access_token,
        expiresAt: session.expires_at,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
