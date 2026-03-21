/**
 * V2 Shop Hooks
 *
 * v2 상점 공개 조회 React Query hooks
 */

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  V2ShopAPI,
  type GetV2ShopCampaignsParams,
  type GetV2ShopCouponsParams,
  type GetV2ShopPricePreviewData,
  type GetV2ShopProductDetailParams,
  type GetV2ShopProductsParams,
} from "@/lib/client/api/v2-shop.api";
import { queryKeys } from "./query-keys";

export function useV2ShopCampaigns(params: GetV2ShopCampaignsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2Shop.campaigns.list(params),
    queryFn: async () => {
      const response = await V2ShopAPI.getCampaigns(params);
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

export function useV2ShopCoupons(params: GetV2ShopCouponsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2Shop.coupons.list(params),
    queryFn: async () => {
      const response = await V2ShopAPI.getCoupons(params);
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

export function useV2ShopProducts(params: GetV2ShopProductsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2Shop.products.list(params),
    queryFn: async () => {
      const response = await V2ShopAPI.getProducts(params);
      return response.data;
    },
    staleTime: 1000 * 60,
  });
}

export function useV2ShopProduct(
  productId: string | null | undefined,
  params: GetV2ShopProductDetailParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2Shop.products.detail(productId || "", params),
    queryFn: async () => {
      const response = await V2ShopAPI.getProduct(productId!, params);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 1000 * 30,
  });
}

export function useV2ShopPricePreview() {
  return useMutation({
    mutationFn: async (data: GetV2ShopPricePreviewData) => {
      const response = await V2ShopAPI.getPricePreview(data);
      return response.data;
    },
  });
}
