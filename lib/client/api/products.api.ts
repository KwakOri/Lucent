/**
 * Products API Client
 *
 * 상품 관련 API 호출
 */

import { ApiError } from '@/lib/client/utils/api-error';
import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse, Enums, PaginatedResponse, Tables } from '@/types';

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;

export interface ProductWithDetails extends Product {
  project?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  main_image?: {
    id: string;
    r2_key: string;
    public_url: string;
    cdn_url: string | null;
    alt_text: string | null;
  } | null;
  gallery_images?: Array<{
    display_order: number;
    image: {
      id: string;
      r2_key: string;
      public_url: string;
      cdn_url: string | null;
      alt_text: string | null;
    } | null;
  }>;
}

export interface GetProductsParams {
  ids?: string;
  page?: string | number;
  limit?: string | number;
  projectId?: string;
  type?: ProductType;
  isActive?: 'true' | 'false' | 'all';
  sortBy?: 'created_at' | 'price' | 'name';
  order?: 'asc' | 'desc';
}

export type CreateProductData = {
  name: string;
  slug: string;
  type: ProductType;
  project_id: string;
  main_image_id?: string | null;
  price: number;
  description?: string | null;
  stock?: number | null;
  sample_audio_url?: string | null;
  digital_file_url?: string | null;
  is_active?: boolean;
};

export type UpdateProductData = {
  name?: string;
  slug?: string;
  type?: ProductType;
  project_id?: string;
  main_image_id?: string | null;
  price?: number;
  description?: string | null;
  stock?: number | null;
  sample_audio_url?: string | null;
  digital_file_url?: string | null;
  is_active?: boolean;
};

function resolveApiUrl(path: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_API_URL || '').replace(
    /\/$/,
    '',
  );
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path}`;
}

/**
 * Products API
 */
export const ProductsAPI = {
  /**
   * 상품 목록 조회
   */
  async getProducts(
    params?: GetProductsParams,
  ): Promise<PaginatedResponse<ProductWithDetails>> {
    const searchParams = new URLSearchParams();

    if (params?.ids) searchParams.set('ids', params.ids);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.isActive) searchParams.set('isActive', params.isActive);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);

    const queryString = searchParams.toString();
    return apiClient.get(`/api/products${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 상품 상세 조회 (ID)
   */
  async getProduct(
    id: string,
    options?: { includePrivate?: boolean },
  ): Promise<ApiResponse<ProductWithDetails>> {
    const searchParams = new URLSearchParams();
    if (options?.includePrivate) {
      searchParams.set('includePrivate', 'true');
    }

    const queryString = searchParams.toString();
    return apiClient.get(`/api/products/${id}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 상품 상세 조회 (Slug)
   */
  async getProductBySlug(slug: string): Promise<ApiResponse<ProductWithDetails>> {
    return apiClient.get(`/api/products/slug/${slug}`);
  },

  /**
   * 상품 샘플 오디오 조회 (Blob)
   */
  async getSampleAudio(id: string): Promise<Blob> {
    const response = await fetch(resolveApiUrl(`/api/products/${id}/sample`));
    if (!response.ok) {
      throw new ApiError('샘플 재생 실패', response.status);
    }

    return response.blob();
  },

  /**
   * 상품 생성 (관리자)
   */
  async createProduct(data: CreateProductData): Promise<ApiResponse<Product>> {
    return apiClient.post('/api/products', data);
  },

  /**
   * 상품 수정 (관리자)
   */
  async updateProduct(
    id: string,
    data: UpdateProductData,
  ): Promise<ApiResponse<Product>> {
    return apiClient.patch(`/api/products/${id}`, data);
  },

  /**
   * 상품 삭제 (관리자)
   */
  async deleteProduct(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/products/${id}`);
  },
};
