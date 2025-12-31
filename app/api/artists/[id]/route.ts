/**
 * Artist Detail API Routes
 *
 * GET /api/artists/:id - 아티스트 상세 조회
 * PATCH /api/artists/:id - 아티스트 수정 (관리자)
 * DELETE /api/artists/:id - 아티스트 삭제 (관리자)
 */

import { NextRequest } from 'next/server';
import { ArtistService } from '@/lib/server/services/artist.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import type { UpdateArtistRequest } from '@/types/api';

/**
 * 아티스트 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artist = await ArtistService.getArtistById(id);

    return successResponse(artist);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 아티스트 수정 (관리자)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const body = await request.json() as UpdateArtistRequest;
    const { id } = await params;

    const artist = await ArtistService.updateArtist(id, body, user.id);

    return successResponse(artist);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 아티스트 삭제 (관리자)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const { id } = await params;

    await ArtistService.deleteArtist(id, user.id);

    return successResponse({ message: '아티스트가 삭제되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
