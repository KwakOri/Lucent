/**
 * Product API Hooks
 *
 * 상품 관련 React Query hooks
 */

'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ProductsAPI } from '@/lib/client/api/products.api';
import type { GetProductsParams } from '@/lib/client/api/products.api';
import { queryKeys } from './query-keys';

/**
 * 상품 목록 조회 Hook
 */
export function useProducts(params?: GetProductsParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => ProductsAPI.getProducts(params),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 상품 상세 조회 Hook
 */
export function useProduct(productId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId || ''),
    queryFn: async () => {
      const response = await ProductsAPI.getProduct(productId!);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Slug로 상품 조회 Hook
 */
export function useProductBySlug(slug: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.bySlug(slug || ''),
    queryFn: async () => {
      const response = await ProductsAPI.getProductBySlug(slug!);
      return response.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * 샘플 오디오 재생 Hook (Mutation)
 */
export function usePlaySample() {
  return useMutation({
    mutationFn: async (productId: string) => {
      const blob = await ProductsAPI.getSampleAudio(productId);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      return { audio, url };
    },
  });
}

/**
 * 프로젝트별 상품 목록 조회 Hook (편의 함수)
 */
export function useMiruruProducts(projectId?: string) {
  const { data, isLoading, error } = useProducts({
    projectId,
    isActive: 'true',
  });

  const products = data?.data || [];

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
