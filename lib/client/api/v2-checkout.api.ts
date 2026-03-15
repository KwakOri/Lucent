/**
 * V2 Checkout API Client
 *
 * v2 cart/checkout/order API 호출
 */

import { apiClient } from "@/lib/client/utils/api-client";
import type { ApiResponse } from "@/types";

export type V2OrderStatus = "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
export type V2PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";
export type V2FulfillmentStatus =
  | "UNFULFILLED"
  | "PARTIAL"
  | "FULFILLED"
  | "CANCELED";

export interface V2CartItem {
  id: string;
  cart_id: string;
  product_id: string | null;
  variant_id: string;
  quantity: number;
  campaign_id: string | null;
  product_kind_snapshot: "STANDARD" | "BUNDLE";
  bundle_configuration_snapshot: Record<string, unknown> | null;
  display_price_snapshot: Record<string, unknown> | null;
  added_via: string;
  metadata: Record<string, unknown>;
  variant?: {
    id: string;
    sku: string;
    title: string;
    fulfillment_type: "DIGITAL" | "PHYSICAL";
    requires_shipping: boolean;
    product?: {
      id: string;
      title: string;
      product_kind: "STANDARD" | "BUNDLE";
      project_id: string | null;
      project?: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
  campaign?: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export interface V2CartSummary {
  id: string;
  status: "ACTIVE" | "CONVERTED" | "EXPIRED" | "ABANDONED";
  profile_id: string | null;
  session_key: string | null;
  sales_channel_id: string;
  currency_code: string;
  converted_order_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  items: V2CartItem[];
  item_count: number;
  quantity_total: number;
}

export interface AddV2CartItemData {
  variant_id: string;
  quantity?: number;
  campaign_id?: string | null;
  bundle_configuration_snapshot?: Record<string, unknown> | null;
  display_price_snapshot?: Record<string, unknown> | null;
  added_via?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateV2CartItemQuantityData {
  quantity: number;
}

export interface ValidateV2CheckoutData {
  campaign_id?: string | null;
  coupon_code?: string | null;
  channel?: string | null;
  shipping_amount?: number | null;
  shipping_postcode?: string | null;
}

export interface CreateV2OrderData extends ValidateV2CheckoutData {
  idempotency_key: string;
  currency_code?: string | null;
  customer_snapshot?: Record<string, unknown> | null;
  billing_address_snapshot?: Record<string, unknown> | null;
  shipping_address_snapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface PaymentCallbackData {
  external_reference: string;
  status:
    | "AUTHORIZED"
    | "CAPTURED"
    | "FAILED"
    | "CANCELED"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED";
  provider?: string | null;
  method?: string | null;
  amount?: number | null;
  refunded_total?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface CancelV2OrderData {
  reason?: string | null;
}

export interface RefundV2OrderData {
  amount?: number | null;
  reason?: string | null;
  external_reference?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface V2CheckoutOrder {
  id: string;
  order_no: string;
  profile_id: string | null;
  order_status: V2OrderStatus;
  payment_status: V2PaymentStatus;
  fulfillment_status: V2FulfillmentStatus;
  source_cart_id: string | null;
  idempotency_key: string;
  subtotal_amount: number;
  item_discount_total: number;
  order_discount_total: number;
  shipping_amount: number;
  shipping_discount_total: number;
  tax_total: number;
  grand_total: number;
  customer_snapshot: Record<string, unknown>;
  billing_address_snapshot: Record<string, unknown> | null;
  shipping_address_snapshot: Record<string, unknown> | null;
  pricing_snapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
  placed_at: string;
  confirmed_at: string | null;
  canceled_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
  items: Array<Record<string, unknown>>;
  adjustments: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
}

export interface V2CreateOrderResult {
  idempotent_replayed: boolean;
  quote_reference: string | null;
  order: V2CheckoutOrder;
}

export interface V2ValidateCheckoutResult {
  cart: V2CartSummary;
  quote: Record<string, unknown>;
}

export interface V2CheckoutOrdersListResult {
  items: V2CheckoutOrder[];
  total: number;
  limit: number;
}

export const V2CheckoutAPI = {
  async getCart(): Promise<ApiResponse<V2CartSummary>> {
    return apiClient.get("/api/v2/checkout/cart");
  },

  async addCartItem(
    data: AddV2CartItemData,
  ): Promise<ApiResponse<V2CartSummary>> {
    return apiClient.post("/api/v2/checkout/cart/items", data);
  },

  async updateCartItemQuantity(
    itemId: string,
    data: UpdateV2CartItemQuantityData,
  ): Promise<ApiResponse<V2CartSummary>> {
    return apiClient.patch(`/api/v2/checkout/cart/items/${itemId}`, data);
  },

  async removeCartItem(itemId: string): Promise<ApiResponse<V2CartSummary>> {
    return apiClient.delete(`/api/v2/checkout/cart/items/${itemId}`);
  },

  async validateCheckout(
    data: ValidateV2CheckoutData,
  ): Promise<ApiResponse<V2ValidateCheckoutResult>> {
    return apiClient.post("/api/v2/checkout/validate", data);
  },

  async createOrder(
    data: CreateV2OrderData,
  ): Promise<ApiResponse<V2CreateOrderResult>> {
    return apiClient.post("/api/v2/checkout/orders", data);
  },

  async getOrder(orderId: string): Promise<ApiResponse<V2CheckoutOrder>> {
    return apiClient.get(`/api/v2/checkout/orders/${orderId}`);
  },

  async getOrders(params: {
    limit?: number;
    order_status?: V2OrderStatus;
  } = {}): Promise<ApiResponse<V2CheckoutOrdersListResult>> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    if (params.order_status) {
      searchParams.set('order_status', params.order_status);
    }
    const query = searchParams.toString();
    return apiClient.get(`/api/v2/checkout/orders${query ? `?${query}` : ''}`);
  },

  async cancelOrder(
    orderId: string,
    data: CancelV2OrderData = {},
  ): Promise<ApiResponse<V2CheckoutOrder>> {
    return apiClient.post(`/api/v2/checkout/orders/${orderId}/cancel`, data);
  },

  async applyPaymentCallback(
    orderId: string,
    data: PaymentCallbackData,
  ): Promise<ApiResponse<V2CheckoutOrder>> {
    return apiClient.post(
      `/api/v2/checkout/orders/${orderId}/payment-callback`,
      data,
    );
  },

  async refundOrder(
    orderId: string,
    data: RefundV2OrderData,
  ): Promise<ApiResponse<V2CheckoutOrder>> {
    return apiClient.post(`/api/v2/checkout/orders/${orderId}/refund`, data);
  },

  async getOrderDebug(
    orderId: string,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.get(`/api/v2/checkout/orders/${orderId}/debug`);
  },
};
