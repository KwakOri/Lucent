/**
 * Projects Reorder API Routes
 *
 * PATCH /api/projects/reorder - 프로젝트 순서 변경 (관리자)
 */

import { NextRequest } from 'next/server';
import { ProjectService } from '@/lib/server/services/project.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import type { ReorderProjectsRequest } from '@/types/api';

/**
 * 프로젝트 순서 변경 (관리자)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const body = await request.json() as ReorderProjectsRequest;

    const result = await ProjectService.reorderProjects(body.orders, user.id);

    return successResponse({
      message: '프로젝트 순서가 변경되었습니다',
      updated_count: result.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
