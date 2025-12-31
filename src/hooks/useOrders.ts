/**
 * Order API Hooks
 *
 * 주문 관련 React Query hooks
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Tables,
  GetOrdersQuery,
  CreateOrderRequest,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

/**
 * 주문 목록 조회 Hook
 *
 * @example
 * const { data, isLoading } = useOrders({ status: '입금확인' });
 */
export function useOrders(params?: GetOrdersQuery) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(
        Object.entries(params || {}).filter(([_, v]) => v !== undefined)
      );
      const response = await fetch(`/api/orders?${searchParams}`);
      if (!response.ok) {
        throw new Error('주문 목록 조회 실패');
      }
      const data: PaginatedResponse<Tables<'orders'>> = await response.json();
      return data;
    },
  });
}

/**
 * 주문 상세 조회 Hook
 *
 * @example
 * const { data, isLoading } = useOrder('order-id');
 */
export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('주문 조회 실패');
      }
      const data: ApiResponse<Tables<'orders'>> = await response.json();
      return data.data;
    },
    enabled: !!orderId,
  });
}

/**
 * 주문 생성 Hook
 *
 * @example
 * const { mutate: createOrder, isPending } = useCreateOrder();
 * createOrder({
 *   items: [{ productId: 'xxx', quantity: 1 }],
 *   shippingName: '홍길동',
 * });
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '주문 생성 실패');
      }
      const data: ApiResponse<Tables<'orders'>> = await response.json();
      return data.data;
    },
    onSuccess: () => {
      // 주문 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/**
 * 디지털 상품 다운로드 Hook
 *
 * @example
 * const { mutate: download } = useDownloadDigitalProduct();
 * download({ orderId: 'xxx', itemId: 'yyy' });
 */
export function useDownloadDigitalProduct() {
  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
    }: {
      orderId: string;
      itemId: string;
    }) => {
      const response = await fetch(
        `/api/orders/${orderId}/items/${itemId}/download`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '다운로드 실패');
      }
      const data: ApiResponse<{ downloadUrl: string; expiresAt: string }> =
        await response.json();
      return data.data;
    },
    onSuccess: (data) => {
      // 다운로드 링크로 이동 (새 탭)
      window.open(data.downloadUrl, '_blank');
    },
  });
}

/**
 * 내 보이스팩 목록 조회 Hook
 *
 * GET /api/users/me/voicepacks
 *
 * @example
 * const { data, isLoading } = useMyVoicePacks();
 */
export function useMyVoicePacks() {
  return useQuery({
    queryKey: ['my-voicepacks'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/voicepacks');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '보이스팩 목록 조회 실패');
      }
      const data: ApiResponse<{
        voicepacks: Array<{
          itemId: string;
          orderId: string;
          orderNumber: string;
          productId: string;
          productName: string;
          purchasedAt: string;
          downloadCount: number;
          lastDownloadedAt: string | null;
          canDownload: boolean;
        }>;
        total: number;
      }> = await response.json();
      return data.data;
    },
  });
}

/**
 * 내 주문 목록 조회 Hook (편의 함수)
 *
 * @example
 * const { orders, isLoading } = useMyOrders();
 */
export function useMyOrders(params?: Omit<GetOrdersQuery, 'userId'>) {
  return useOrders(params);
}
