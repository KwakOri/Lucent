/**
 * Cart Hooks (localStorage 기반)
 *
 * 장바구니 관련 hooks - localStorage를 사용하여 클라이언트 사이드에서 관리
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import type { ApiResponse } from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * localStorage에 저장되는 장바구니 아이템
 */
interface LocalCartItem {
  product_id: string;
  quantity: number;
  added_at: string; // ISO string
}

/**
 * Product 정보 (API에서 가져온 데이터)
 */
interface Product {
  id: string;
  name: string;
  price: number;
  type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
  stock: number | null;
  main_image?: {
    cdn_url?: string;
    public_url?: string;
    alt_text?: string;
  };
}

/**
 * Product 정보가 포함된 장바구니 아이템
 */
export interface CartItemWithProduct extends LocalCartItem {
  id: string; // product_id를 id로 사용
  product: Product;
}

/**
 * 장바구니 응답 데이터
 */
interface CartResponse {
  items: CartItemWithProduct[];
  count: number;
  totalPrice: number;
}

interface AddToCartRequest {
  product_id: string;
  quantity?: number;
}

interface UpdateCartItemRequest {
  item_id: string; // product_id
  quantity: number;
}

// ============================================================================
// LocalStorage Utils
// ============================================================================

const CART_STORAGE_KEY = 'vshop_cart';

/**
 * localStorage에서 장바구니 데이터 읽기
 */
function getLocalCart(): LocalCartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read cart from localStorage:', error);
    return [];
  }
}

/**
 * localStorage에 장바구니 데이터 저장
 */
function setLocalCart(items: LocalCartItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

/**
 * 여러 상품 정보를 한번에 가져오기
 */
async function fetchProducts(productIds: string[]): Promise<Product[]> {
  if (productIds.length === 0) return [];

  const response = await fetch(`/api/products?ids=${productIds.join(',')}`);
  if (!response.ok) {
    throw new Error('상품 정보 조회 실패');
  }

  const data: ApiResponse<Product[]> = await response.json();
  return data.data || [];
}

/**
 * localStorage 장바구니 아이템들을 Product 정보와 함께 반환
 */
async function getCartWithProducts(): Promise<CartResponse> {
  const localItems = getLocalCart();

  if (localItems.length === 0) {
    return {
      items: [],
      count: 0,
      totalPrice: 0,
    };
  }

  // 상품 정보 조회
  const productIds = localItems.map((item) => item.product_id);
  const products = await fetchProducts(productIds);

  // Map으로 빠른 조회를 위해 변환
  const productMap = new Map(products.map((p) => [p.id, p]));

  // 상품 정보와 결합
  const items: CartItemWithProduct[] = localItems
    .map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) return null; // 상품이 삭제된 경우

      return {
        ...item,
        id: item.product_id,
        product,
      };
    })
    .filter((item): item is CartItemWithProduct => item !== null);

  // 삭제된 상품이 있으면 localStorage 업데이트
  if (items.length !== localItems.length) {
    const validItems = items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      added_at: item.added_at,
    }));
    setLocalCart(validItems);
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 장바구니 조회 Hook
 *
 * @example
 * const { data, isLoading } = useCart();
 */
export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: getCartWithProducts,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 장바구니 아이템 개수 조회 Hook
 *
 * @example
 * const { data: count } = useCartCount();
 */
export function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const items = getLocalCart();
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setCount(totalCount);
    };

    // 초기 카운트 설정
    updateCount();

    // storage 이벤트 리스너 (다른 탭에서 변경 시)
    window.addEventListener('storage', updateCount);

    // 커스텀 이벤트 리스너 (같은 탭에서 변경 시)
    window.addEventListener('cartUpdated', updateCount);

    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('cartUpdated', updateCount);
    };
  }, []);

  return {
    data: count,
    isLoading: false,
  };
}

/**
 * 장바구니 업데이트 이벤트 발생
 */
function emitCartUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cartUpdated'));
  }
}

/**
 * 장바구니에 상품 추가 Hook
 *
 * @example
 * const addToCart = useAddToCart();
 * addToCart.mutate({ product_id: 'product-id', quantity: 1 });
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product_id, quantity = 1 }: AddToCartRequest) => {
      const items = getLocalCart();

      // 이미 장바구니에 있는지 확인
      const existingIndex = items.findIndex((item) => item.product_id === product_id);

      if (existingIndex >= 0) {
        // 기존 수량에 추가
        items[existingIndex].quantity += quantity;
      } else {
        // 새 아이템 추가
        items.push({
          product_id,
          quantity,
          added_at: new Date().toISOString(),
        });
      }

      setLocalCart(items);
      emitCartUpdated();

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * 장바구니 아이템 수량 변경 Hook
 *
 * @example
 * const updateCartItem = useUpdateCartItem();
 * updateCartItem.mutate({ item_id: 'product-id', quantity: 2 });
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item_id, quantity }: UpdateCartItemRequest) => {
      if (quantity <= 0) {
        throw new Error('수량은 1개 이상이어야 합니다');
      }

      const items = getLocalCart();
      const index = items.findIndex((item) => item.product_id === item_id);

      if (index < 0) {
        throw new Error('장바구니에 없는 상품입니다');
      }

      items[index].quantity = quantity;
      setLocalCart(items);
      emitCartUpdated();

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * 장바구니 아이템 삭제 Hook
 *
 * @example
 * const removeCartItem = useRemoveCartItem();
 * removeCartItem.mutate('product-id');
 */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const items = getLocalCart();
      const filtered = items.filter((item) => item.product_id !== itemId);

      setLocalCart(filtered);
      emitCartUpdated();

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * 장바구니 비우기 Hook
 *
 * @example
 * const clearCart = useClearCart();
 * clearCart.mutate();
 */
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      setLocalCart([]);
      emitCartUpdated();

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
