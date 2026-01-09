/**
 * GET /api/auth/session
 *
 * 세션 확인 API
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/server/services/auth.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { isAdmin } from '@/lib/server/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const sessionData = await AuthService.getSession();

    if (!sessionData) {
      return successResponse(null);
    }

    // 관리자 권한 확인
    const isUserAdmin = await isAdmin();

    return successResponse({
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.user_metadata?.name,
      },
      isAdmin: isUserAdmin,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
