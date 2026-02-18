/**
 * Projects API Client
 *
 * 프로젝트 관련 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse, Tables } from '@/types';

type Project = Tables<'projects'>;

export interface ProjectWithDetails extends Project {
  cover_image?: {
    id: string;
    public_url: string;
    cdn_url?: string | null;
    alt_text?: string | null;
  } | null;
  artists?: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  }>;
}

export interface GetProjectsParams {
  isActive?: 'true' | 'false' | 'all';
}

export interface CreateProjectData {
  name: string;
  slug: string;
  cover_image_id?: string | null;
  description?: string | null;
  release_date?: string | null;
  external_links?: {
    youtube?: string;
    spotify?: string;
    other?: string;
  } | null;
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateProjectData {
  name?: string;
  slug?: string;
  cover_image_id?: string | null;
  description?: string | null;
  release_date?: string | null;
  external_links?: {
    youtube?: string;
    spotify?: string;
    other?: string;
  } | null;
  order_index?: number;
  is_active?: boolean;
}

export interface ReorderProjectsData {
  orders: Array<{
    id: string;
    order_index: number;
  }>;
}

export interface ReorderProjectsResult {
  message: string;
  updated_count: number;
}

/**
 * Projects API
 */
export const ProjectsAPI = {
  /**
   * 프로젝트 목록 조회
   */
  async getProjects(
    params?: GetProjectsParams,
  ): Promise<ApiResponse<ProjectWithDetails[]>> {
    const searchParams = new URLSearchParams();

    if (params?.isActive) {
      searchParams.set('isActive', params.isActive);
    }

    const queryString = searchParams.toString();
    const url = `/api/projects${queryString ? `?${queryString}` : ''}`;
    console.log('[ProjectsAPI.getProjects] 요청 URL:', url);
    const result = await apiClient.get<ApiResponse<ProjectWithDetails[]>>(url);
    console.log('[ProjectsAPI.getProjects] 응답:', result);
    return result;
  },

  /**
   * 프로젝트 단일 조회 (ID)
   */
  async getProject(id: string): Promise<ApiResponse<ProjectWithDetails>> {
    return apiClient.get(`/api/projects/${id}`);
  },

  /**
   * 프로젝트 단일 조회 (Slug)
   */
  async getProjectBySlug(slug: string): Promise<ApiResponse<ProjectWithDetails>> {
    return apiClient.get(`/api/projects/slug/${slug}`);
  },

  /**
   * 프로젝트 생성 (관리자)
   */
  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    return apiClient.post('/api/projects', data);
  },

  /**
   * 프로젝트 수정 (관리자)
   */
  async updateProject(
    id: string,
    data: UpdateProjectData,
  ): Promise<ApiResponse<Project>> {
    return apiClient.patch(`/api/projects/${id}`, data);
  },

  /**
   * 프로젝트 삭제 (관리자)
   */
  async deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/projects/${id}`);
  },

  /**
   * 프로젝트 순서 변경 (관리자)
   */
  async reorderProjects(
    data: ReorderProjectsData,
  ): Promise<ApiResponse<ReorderProjectsResult>> {
    return apiClient.patch('/api/projects/reorder', data);
  },
};
