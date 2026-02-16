/**
 * Cart Hooks
 *
 * backend API 기반 장바구니 hooks
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CartAPI,
  type AddToCartRequest,
  type CartItemWithProduct,
  type CartResponseData,
  type UpdateCartItemRequest,
} from '@/lib/client/api/cart.api';

/**
 * 장바구니 조회 Hook
 */
export function useCart() {
  return useQuery<CartResponseData>({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await CartAPI.getCart();
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * 장바구니 아이템 개수 조회 Hook
 */
export function useCartCount() {
  return useQuery<number>({
    queryKey: ['cart', 'count'],
    queryFn: async () => {
      const response = await CartAPI.getCartCount();
      return response.data.count || 0;
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}

/**
 * 장바구니에 상품 추가 Hook
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product_id, quantity = 1 }: AddToCartRequest) => {
      const response = await CartAPI.addItem({ product_id, quantity });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] });
    },
  });
}

/**
 * 장바구니 아이템 수량 변경 Hook
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item_id, quantity }: UpdateCartItemRequest) => {
      const response = await CartAPI.updateItem({ item_id, quantity });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] });
    },
  });
}

/**
 * 장바구니 아이템 삭제 Hook
 */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      await CartAPI.removeItem(itemId);
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] });
    },
  });
}

/**
 * 장바구니 비우기 Hook
 */
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await CartAPI.clearCart();
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] });
    },
  });
}

export type { CartItemWithProduct };
