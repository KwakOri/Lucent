/**
 * Projects API Routes
 *
 * GET /api/projects - 프로젝트 목록 조회
 * POST /api/projects - 프로젝트 생성 (관리자)
 */

import { NextRequest } from 'next/server';
import { ProjectService } from '@/lib/server/services/project.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import type { CreateProjectRequest } from '@/types/api';

/**
 * 프로젝트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const projects = await ProjectService.getProjects();
    return successResponse(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 프로젝트 생성 (관리자)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const body = await request.json() as CreateProjectRequest;

    const project = await ProjectService.createProject(body, user.id);

    return successResponse(project, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
