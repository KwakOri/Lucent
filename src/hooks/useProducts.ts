/**
 * Product API Hooks
 *
 * 상품 관련 React Query hooks
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Tables,
  GetProductsQuery,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

/**
 * 상품 목록 조회 Hook
 *
 * @example
 * const { data, isLoading } = useProducts({ projectId: 'project-id', type: 'VOICE_PACK' });
 */
export function useProducts(params?: GetProductsQuery) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(
        Object.entries(params || {}).filter(([_, v]) => v !== undefined)
      );
      const response = await fetch(`/api/products?${searchParams}`);
      if (!response.ok) {
        throw new Error('상품 목록 조회 실패');
      }
      const data: PaginatedResponse<Tables<'products'>> = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5분 (상품 정보는 자주 변경되지 않음)
  });
}

/**
 * 상품 상세 조회 Hook
 *
 * @example
 * const { data, isLoading } = useProduct('product-id');
 */
export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: ['products', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        throw new Error('상품 조회 실패');
      }
      const data: ApiResponse<Tables<'products'>> = await response.json();
      return data.data;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 10, // 10분 (상세 정보는 더 길게 캐시)
  });
}

/**
 * Slug로 상품 조회 Hook
 *
 * @example
 * const { data, isLoading } = useProductBySlug('miruru-voice-pack-1');
 */
export function useProductBySlug(slug: string | null) {
  return useQuery({
    queryKey: ['products', 'slug', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      const response = await fetch(`/api/products/slug/${slug}`);
      if (!response.ok) {
        throw new Error('상품 조회 실패');
      }
      const data: ApiResponse<Tables<'products'>> = await response.json();
      return data.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10분
  });
}

/**
 * 샘플 오디오 재생 Hook (Mutation)
 *
 * @example
 * const { mutate: playSample } = usePlaySample();
 * playSample('product-id');
 */
export function usePlaySample() {
  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/products/${productId}/sample`);
      if (!response.ok) {
        throw new Error('샘플 재생 실패');
      }
      // Blob으로 받아서 Audio 객체로 재생
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      return { audio, url };
    },
  });
}

/**
 * 프로젝트별 상품 목록 조회 Hook (편의 함수)
 *
 * @example
 * const { voicePacks, physicalGoods, isLoading } = useMiruruProducts('project-id');
 */
export function useMiruruProducts(projectId?: string) {
  const { data, isLoading, error } = useProducts({
    projectId,
    isActive: 'true',
  });

  const products = data?.data || [];

  // 타입별로 분리
  const voicePacks = products.filter((p) => p.type === 'VOICE_PACK');
  const physicalGoods = products.filter((p) => p.type === 'PHYSICAL_GOODS');

  return {
    voicePacks,
    physicalGoods,
    allProducts: products,
    pagination: data?.pagination,
    isLoading,
    error,
  };
}
