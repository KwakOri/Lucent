/**
 * V2 Admin / Ops Hooks
 *
 * 운영 큐 조회 + 액션 실행용 React Query hook
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2AdminOpsAPI,
  type ListV2AdminActionLogsParams,
  type ListV2AdminApprovalsParams,
  type ListV2AdminFulfillmentQueueParams,
  type ListV2AdminInventoryHealthParams,
  type ListV2AdminOrderQueueParams,
} from '@/lib/client/api/v2-admin-ops.api';
import { queryKeys } from './query-keys';

async function invalidateV2AdminOps(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2AdminOps.all,
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2Checkout.all,
  });
}

export function useV2AdminActionCatalog() {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.catalog(),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.getActionCatalog();
      return response.data;
    },
  });
}

export function useV2AdminMyRbac() {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.rbac.me(),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.getMyRbac();
      return response.data;
    },
  });
}

export function useV2AdminCutoverPolicy() {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.policy(),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.getCutoverPolicy();
      return response.data;
    },
  });
}

export function useV2AdminRoles() {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.rbac.roles(),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.getRoles();
      return response.data;
    },
  });
}

export function useV2AdminActionLogs(params: ListV2AdminActionLogsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.audit.actionLogs(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listActionLogs(params);
      return response.data;
    },
  });
}

export function useV2AdminApprovals(params: ListV2AdminApprovalsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.audit.approvals(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listApprovals(params);
      return response.data;
    },
  });
}

export function useV2AdminOrderQueue(params: ListV2AdminOrderQueueParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.ops.orderQueue(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listOrderQueue(params);
      return response.data;
    },
  });
}

export function useV2AdminFulfillmentQueue(
  params: ListV2AdminFulfillmentQueueParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.ops.fulfillmentQueue(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listFulfillmentQueue(params);
      return response.data;
    },
  });
}

export function useV2AdminInventoryHealth(
  params: ListV2AdminInventoryHealthParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.ops.inventoryHealth(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listInventoryHealth(params);
      return response.data;
    },
  });
}

export function useV2AdminRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      data,
    }: {
      orderId: string;
      data: {
        amount?: number | null;
        reason?: string | null;
        external_reference?: string | null;
        metadata?: Record<string, unknown> | null;
      };
    }) => V2AdminOpsAPI.refundOrder(orderId, data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminDispatchShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shipmentId,
      data,
    }: {
      shipmentId: string;
      data?: { metadata?: Record<string, unknown> | null };
    }) => V2AdminOpsAPI.dispatchShipment(shipmentId, data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminReissueEntitlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entitlementId,
      data,
    }: {
      entitlementId: string;
      data?: {
        token_hash?: string | null;
        token_reference?: string | null;
        expires_at?: string | null;
        max_downloads?: number | null;
        metadata?: Record<string, unknown> | null;
      };
    }) => V2AdminOpsAPI.reissueEntitlement(entitlementId, data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminRevokeEntitlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entitlementId,
      data,
    }: {
      entitlementId: string;
      data?: {
        reason?: string | null;
        metadata?: Record<string, unknown> | null;
      };
    }) => V2AdminOpsAPI.revokeEntitlement(entitlementId, data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminCutoverPolicyCheck() {
  return useMutation({
    mutationFn: async (data: { action_key?: string; requires_approval?: boolean }) => {
      const response = await V2AdminOpsAPI.checkCutoverPolicy(data);
      return response.data;
    },
  });
}
