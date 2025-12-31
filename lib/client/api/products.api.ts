/**
 * Products API Client
 *
 * 상품 관련 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { Tables } from '@/types/database';

type Product = Tables<'products'>;

/**
 * 상품 목록 조회 파라미터
 */
export interface GetProductsParams {
  page?: number;
  limit?: number;
  artistId?: string;
  type?: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
  isActive?: boolean;
  sortBy?: 'created_at' | 'price' | 'name';
  order?: 'asc' | 'desc';
}

/**
 * 상품 상세 정보 (이미지, 아티스트 포함)
 */
export interface ProductWithDetails extends Product {
  artist?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  main_image?: {
    id: string;
    public_url: string;
    alt_text: string | null;
  } | null;
  gallery_images?: Array<{
    display_order: number;
    image: {
      id: string;
      public_url: string;
      alt_text: string | null;
    } | null;
  }>;
}

/**
 * Products API
 */
export const ProductsAPI = {
  /**
   * 상품 목록 조회
   */
  async getProducts(params?: GetProductsParams): Promise<PaginatedResponse<ProductWithDetails>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.artistId) searchParams.set('artistId', params.artistId);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const queryString = searchParams.toString();
    return apiClient.get(`/api/products${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 상품 단일 조회 (ID)
   */
  async getProduct(id: string): Promise<ApiResponse<ProductWithDetails>> {
    return apiClient.get(`/api/products/${id}`);
  },

  /**
   * 상품 단일 조회 (Slug)
   */
  async getProductBySlug(slug: string): Promise<ApiResponse<ProductWithDetails>> {
    return apiClient.get(`/api/products/slug/${slug}`);
  },
};
