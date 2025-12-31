/**
 * Artists API Routes
 *
 * GET /api/artists - 아티스트 목록 조회
 * POST /api/artists - 아티스트 생성 (관리자)
 */

import { NextRequest } from 'next/server';
import { ArtistService } from '@/lib/server/services/artist.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import type { CreateArtistRequest } from '@/types/api';

/**
 * 아티스트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const artists = await ArtistService.getArtists();
    return successResponse(artists);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 아티스트 생성 (관리자)
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

    const body = await request.json() as CreateArtistRequest;

    const artist = await ArtistService.createArtist(body, user.id);

    return successResponse(artist, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
