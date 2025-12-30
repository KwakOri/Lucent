/**
 * Artist Service
 *
 * 아티스트 관련 비즈니스 로직
 * - 아티스트 목록/상세 조회
 * - 아티스트별 상품 목록
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError, NotFoundError } from '@/lib/server/utils/errors';
import { Tables } from '@/types/database';

type Artist = Tables<'artists'>;

interface ArtistWithDetails extends Artist {
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  profile_image?: {
    id: string;
    public_url: string;
    alt_text: string | null;
  };
}

export class ArtistService {
  /**
   * 아티스트 목록 조회
   */
  static async getArtists(): Promise<ArtistWithDetails[]> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('artists')
      .select(
        `
        *,
        project:projects!artists_project_id_fkey (
          id,
          name,
          slug
        ),
        profile_image:images!artists_profile_image_id_fkey (
          id,
          public_url,
          alt_text
        )
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError('아티스트 목록 조회 실패', 500, 'ARTISTS_FETCH_FAILED');
    }

    return data as ArtistWithDetails[];
  }

  /**
   * 아티스트 상세 조회
   */
  static async getArtistById(id: string): Promise<ArtistWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('artists')
      .select(
        `
        *,
        project:projects!artists_project_id_fkey (
          id,
          name,
          slug,
          description
        ),
        profile_image:images!artists_profile_image_id_fkey (
          id,
          public_url,
          alt_text
        )
      `
      )
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('아티스트를 찾을 수 없습니다', 'ARTIST_NOT_FOUND');
    }

    if (error) {
      throw new ApiError('아티스트 조회 실패', 500, 'ARTIST_FETCH_FAILED');
    }

    return data as ArtistWithDetails;
  }

  /**
   * Slug로 아티스트 조회
   */
  static async getArtistBySlug(slug: string): Promise<ArtistWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('artists')
      .select(
        `
        *,
        project:projects!artists_project_id_fkey (
          id,
          name,
          slug
        ),
        profile_image:images!artists_profile_image_id_fkey (
          id,
          public_url,
          alt_text
        )
      `
      )
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('아티스트를 찾을 수 없습니다', 'ARTIST_NOT_FOUND');
    }

    if (error) {
      throw new ApiError('아티스트 조회 실패', 500, 'ARTIST_FETCH_FAILED');
    }

    return data as ArtistWithDetails;
  }
}
