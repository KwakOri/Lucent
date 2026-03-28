'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2AdminProductionAPI,
  type ActV2AdminProductionBatchInput,
  type CreateV2AdminProductionBatchInput,
  type CreateV2AdminProductionSavedViewInput,
  type ListV2AdminProductionBatchesParams,
  type ListV2AdminProductionCandidatesParams,
  type PreviewV2AdminProductionBatchInput,
  type UpdateV2AdminProductionSavedViewInput,
} from '@/lib/client/api/v2-admin-production.api';
import { queryKeys } from './query-keys';

async function invalidateProductionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2AdminOps.production.all,
    refetchType: 'all',
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2AdminOps.shipping.all,
    refetchType: 'all',
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2AdminOps.ops.orderQueue(),
    refetchType: 'all',
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2Checkout.all,
    refetchType: 'all',
  });
}

export function useV2AdminProductionCandidates(
  params: ListV2AdminProductionCandidatesParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.production.candidates(params),
    queryFn: async () => {
      const response = await V2AdminProductionAPI.listCandidates(params);
      return response.data;
    },
  });
}

export function useV2AdminProductionBatches(
  params: ListV2AdminProductionBatchesParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.production.batches(params),
    queryFn: async () => {
      const response = await V2AdminProductionAPI.listBatches(params);
      return response.data;
    },
  });
}

export function useV2AdminProductionBatchDetail(batchId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.production.batchDetail(batchId || ''),
    queryFn: async () => {
      const response = await V2AdminProductionAPI.getBatchDetail(batchId!);
      return response.data;
    },
    enabled: Boolean(batchId),
  });
}

export function useV2AdminProductionViews(
  ownerAdminId?: string | null,
  options: { enabled?: boolean } = {},
) {
  const normalizedOwnerAdminId = ownerAdminId?.trim() || '';
  return useQuery({
    queryKey: queryKeys.v2AdminOps.production.views(normalizedOwnerAdminId),
    queryFn: async () => {
      const response = await V2AdminProductionAPI.listViews({
        owner_admin_id: normalizedOwnerAdminId || undefined,
      });
      return response.data;
    },
    enabled: Boolean(options.enabled ?? true) && Boolean(normalizedOwnerAdminId),
  });
}

export function useV2AdminPreviewProductionBatch() {
  return useMutation({
    mutationFn: async (data: PreviewV2AdminProductionBatchInput) => {
      const response = await V2AdminProductionAPI.previewBatch(data);
      return response.data;
    },
  });
}

export function useV2AdminCreateProductionBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2AdminProductionBatchInput) => {
      const response = await V2AdminProductionAPI.createBatch(data);
      return response.data;
    },
    onSettled: async () => {
      await invalidateProductionQueries(queryClient);
    },
  });
}

export function useV2AdminActivateProductionBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, data }: { batchId: string; data?: ActV2AdminProductionBatchInput }) => {
      const response = await V2AdminProductionAPI.activateBatch(batchId, data || {});
      return response.data;
    },
    onSettled: async () => {
      await invalidateProductionQueries(queryClient);
    },
  });
}

export function useV2AdminCompleteProductionBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, data }: { batchId: string; data?: ActV2AdminProductionBatchInput }) => {
      const response = await V2AdminProductionAPI.completeBatch(batchId, data || {});
      return response.data;
    },
    onSettled: async () => {
      await invalidateProductionQueries(queryClient);
    },
  });
}

export function useV2AdminCancelProductionBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, reason }: { batchId: string; reason?: string | null }) => {
      const response = await V2AdminProductionAPI.cancelBatch(batchId, { reason: reason || null });
      return response.data;
    },
    onSettled: async () => {
      await invalidateProductionQueries(queryClient);
    },
  });
}

export function useV2AdminCreateProductionView(ownerAdminId?: string | null) {
  const queryClient = useQueryClient();
  const normalizedOwnerAdminId = ownerAdminId?.trim() || '';
  return useMutation({
    mutationFn: async (data: CreateV2AdminProductionSavedViewInput) => {
      if (!normalizedOwnerAdminId) {
        throw new Error('뷰 저장은 로그인된 관리자 계정에서만 사용할 수 있습니다.');
      }
      const response = await V2AdminProductionAPI.createView(data, {
        owner_admin_id: normalizedOwnerAdminId,
      });
      return response.data;
    },
    onSettled: async () => {
      await invalidateProductionQueries(queryClient);
    },
  });
}

export function useV2AdminUpdateProductionView(ownerAdminId?: string | null) {
  const queryClient = useQueryClient();
  const normalizedOwnerAdminId = ownerAdminId?.trim() || '';
  return useMutation({
    mutationFn: async ({
      viewId,
      data,
    }: {
      viewId: string;
      data: UpdateV2AdminProductionSavedViewInput;
    }) => {
      if (!normalizedOwnerAdminId) {
        throw new Error('뷰 수정은 로그인된 관리자 계정에서만 사용할 수 있습니다.');
      }
      const response = await V2AdminProductionAPI.updateView(viewId, data, {
        owner_admin_id: normalizedOwnerAdminId,
      });
      return response.data;
    },
    onSettled: async () => {
      await invalidateProductionQueries(queryClient);
    },
  });
}

export function useV2AdminDeleteProductionView(ownerAdminId?: string | null) {
  const queryClient = useQueryClient();
  const normalizedOwnerAdminId = ownerAdminId?.trim() || '';
  return useMutation({
    mutationFn: async (viewId: string) => {
      if (!normalizedOwnerAdminId) {
        throw new Error('뷰 삭제는 로그인된 관리자 계정에서만 사용할 수 있습니다.');
      }
      const response = await V2AdminProductionAPI.deleteView(viewId, {
        owner_admin_id: normalizedOwnerAdminId,
      });
      return response.data;
    },
    onSettled: async () => {
      await invalidateProductionQueries(queryClient);
    },
  });
}
