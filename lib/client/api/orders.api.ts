/**
 * Orders API Client
 *
 * 주문 관련 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type {
  ApiResponse,
  CreateOrderRequest,
  Enums,
  PaginatedResponse,
  Tables,
} from '@/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type OrderStatus = Enums<'order_status'>;
type ProductType = Enums<'product_type'>;

export type CreateOrderData = CreateOrderRequest;

export interface DownloadInfo {
  downloadUrl: string;
  expiresIn: number;
  expiresAt: string;
  filename: string;
}

export interface VoicePackSummary {
  itemId: string;
  orderId: string;
  orderNumber?: string;
  productId?: string;
  productName?: string;
  purchasedAt?: string;
  downloadCount: number;
  lastDownloadedAt: string | null;
  canDownload: boolean;
}

export interface BulkUpdateOrderStatusData {
  orderIds: string[];
  status: OrderStatus;
}

export interface BulkUpdateOrderStatusResult {
  message: string;
  updatedCount: number;
  updatedOrders: Order[];
  errors?: Array<{ orderId: string; error: string }>;
}

interface OrderItemProductSummary {
  id: string;
  name: string;
  type: ProductType;
  digital_file_url?: string | null;
  sample_audio_url?: string | null;
}

interface ShipmentSummary {
  id: string;
  carrier: string | null;
  tracking_number: string | null;
  shipping_status: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

/**
 * 주문 상세 정보 (아이템 포함)
 */
export interface OrderWithItems extends Order {
  items: Array<
    OrderItem & {
      product?: OrderItemProductSummary;
      shipment?: ShipmentSummary | null;
    }
  >;
}

/**
 * 주문 목록 조회 파라미터
 */
export interface GetOrdersParams {
  page?: string | number;
  limit?: string | number;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Orders API
 */
export const OrdersAPI = {
  /**
   * 주문 목록 조회 (일반 사용자: 내 주문, 관리자: 전체 주문)
   */
  async getOrders(params?: GetOrdersParams): Promise<PaginatedResponse<OrderWithItems>> {
    const searchParams = new URLSearchParams();

    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
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
   * 주문 취소
   * - 입금대기(PENDING) 상태일 때만 취소 가능
   */
  async cancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.delete(`/api/orders/${orderId}`);
  },

  /**
   * 디지털 상품 다운로드 URL 생성
   */
  async getDownloadUrl(orderId: string, itemId: string): Promise<ApiResponse<DownloadInfo>> {
    return apiClient.get(`/api/orders/${orderId}/items/${itemId}/download`);
  },

  /**
   * 관리자 주문 상태 일괄 변경
   */
  async bulkUpdateOrderStatus(
    data: BulkUpdateOrderStatusData,
  ): Promise<ApiResponse<BulkUpdateOrderStatusResult>> {
    return apiClient.patch('/api/admin/orders/bulk-update', data);
  },

  /**
   * 내 보이스팩 목록 조회
   */
  async getMyVoicePacks(): Promise<
    ApiResponse<{
      voicepacks: VoicePackSummary[];
      total: number;
    }>
  > {
    return apiClient.get('/api/users/me/voicepacks');
  },
};
