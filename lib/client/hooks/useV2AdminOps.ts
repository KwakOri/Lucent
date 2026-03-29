/**
 * V2 Admin / Ops Hooks
 *
 * 운영 큐 조회 + 액션 실행용 React Query hook
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2AdminOpsAPI,
  type AssignV2AdminRbacRoleInput,
  type BulkV2AdminOrderActionInput,
  type ListV2AdminActionLogsParams,
  type ListV2AdminApprovalsParams,
  type ListV2AdminCutoverBatchesParams,
  type ListV2AdminCutoverGateChecklistParams,
  type ListV2AdminCutoverDomainsParams,
  type ListV2AdminCutoverGateReportsParams,
  type ListV2AdminCutoverReopenReadinessParams,
  type ListV2AdminCutoverRoutingFlagsParams,
  type ListV2AdminCutoverStageIssuesParams,
  type ListV2AdminCutoverStageRunsParams,
  type ListV2AdminFulfillmentQueueParams,
  type ListV2AdminInventoryHealthParams,
  type ListV2AdminInventoryLevelsParams,
  type ListV2AdminOrderQueueParams,
  type ListV2AdminRbacUsersParams,
  type ListV2AdminSalesStatsParams,
  type ListV2AdminUnifiedAuditLogsParams,
  type RevokeV2AdminRbacRoleInput,
  type SaveV2AdminCutoverBatchInput,
  type SaveV2AdminCutoverGateReportInput,
  type SaveV2AdminCutoverRoutingFlagInput,
  type SaveV2AdminCutoverStageIssueInput,
  type SaveV2AdminCutoverStageRunInput,
  type UpdateV2AdminCutoverDomainInput,
  type UpsertV2AdminInventoryLevelInput,
  type V2AdminOrderLinearTransitionInput,
} from '@/lib/client/api/v2-admin-ops.api';
import { queryKeys } from './query-keys';

async function invalidateV2AdminOps(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2AdminOps.all,
    refetchType: 'all',
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2Checkout.all,
    refetchType: 'all',
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

export function useV2AdminCutoverDomains(
  params: ListV2AdminCutoverDomainsParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.domains(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listCutoverDomains(params);
      return response.data;
    },
  });
}

export function useV2AdminCutoverGateReports(
  params: ListV2AdminCutoverGateReportsParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.gates(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listCutoverGateReports(params);
      return response.data;
    },
  });
}

export function useV2AdminCutoverGateChecklist(
  params: ListV2AdminCutoverGateChecklistParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.gateChecklist(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.getCutoverGateChecklist(params);
      return response.data;
    },
  });
}

export function useV2AdminCutoverReopenReadiness(
  params: ListV2AdminCutoverReopenReadinessParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.reopenReadiness(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.getCutoverReopenReadiness(params);
      return response.data;
    },
  });
}

export function useV2AdminCutoverBatches(
  params: ListV2AdminCutoverBatchesParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.batches(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listCutoverBatches(params);
      return response.data;
    },
  });
}

export function useV2AdminCutoverRoutingFlags(
  params: ListV2AdminCutoverRoutingFlagsParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.routingFlags(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listCutoverRoutingFlags(params);
      return response.data;
    },
  });
}

export function useV2AdminCutoverStageRuns(
  params: ListV2AdminCutoverStageRunsParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.stageRuns(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listCutoverStageRuns(params);
      return response.data;
    },
  });
}

export function useV2AdminCutoverStageIssues(
  params: ListV2AdminCutoverStageIssuesParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.cutover.stageIssues(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listCutoverStageIssues(params);
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

export function useV2AdminRbacUsers(params: ListV2AdminRbacUsersParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.rbac.users(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listRbacUsers(params);
      return response.data;
    },
  });
}

export function useV2AdminAssignRbacRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AssignV2AdminRbacRoleInput) => {
      const response = await V2AdminOpsAPI.assignRbacRole(data);
      return response.data;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2AdminOps.rbac.all,
        refetchType: 'all',
      });
    },
  });
}

export function useV2AdminRevokeRbacRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RevokeV2AdminRbacRoleInput) => {
      const response = await V2AdminOpsAPI.revokeRbacRole(data);
      return response.data;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2AdminOps.rbac.all,
        refetchType: 'all',
      });
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

export function useV2AdminUnifiedAuditLogs(
  params: ListV2AdminUnifiedAuditLogsParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.audit.unifiedLogs(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listUnifiedAuditLogs(params);
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

export function useV2AdminSalesStats(params: ListV2AdminSalesStatsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.ops.salesStats(params),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listSalesStats(params);
      return response.data;
    },
  });
}

export function useV2AdminOrderDetail(orderId: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.v2AdminOps.ops.orderQueue(), 'detail', orderId || ''],
    queryFn: async () => {
      const response = await V2AdminOpsAPI.getOrderDetail(orderId!);
      return response.data;
    },
    enabled: !!orderId,
  });
}

export function useV2AdminBulkOrderAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BulkV2AdminOrderActionInput) => {
      const response = await V2AdminOpsAPI.bulkOrderAction(data);
      return response.data;
    },
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminOrderLinearTransitionPreview() {
  return useMutation({
    mutationFn: async (data: V2AdminOrderLinearTransitionInput) => {
      const response = await V2AdminOpsAPI.previewOrderLinearTransition(data);
      return response.data;
    },
  });
}

export function useV2AdminOrderLinearTransitionExecute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: V2AdminOrderLinearTransitionInput) => {
      const response = await V2AdminOpsAPI.executeOrderLinearTransition(data);
      return response.data;
    },
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
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

export function useV2AdminStockLocations() {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.ops.stockLocations(),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listStockLocations();
      return response.data;
    },
  });
}

export function useV2AdminInventoryLevels(
  params: ListV2AdminInventoryLevelsParams | null,
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.ops.inventoryLevels(
      params || { variant_id: '' },
    ),
    queryFn: async () => {
      const response = await V2AdminOpsAPI.listInventoryLevels(params!);
      return response.data;
    },
    enabled: Boolean(params?.variant_id),
  });
}

export function useV2AdminUpsertInventoryLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpsertV2AdminInventoryLevelInput) => {
      const response = await V2AdminOpsAPI.upsertInventoryLevel(data);
      return response.data;
    },
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
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

export function useV2AdminUpdateCutoverDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      domainKey,
      data,
    }: {
      domainKey: string;
      data: UpdateV2AdminCutoverDomainInput;
    }) => V2AdminOpsAPI.updateCutoverDomain(domainKey, data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminSaveCutoverGateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveV2AdminCutoverGateReportInput) =>
      V2AdminOpsAPI.saveCutoverGateReport(data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminSaveCutoverBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveV2AdminCutoverBatchInput) =>
      V2AdminOpsAPI.saveCutoverBatch(data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminSaveCutoverRoutingFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveV2AdminCutoverRoutingFlagInput) =>
      V2AdminOpsAPI.saveCutoverRoutingFlag(data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminSaveCutoverStageRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveV2AdminCutoverStageRunInput) =>
      V2AdminOpsAPI.saveCutoverStageRun(data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}

export function useV2AdminSaveCutoverStageIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaveV2AdminCutoverStageIssueInput) =>
      V2AdminOpsAPI.saveCutoverStageIssue(data),
    onSettled: async () => {
      await invalidateV2AdminOps(queryClient);
    },
  });
}
