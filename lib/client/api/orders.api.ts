/**
 * Orders API Client
 *
 * 주문 관련 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { Tables, Enums } from '@/types/database';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type OrderStatus = Enums<'order_status'>;

/**
 * 주문 생성 요청 데이터
 */
export interface CreateOrderData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingMemo?: string;
}

/**
 * 주문 상세 정보 (아이템 포함)
 */
export interface OrderWithItems extends Order {
  order_items: Array<OrderItem & {
    product?: {
      id: string;
      name: string;
      type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
    };
  }>;
}

/**
 * 주문 목록 조회 파라미터
 */
export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Orders API
 */
export const OrdersAPI = {
  /**
   * 내 주문 목록 조회
   */
  async getMyOrders(params?: GetOrdersParams): Promise<PaginatedResponse<OrderWithItems>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);

    const queryString = searchParams.toString();
    return apiClient.get(`/api/orders${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 주문 단일 조회
   */
  async getOrder(id: string): Promise<ApiResponse<OrderWithItems>> {
    return apiClient.get(`/api/orders/${id}`);
  },

  /**
   * 주문 생성
   */
  async createOrder(data: CreateOrderData): Promise<ApiResponse<OrderWithItems>> {
    return apiClient.post('/api/orders', data);
  },

  /**
   * 디지털 상품 다운로드 URL 생성
   */
  async getDownloadUrl(orderItemId: string): Promise<ApiResponse<{ downloadUrl: string; expiresAt: string }>> {
    return apiClient.post(`/api/orders/items/${orderItemId}/download`, {});
  },

  /**
   * 주문 취소
   * - 입금대기(PENDING) 상태일 때만 취소 가능
   */
  async cancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.delete(`/api/orders/${orderId}`);
  },
};
