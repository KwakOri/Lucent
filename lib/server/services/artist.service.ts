/**
 * Artist Service
 *
 * 아티스트 관련 비즈니스 로직
 * - 아티스트 목록/상세 조회
 * - 아티스트 생성/수정/삭제 (관리자)
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
   * 아티스트 목록 조회 (활성화된 것만)
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
   * 전체 아티스트 목록 조회 (관리자용, 비활성 포함)
   */
  static async getAllArtists(): Promise<ArtistWithDetails[]> {
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
          cdn_url,
          alt_text
        )
      `
      )
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

  /**
   * 아티스트 생성 (관리자)
   */
  static async createArtist(
    artistData: {
      name: string;
      slug: string;
      project_id: string;
      profile_image_id: string;
      description?: string;
      is_active?: boolean;
    },
    adminId: string
  ): Promise<Artist> {
    const supabase = await createServerClient();

    // 1. 슬러그 중복 확인
    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .eq('slug', artistData.slug)
      .single();

    if (existing) {
      throw new ApiError('이미 사용 중인 슬러그입니다', 409, 'SLUG_ALREADY_EXISTS');
    }

    // 2. 프로젝트 존재 확인
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', artistData.project_id)
      .single();

    if (projectError || !project) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다', 'PROJECT_NOT_FOUND');
    }

    // 3. 이미지 존재 확인 (선택사항)
    if (artistData.profile_image_id) {
      const { data: image, error: imageError } = await supabase
        .from('images')
        .select('id')
        .eq('id', artistData.profile_image_id)
        .single();

      if (imageError || !image) {
        throw new NotFoundError('이미지를 찾을 수 없습니다', 'IMAGE_NOT_FOUND');
      }
    }

    // 4. 아티스트 생성
    const { data, error } = await supabase
      .from('artists')
      .insert({
        name: artistData.name,
        slug: artistData.slug,
        project_id: artistData.project_id,
        profile_image_id: artistData.profile_image_id || null,
        description: artistData.description || null,
        is_active: artistData.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError('아티스트 생성 실패', 500, 'ARTIST_CREATE_FAILED');
    }

    return data as Artist;
  }

  /**
   * 아티스트 수정 (관리자)
   */
  static async updateArtist(
    id: string,
    artistData: {
      name?: string;
      slug?: string;
      project_id?: string;
      profile_image_id?: string;
      description?: string;
      is_active?: boolean;
    },
    adminId: string
  ): Promise<Artist> {
    const supabase = await createServerClient();

    // 1. 아티스트 존재 확인
    const { data: existing, error: existingError } = await supabase
      .from('artists')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError('아티스트를 찾을 수 없습니다', 'ARTIST_NOT_FOUND');
    }

    // 2. 슬러그 중복 확인 (슬러그 변경 시)
    if (artistData.slug) {
      const { data: duplicate } = await supabase
        .from('artists')
        .select('id')
        .eq('slug', artistData.slug)
        .neq('id', id)
        .single();

      if (duplicate) {
        throw new ApiError('이미 사용 중인 슬러그입니다', 409, 'SLUG_ALREADY_EXISTS');
      }
    }

    // 3. 프로젝트 존재 확인 (프로젝트 변경 시)
    if (artistData.project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', artistData.project_id)
        .single();

      if (projectError || !project) {
        throw new NotFoundError('프로젝트를 찾을 수 없습니다', 'PROJECT_NOT_FOUND');
      }
    }

    // 4. 이미지 존재 확인 (이미지 변경 시)
    if (artistData.profile_image_id) {
      const { data: image, error: imageError } = await supabase
        .from('images')
        .select('id')
        .eq('id', artistData.profile_image_id)
        .single();

      if (imageError || !image) {
        throw new NotFoundError('이미지를 찾을 수 없습니다', 'IMAGE_NOT_FOUND');
      }
    }

    // 5. 아티스트 수정
    const updateData: any = {};
    if (artistData.name !== undefined) updateData.name = artistData.name;
    if (artistData.slug !== undefined) updateData.slug = artistData.slug;
    if (artistData.project_id !== undefined) updateData.project_id = artistData.project_id;
    if (artistData.profile_image_id !== undefined) updateData.profile_image_id = artistData.profile_image_id;
    if (artistData.description !== undefined) updateData.description = artistData.description;
    if (artistData.is_active !== undefined) updateData.is_active = artistData.is_active;

    const { data, error } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError('아티스트 수정 실패', 500, 'ARTIST_UPDATE_FAILED');
    }

    return data as Artist;
  }

  /**
   * 아티스트 삭제 (소프트 삭제)
   */
  static async deleteArtist(id: string, adminId: string): Promise<void> {
    const supabase = await createServerClient();

    // 1. 아티스트 존재 확인
    const { data: existing, error: existingError } = await supabase
      .from('artists')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError('아티스트를 찾을 수 없습니다', 'ARTIST_NOT_FOUND');
    }

    // 2. 소프트 삭제 (is_active = false)
    const { error } = await supabase
      .from('artists')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new ApiError('아티스트 삭제 실패', 500, 'ARTIST_DELETE_FAILED');
    }
  }

  /**
   * 아티스트 통계 조회 (관리자용)
   */
  static async getArtistsStats(): Promise<{
    activeArtists: number;
  }> {
    const supabase = await createServerClient();

    const { count, error } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      throw new ApiError('아티스트 통계 조회 실패', 500, 'ARTISTS_STATS_FETCH_FAILED');
    }

    return {
      activeArtists: count || 0,
    };
  }
}
