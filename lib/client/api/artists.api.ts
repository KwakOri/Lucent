/**
 * Artists API Client
 *
 * 아티스트 관련 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse } from '@/types';
import type { Tables } from '@/types/database';

type Artist = Tables<'artists'>;

/**
 * 아티스트 상세 정보 (프로필 이미지 포함)
 */
export interface ArtistWithDetails extends Artist {
  project?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  } | null;
  profile_image?: {
    id: string;
    public_url: string;
    cdn_url?: string | null;
    alt_text: string | null;
  } | null;
}

export interface GetArtistsParams {
  projectId?: string;
  isActive?: 'true' | 'false' | 'all';
}

export interface CreateArtistData {
  name: string;
  slug: string;
  project_id: string;
  profile_image_id?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateArtistData {
  name?: string;
  slug?: string;
  project_id?: string;
  profile_image_id?: string | null;
  description?: string | null;
  is_active?: boolean;
}

/**
 * Artists API
 */
export const ArtistsAPI = {
  /**
   * 아티스트 목록 조회
   */
  async getArtists(
    params?: GetArtistsParams,
  ): Promise<ApiResponse<ArtistWithDetails[]>> {
    const searchParams = new URLSearchParams();

    if (params?.projectId) {
      searchParams.set('projectId', params.projectId);
    }
    if (params?.isActive) {
      searchParams.set('isActive', params.isActive);
    }

    const queryString = searchParams.toString();
    return apiClient.get(`/api/artists${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 아티스트 단일 조회 (ID)
   */
  async getArtistById(id: string): Promise<ApiResponse<ArtistWithDetails>> {
    return apiClient.get(`/api/artists/${id}`);
  },

  /**
   * 아티스트 단일 조회 (Slug)
   */
  async getArtistBySlug(slug: string): Promise<ApiResponse<ArtistWithDetails>> {
    return apiClient.get(`/api/artists/slug/${slug}`);
  },

  /**
   * 아티스트 생성 (관리자)
   */
  async createArtist(data: CreateArtistData): Promise<ApiResponse<Artist>> {
    return apiClient.post('/api/artists', data);
  },

  /**
   * 아티스트 수정 (관리자)
   */
  async updateArtist(
    id: string,
    data: UpdateArtistData,
  ): Promise<ApiResponse<Artist>> {
    return apiClient.patch(`/api/artists/${id}`, data);
  },

  /**
   * 아티스트 삭제 (관리자)
   */
  async deleteArtist(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/artists/${id}`);
  },
};
