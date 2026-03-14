/**
 * V2 Shop API Client
 *
 * v2 상점 공개 조회 API 호출
 */

import { apiClient } from "@/lib/client/utils/api-client";
import type { ApiResponse } from "@/types";

export type V2ShopSort =
  | "SORT_ORDER"
  | "LATEST"
  | "OLDEST"
  | "TITLE_ASC"
  | "TITLE_DESC";

export interface GetV2ShopProductsParams {
  cursor?: string;
  limit?: number;
  sort?: V2ShopSort;
  channel?: string;
  campaign_id?: string;
}

export interface GetV2ShopProductDetailParams {
  channel?: string;
  campaign_id?: string;
}

export interface V2ShopDisplayPrice {
  amount: number;
  compare_at_amount: number | null;
  currency_code: string;
  source: "BASE" | "OVERRIDE";
}

export interface V2ShopAvailability {
  sellable: boolean;
  reason: string | null;
  available_quantity: number | null;
}

export interface V2ShopListItem {
  product_id: string;
  project_id: string | null;
  product_kind: "STANDARD" | "BUNDLE";
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  primary_variant_id: string | null;
  primary_variant_title: string | null;
  fulfillment_type: "DIGITAL" | "PHYSICAL" | null;
  display_price: V2ShopDisplayPrice | null;
  availability: V2ShopAvailability;
}

export interface V2ShopProductsResult {
  items: V2ShopListItem[];
  next_cursor: string | null;
  summary: {
    total: number;
  };
}

export interface V2ShopProductDetail {
  product: {
    id: string;
    project_id: string;
    product_kind: "STANDARD" | "BUNDLE";
    title: string;
    slug: string;
    short_description: string | null;
    description: string | null;
    status: string;
    thumbnail_url: string | null;
    primary_variant_id: string | null;
    primary_variant_title: string | null;
    availability: V2ShopAvailability;
  };
  variants: Array<{
    id: string;
    sku: string;
    title: string;
    fulfillment_type: "DIGITAL" | "PHYSICAL";
    requires_shipping: boolean;
    track_inventory: boolean;
    status: string;
    is_primary: boolean;
    availability: V2ShopAvailability;
    display_price: V2ShopDisplayPrice | null;
    purchase_constraints: {
      min_quantity: number;
      max_quantity: number | null;
      channel_scope: string[];
    };
  }>;
  media: Array<{
    id: string;
    product_id: string;
    media_type: "IMAGE" | "VIDEO";
    media_role: "PRIMARY" | "GALLERY" | "DETAIL";
    public_url: string | null;
    alt_text: string | null;
    sort_order: number;
    is_primary: boolean;
    status: string;
    created_at: string;
  }>;
  pricing_context: {
    campaign_id: string | null;
    channel: string | null;
    evaluated_at: string;
    preview: {
      quote_reference: string;
      evaluated_at: string;
      line: Record<string, unknown> | null;
      summary: Record<string, unknown>;
      applied_promotions: Array<Record<string, unknown>>;
      coupon: Record<string, unknown> | null;
    } | null;
  };
  purchase_constraints: {
    min_quantity: number;
    max_quantity: number | null;
    channel_scope: string[];
    sold_out: boolean;
  };
}

export interface GetV2ShopPricePreviewData {
  variant_id: string;
  quantity?: number;
  campaign_id?: string | null;
  channel?: string | null;
  coupon_code?: string | null;
  user_id?: string | null;
  shipping_amount?: number | null;
}

export interface V2ShopPricePreview {
  quote_reference: string;
  evaluated_at: string;
  variant_id: string;
  quantity: number;
  line: Record<string, unknown> | null;
  summary: Record<string, unknown>;
  applied_promotions: Array<Record<string, unknown>>;
  coupon: Record<string, unknown> | null;
}

export const V2ShopAPI = {
  async getProducts(
    params: GetV2ShopProductsParams = {},
  ): Promise<ApiResponse<V2ShopProductsResult>> {
    const searchParams = new URLSearchParams();

    if (params.cursor) {
      searchParams.set("cursor", params.cursor);
    }
    if (params.limit !== undefined) {
      searchParams.set("limit", String(params.limit));
    }
    if (params.sort) {
      searchParams.set("sort", params.sort);
    }
    if (params.channel) {
      searchParams.set("channel", params.channel);
    }
    if (params.campaign_id) {
      searchParams.set("campaign_id", params.campaign_id);
    }

    const query = searchParams.toString();
    return apiClient.get(`/api/v2/shop/products${query ? `?${query}` : ""}`);
  },

  async getProduct(
    productId: string,
    params: GetV2ShopProductDetailParams = {},
  ): Promise<ApiResponse<V2ShopProductDetail>> {
    const searchParams = new URLSearchParams();

    if (params.channel) {
      searchParams.set("channel", params.channel);
    }
    if (params.campaign_id) {
      searchParams.set("campaign_id", params.campaign_id);
    }

    const query = searchParams.toString();
    return apiClient.get(
      `/api/v2/shop/products/${productId}${query ? `?${query}` : ""}`,
    );
  },

  async getPricePreview(
    data: GetV2ShopPricePreviewData,
  ): Promise<ApiResponse<V2ShopPricePreview>> {
    return apiClient.post("/api/v2/shop/price-preview", data);
  },
};
