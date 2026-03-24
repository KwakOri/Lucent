'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2AdminProductionAPI,
  type ActV2AdminProductionBatchInput,
  type CreateV2AdminProductionBatchInput,
  type ListV2AdminProductionBatchesParams,
  type ListV2AdminProductionCandidatesParams,
  type PreviewV2AdminProductionBatchInput,
} from '@/lib/client/api/v2-admin-production.api';
import { queryKeys } from './query-keys';

async function invalidateProductionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.v2AdminOps.production.all });
  await queryClient.invalidateQueries({ queryKey: queryKeys.v2AdminOps.ops.orderQueue() });
  await queryClient.invalidateQueries({ queryKey: queryKeys.v2Checkout.all });
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
