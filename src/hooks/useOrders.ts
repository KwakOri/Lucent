/**
 * Order API Hooks
 *
 * 주문 관련 React Query hooks
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrdersAPI } from '@/lib/client/api/orders.api';
import type {
  Tables,
  GetOrdersQuery,
  CreateOrderRequest,
  PaginatedResponse,
  ApiResponse,
  Enums,
} from '@/types';

// Order with items type
export type OrderWithItems = Tables<'orders'> & {
  items: Array<Tables<'order_items'> & {
    product?: {
      id: string;
      name: string;
      type: Enums<'product_type'>;
    };
  }>;
};

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
      const data: PaginatedResponse<OrderWithItems> = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 3, // 3분 (주문 상태가 변경될 수 있음)
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
      const data: ApiResponse<OrderWithItems> = await response.json();
      return data.data;
    },
    enabled: !!orderId,
    staleTime: 1000 * 60 * 3, // 3분
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
      const data: ApiResponse<OrderWithItems> = await response.json();
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
      const data: ApiResponse<{ downloadUrl: string; expiresAt: string; filename?: string }> =
        await response.json();
      return data.data;
    },
    onSuccess: (data) => {
      // 파일 다운로드 (새 탭이 아닌 직접 다운로드)
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename || 'voicepack.zip'; // 파일명 지정
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    staleTime: 1000 * 60 * 5, // 5분 (구매한 보이스팩은 자주 변경되지 않음)
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

/**
 * 주문 취소 Hook
 *
 * - 입금대기(PENDING) 상태일 때만 취소 가능
 * - 본인 주문만 취소 가능
 *
 * @example
 * const { mutate: cancelOrder, isPending } = useCancelOrder();
 * cancelOrder('order-id');
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const result = await OrdersAPI.cancelOrder(orderId);
      return result.data;
    },
    onSuccess: () => {
      // 주문 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
