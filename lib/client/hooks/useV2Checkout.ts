/**
 * V2 Checkout Hooks
 *
 * v2 cart/checkout/order React Query hooks
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  V2CheckoutAPI,
  type AddV2CartItemData,
  type CancelV2OrderData,
  type CreateV2OrderData,
  type PaymentCallbackData,
  type RefundV2OrderData,
  type UpdateV2CartItemQuantityData,
  type ValidateV2CheckoutData,
} from "@/lib/client/api/v2-checkout.api";
import { queryKeys } from "./query-keys";

export function useV2CheckoutCart() {
  return useQuery({
    queryKey: queryKeys.v2Checkout.cart(),
    queryFn: async () => {
      const response = await V2CheckoutAPI.getCart();
      return response.data;
    },
  });
}

export function useV2AddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddV2CartItemData) => {
      const response = await V2CheckoutAPI.addCartItem(data);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.all,
      });
    },
  });
}

export function useV2UpdateCartItemQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateV2CartItemQuantityData;
    }) => {
      const response = await V2CheckoutAPI.updateCartItemQuantity(itemId, data);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.all,
      });
    },
  });
}

export function useV2RemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await V2CheckoutAPI.removeCartItem(itemId);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.all,
      });
    },
  });
}

export function useV2ValidateCheckout() {
  return useMutation({
    mutationFn: async (data: ValidateV2CheckoutData) => {
      const response = await V2CheckoutAPI.validateCheckout(data);
      return response.data;
    },
  });
}

export function useV2CreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2OrderData) => {
      const response = await V2CheckoutAPI.createOrder(data);
      return response.data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.cart(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.orders.all,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.orders.detail(result.order.id),
      });
    },
  });
}

export function useV2CheckoutOrder(orderId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2Checkout.orders.detail(orderId || ""),
    queryFn: async () => {
      const response = await V2CheckoutAPI.getOrder(orderId!);
      return response.data;
    },
    enabled: !!orderId,
  });
}

export function useV2CancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      data,
    }: {
      orderId: string;
      data?: CancelV2OrderData;
    }) => {
      const response = await V2CheckoutAPI.cancelOrder(orderId, data);
      return response.data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.orders.all,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.orders.detail(result.id),
      });
    },
  });
}

export function useV2ApplyPaymentCallback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      data,
    }: {
      orderId: string;
      data: PaymentCallbackData;
    }) => {
      const response = await V2CheckoutAPI.applyPaymentCallback(orderId, data);
      return response.data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.orders.detail(result.id),
      });
    },
  });
}

export function useV2RefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      data,
    }: {
      orderId: string;
      data: RefundV2OrderData;
    }) => {
      const response = await V2CheckoutAPI.refundOrder(orderId, data);
      return response.data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2Checkout.orders.detail(result.id),
      });
    },
  });
}

export function useV2OrderDebug(orderId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2Checkout.debug(orderId || ""),
    queryFn: async () => {
      const response = await V2CheckoutAPI.getOrderDebug(orderId!);
      return response.data;
    },
    enabled: !!orderId,
  });
}
