/**
 * Cart API Client
 *
 * 장바구니 관련 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse, Enums } from '@/types';

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  type: Enums<'product_type'>;
  stock: number | null;
  is_active: boolean;
  main_image?: {
    id: string;
    public_url: string;
    cdn_url: string | null;
    alt_text: string | null;
  } | null;
}

export interface CartItemWithProduct {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product: CartProduct;
}

export interface CartResponseData {
  items: CartItemWithProduct[];
  count: number;
  totalPrice: number;
}

export interface AddToCartRequest {
  product_id: string;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  item_id: string;
  quantity: number;
}

export const CartAPI = {
  async getCart(): Promise<ApiResponse<CartResponseData>> {
    return apiClient.get('/api/cart');
  },

  async getCartCount(): Promise<ApiResponse<{ count: number }>> {
    return apiClient.get('/api/cart/count');
  },

  async addItem(data: AddToCartRequest): Promise<ApiResponse<CartItemWithProduct>> {
    return apiClient.post('/api/cart', data);
  },

  async updateItem(data: UpdateCartItemRequest): Promise<ApiResponse<CartItemWithProduct>> {
    return apiClient.patch(`/api/cart/${data.item_id}`, {
      quantity: data.quantity,
    });
  },

  async removeItem(itemId: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/api/cart/${itemId}`);
  },

  async clearCart(): Promise<ApiResponse<null>> {
    return apiClient.delete('/api/cart');
  },
};
