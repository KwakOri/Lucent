/**
 * OAuth Callback API
 *
 * POST /api/auth/oauth/callback
 *
 * OAuth 인증 완료 후 프로필 자동 생성/확인
 * - 프론트엔드에서 OAuth 완료 후 호출
 * - 신규 사용자: 프로필 자동 생성
 * - 기존 사용자: 프로필 로드
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/utils/supabase';
import { OAuthService } from '@/lib/server/services/oauth.service';
import { handleApiError } from '@/lib/server/utils/api-response';

/**
 * OAuth 콜백 처리
 *
 * @route POST /api/auth/oauth/callback
 * @access Private (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          status: 'error',
          message: '로그인이 필요합니다',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // OAuth 프로필 처리 (자동 생성 또는 로드)
    const result = await OAuthService.handleOAuthCallback(user);

    return NextResponse.json({
      status: 'success',
      data: result,
      message: result.isNewUser
        ? 'Google 로그인 성공 (새 계정 생성)'
        : 'Google 로그인 성공',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
