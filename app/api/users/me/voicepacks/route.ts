/**
 * My Voicepacks API
 *
 * GET /api/users/me/voicepacks - 내 보이스팩 목록 조회
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { successResponse, handleApiError } from '@/lib/server/utils/api-response';
import { createServerClient } from '@/lib/server/utils/supabase';
import { AuthorizationError } from '@/lib/server/utils/errors';

/**
 * 내 보이스팩 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthorizationError('로그인이 필요합니다');
    }

    // 내 보이스팩 목록 조회
    const voicepacks = await OrderService.getMyVoicePacks(user.id);

    return successResponse({
      voicepacks,
      total: voicepacks.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
