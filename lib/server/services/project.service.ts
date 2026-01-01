/**
 * Project Service
 *
 * 프로젝트 관련 비즈니스 로직
 * - 프로젝트 목록/상세 조회
 * - 프로젝트 생성/수정/삭제 (관리자)
 * - 프로젝트 순서 변경 (관리자)
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError, NotFoundError } from '@/lib/server/utils/errors';
import { Tables } from '@/types/database';

type Project = Tables<'projects'>;

export interface ProjectWithDetails extends Project {
  cover_image?: {
    id: string;
    public_url: string;
    cdn_url?: string | null;
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
   * 전체 프로젝트 목록 조회 (관리자용, 비활성 포함)
   */
  static async getAllProjects(): Promise<ProjectWithDetails[]> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        cover_image:images!projects_cover_image_id_fkey (
          id,
          public_url,
          cdn_url,
          alt_text
        )
      `
      )
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

  /**
   * 프로젝트 생성 (관리자)
   */
  static async createProject(
    projectData: {
      name: string;
      slug: string;
      cover_image_id: string;
      description?: string;
      release_date?: string;
      external_links?: {
        youtube?: string;
        spotify?: string;
        other?: string;
      };
      order_index?: number;
      is_active?: boolean;
    },
    adminId: string
  ): Promise<Project> {
    const supabase = await createServerClient();

    // 1. 슬러그 중복 확인
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', projectData.slug)
      .single();

    if (existing) {
      throw new ApiError('이미 사용 중인 슬러그입니다', 409, 'SLUG_ALREADY_EXISTS');
    }

    // 2. 이미지 존재 확인 (선택사항)
    if (projectData.cover_image_id) {
      const { data: image, error: imageError } = await supabase
        .from('images')
        .select('id')
        .eq('id', projectData.cover_image_id)
        .single();

      if (imageError || !image) {
        throw new NotFoundError('이미지를 찾을 수 없습니다', 'IMAGE_NOT_FOUND');
      }
    }

    // 3. 프로젝트 생성
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        slug: projectData.slug,
        cover_image_id: projectData.cover_image_id || null,
        description: projectData.description || null,
        release_date: projectData.release_date || null,
        external_links: projectData.external_links || null,
        order_index: projectData.order_index ?? 0,
        is_active: projectData.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('프로젝트 생성 실패:', error);
      throw new ApiError(`프로젝트 생성 실패: ${error.message}`, 500, 'PROJECT_CREATE_FAILED');
    }

    return data as Project;
  }

  /**
   * 프로젝트 수정 (관리자)
   */
  static async updateProject(
    id: string,
    projectData: {
      name?: string;
      slug?: string;
      cover_image_id?: string;
      description?: string;
      release_date?: string;
      external_links?: {
        youtube?: string;
        spotify?: string;
        other?: string;
      };
      order_index?: number;
      is_active?: boolean;
    },
    adminId: string
  ): Promise<Project> {
    const supabase = await createServerClient();

    // 1. 프로젝트 존재 확인
    const { data: existing, error: existingError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다', 'PROJECT_NOT_FOUND');
    }

    // 2. 슬러그 중복 확인 (슬러그 변경 시)
    if (projectData.slug) {
      const { data: duplicate } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', projectData.slug)
        .neq('id', id)
        .single();

      if (duplicate) {
        throw new ApiError('이미 사용 중인 슬러그입니다', 409, 'SLUG_ALREADY_EXISTS');
      }
    }

    // 3. 이미지 존재 확인 (이미지 변경 시)
    if (projectData.cover_image_id) {
      const { data: image, error: imageError } = await supabase
        .from('images')
        .select('id')
        .eq('id', projectData.cover_image_id)
        .single();

      if (imageError || !image) {
        throw new NotFoundError('이미지를 찾을 수 없습니다', 'IMAGE_NOT_FOUND');
      }
    }

    // 4. 프로젝트 수정
    const updateData: any = {};
    if (projectData.name !== undefined) updateData.name = projectData.name;
    if (projectData.slug !== undefined) updateData.slug = projectData.slug;
    if (projectData.cover_image_id !== undefined) updateData.cover_image_id = projectData.cover_image_id;
    if (projectData.description !== undefined) updateData.description = projectData.description;
    if (projectData.release_date !== undefined) updateData.release_date = projectData.release_date;
    if (projectData.external_links !== undefined) updateData.external_links = projectData.external_links;
    if (projectData.order_index !== undefined) updateData.order_index = projectData.order_index;
    if (projectData.is_active !== undefined) updateData.is_active = projectData.is_active;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError('프로젝트 수정 실패', 500, 'PROJECT_UPDATE_FAILED');
    }

    return data as Project;
  }

  /**
   * 프로젝트 삭제 (소프트 삭제)
   */
  static async deleteProject(id: string, adminId: string): Promise<void> {
    const supabase = await createServerClient();

    // 1. 프로젝트 존재 확인
    const { data: existing, error: existingError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다', 'PROJECT_NOT_FOUND');
    }

    // 2. 소프트 삭제 (is_active = false)
    const { error } = await supabase
      .from('projects')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new ApiError('프로젝트 삭제 실패', 500, 'PROJECT_DELETE_FAILED');
    }
  }

  /**
   * 프로젝트 순서 변경 (관리자)
   */
  static async reorderProjects(
    orders: Array<{ id: string; order_index: number }>,
    adminId: string
  ): Promise<{ count: number }> {
    const supabase = await createServerClient();

    // 1. 모든 프로젝트 존재 확인
    const projectIds = orders.map((o) => o.id);
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id')
      .in('id', projectIds);

    if (fetchError) {
      throw new ApiError('프로젝트 조회 실패', 500, 'PROJECT_FETCH_FAILED');
    }

    if (!projects || projects.length !== projectIds.length) {
      const foundIds = projects?.map((p) => p.id) || [];
      const missingIds = projectIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundError(
        `일부 프로젝트를 찾을 수 없습니다 (누락: ${missingIds.join(', ')})`,
        'PROJECT_NOT_FOUND'
      );
    }

    // 2. 순서 업데이트 (트랜잭션 없이 순차 실행)
    let updatedCount = 0;
    for (const order of orders) {
      const { error } = await supabase
        .from('projects')
        .update({ order_index: order.order_index })
        .eq('id', order.id);

      if (error) {
        throw new ApiError('프로젝트 순서 변경 실패', 500, 'PROJECT_REORDER_FAILED');
      }
      updatedCount++;
    }

    return { count: updatedCount };
  }
}
