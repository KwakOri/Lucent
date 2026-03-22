/**
 * V2 Shop Hooks
 *
 * v2 상점 공개 조회 React Query hooks
 */

"use client";

import { useMemo } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
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

export function useV2ShopProductThumbnails(
  productIds: string[],
  params: GetV2ShopProductDetailParams = {},
) {
  const normalizedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          productIds
            .filter((productId): productId is string => typeof productId === "string")
            .map((productId) => productId.trim())
            .filter((productId) => productId.length > 0),
        ),
      ),
    [productIds],
  );

  const productQueries = useQueries({
    queries: normalizedProductIds.map((productId) => ({
      queryKey: queryKeys.v2Shop.products.detail(productId, params),
      queryFn: async () => {
        const response = await V2ShopAPI.getProduct(productId, params);
        return response.data;
      },
      staleTime: 1000 * 60,
      enabled: !!productId,
    })),
  });

  const thumbnailUrlByProductId = useMemo(() => {
    const map = new Map<string, string>();
    productQueries.forEach((query, index) => {
      const productId = normalizedProductIds[index];
      if (!productId) {
        return;
      }
      const thumbnailUrl = query.data?.product?.thumbnail_url;
      if (typeof thumbnailUrl !== "string") {
        return;
      }
      const normalized = thumbnailUrl.trim();
      if (!normalized) {
        return;
      }
      map.set(productId, normalized);
    });
    return map;
  }, [normalizedProductIds, productQueries]);

  return {
    thumbnailUrlByProductId,
    isLoading: productQueries.some((query) => query.isLoading),
    isError: productQueries.some((query) => query.isError),
  };
}

export function useV2ShopPricePreview() {
  return useMutation({
    mutationFn: async (data: GetV2ShopPricePreviewData) => {
      const response = await V2ShopAPI.getPricePreview(data);
      return response.data;
    },
  });
}
