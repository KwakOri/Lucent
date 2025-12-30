/**
 * Project Service
 *
 * 프로젝트 관련 비즈니스 로직
 * - 프로젝트 목록/상세 조회
 * - 프로젝트별 아티스트 목록
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError, NotFoundError } from '@/lib/server/utils/errors';
import { Tables } from '@/types/database';

type Project = Tables<'projects'>;

interface ProjectWithDetails extends Project {
  cover_image?: {
    id: string;
    public_url: string;
    alt_text: string | null;
  };
  artists?: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
}

export class ProjectService {
  /**
   * 프로젝트 목록 조회 (활성화된 것만)
   */
  static async getProjects(): Promise<ProjectWithDetails[]> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        cover_image:images!projects_cover_image_id_fkey (
          id,
          public_url,
          alt_text
        ),
        artists (
          id,
          name,
          slug,
          description
        )
      `
      )
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      throw new ApiError('프로젝트 목록 조회 실패', 500, 'PROJECTS_FETCH_FAILED');
    }

    return data as ProjectWithDetails[];
  }

  /**
   * 프로젝트 상세 조회
   */
  static async getProjectById(id: string): Promise<ProjectWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        cover_image:images!projects_cover_image_id_fkey (
          id,
          public_url,
          alt_text
        ),
        artists (
          id,
          name,
          slug,
          description,
          profile_image:images!artists_profile_image_id_fkey (
            id,
            public_url,
            alt_text
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다', 'PROJECT_NOT_FOUND');
    }

    if (error) {
      throw new ApiError('프로젝트 조회 실패', 500, 'PROJECT_FETCH_FAILED');
    }

    return data as ProjectWithDetails;
  }

  /**
   * Slug로 프로젝트 조회
   */
  static async getProjectBySlug(slug: string): Promise<ProjectWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        cover_image:images!projects_cover_image_id_fkey (
          id,
          public_url,
          alt_text
        ),
        artists (
          id,
          name,
          slug,
          description
        )
      `
      )
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다', 'PROJECT_NOT_FOUND');
    }

    if (error) {
      throw new ApiError('프로젝트 조회 실패', 500, 'PROJECT_FETCH_FAILED');
    }

    return data as ProjectWithDetails;
  }
}
