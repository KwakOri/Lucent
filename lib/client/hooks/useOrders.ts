/**
 * Order API Hooks
 *
 * 주문 관련 React Query hooks
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  OrdersAPI,
  type CreateOrderData,
  type DownloadInfo,
  type GetOrdersParams,
  type OrderWithItems,
  type VoicePackSummary,
} from '@/lib/client/api/orders.api';

export type { OrderWithItems };

/**
 * 주문 목록 조회 Hook
 *
 * @example
 * const { data, isLoading } = useOrders({ status: 'PENDING' });
 */
export function useOrders(params?: GetOrdersParams) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      return OrdersAPI.getOrders(params);
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
      const response = await OrdersAPI.getOrder(orderId);
      return response.data;
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
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      const response = await OrdersAPI.createOrder(orderData);
      return response.data;
    },
    onSuccess: () => {
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
    }): Promise<DownloadInfo> => {
      const response = await OrdersAPI.getDownloadUrl(orderId, itemId);
      return response.data;
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, '_blank');
    },
  });
}

/**
 * 내 보이스팩 목록 조회 Hook
 *
 * @example
 * const { data, isLoading } = useMyVoicePacks();
 */
export function useMyVoicePacks() {
  return useQuery({
    queryKey: ['my-voicepacks'],
    queryFn: async (): Promise<{ voicepacks: VoicePackSummary[]; total: number }> => {
      const response = await OrdersAPI.getMyVoicePacks();
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 내 주문 목록 조회 Hook (편의 함수)
 */
export function useMyOrders(params?: GetOrdersParams) {
  return useOrders(params);
}

/**
 * 주문 취소 Hook
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const result = await OrdersAPI.cancelOrder(orderId);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
