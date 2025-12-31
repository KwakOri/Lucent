/**
 * Artist Detail API Routes (Slug-based)
 *
 * GET /api/artists/slug/:slug - 아티스트 상세 조회 (slug 기반)
 */

import { NextRequest } from 'next/server';
import { ArtistService } from '@/lib/server/services/artist.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';

/**
 * 아티스트 상세 조회 (slug 기반)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const artist = await ArtistService.getArtistBySlug(slug);
    return successResponse(artist);
  } catch (error) {
    return handleApiError(error);
  }
}
