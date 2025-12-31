/**
 * Project Detail API Routes (Slug-based)
 *
 * GET /api/projects/slug/:slug - 프로젝트 상세 조회 (slug 기반)
 */

import { NextRequest } from 'next/server';
import { ProjectService } from '@/lib/server/services/project.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';

/**
 * 프로젝트 상세 조회 (slug 기반)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const project = await ProjectService.getProjectBySlug(slug);
    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}
