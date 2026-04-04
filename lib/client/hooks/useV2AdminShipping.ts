'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2AdminShippingAPI,
  type ActV2AdminShippingBatchInput,
  type CreateV2AdminShippingBatchInput,
  type DownloadV2AdminShippingBatchPdfResult,
  type ListV2AdminShippingBatchesParams,
  type ListV2AdminShippingCandidatesParams,
  type PreviewV2AdminShippingBatchInput,
  type SaveV2AdminShippingBatchPackagesInput,
} from '@/lib/client/api/v2-admin-shipping.api';
import { queryKeys } from './query-keys';

async function invalidateShippingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2AdminOps.shipping.all,
    refetchType: 'all',
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2AdminOps.production.all,
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

export function useV2AdminShippingCandidates(
  params: ListV2AdminShippingCandidatesParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.shipping.candidates(params),
    queryFn: async () => {
      const response = await V2AdminShippingAPI.listCandidates(params);
      return response.data;
    },
  });
}

export function useV2AdminShippingBatches(
  params: ListV2AdminShippingBatchesParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.shipping.batches(params),
    queryFn: async () => {
      const response = await V2AdminShippingAPI.listBatches(params);
      return response.data;
    },
  });
}

export function useV2AdminShippingBatchDetail(batchId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2AdminOps.shipping.batchDetail(batchId || ''),
    queryFn: async () => {
      const response = await V2AdminShippingAPI.getBatchDetail(batchId!);
      return response.data;
    },
    enabled: Boolean(batchId),
  });
}

export function useV2AdminPreviewShippingBatch() {
  return useMutation({
    mutationFn: async (data: PreviewV2AdminShippingBatchInput) => {
      const response = await V2AdminShippingAPI.previewBatch(data);
      return response.data;
    },
  });
}

export function useV2AdminCreateShippingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2AdminShippingBatchInput) => {
      const response = await V2AdminShippingAPI.createBatch(data);
      return response.data;
    },
    onSettled: async () => {
      await invalidateShippingQueries(queryClient);
    },
  });
}

export function useV2AdminActivateShippingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const response = await V2AdminShippingAPI.activateBatch(batchId);
      return response.data;
    },
    onSettled: async () => {
      await invalidateShippingQueries(queryClient);
    },
  });
}

export function useV2AdminSaveShippingBatchPackages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, data }: { batchId: string; data: SaveV2AdminShippingBatchPackagesInput }) => {
      const response = await V2AdminShippingAPI.saveBatchPackages(batchId, data);
      return response.data;
    },
    onSettled: async () => {
      await invalidateShippingQueries(queryClient);
    },
  });
}

export function useV2AdminDispatchShippingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, data }: { batchId: string; data?: ActV2AdminShippingBatchInput }) => {
      const response = await V2AdminShippingAPI.dispatchBatch(batchId, data || {});
      return response.data;
    },
    onSettled: async () => {
      await invalidateShippingQueries(queryClient);
    },
  });
}

export function useV2AdminCompleteShippingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, data }: { batchId: string; data?: ActV2AdminShippingBatchInput }) => {
      const response = await V2AdminShippingAPI.completeBatch(batchId, data || {});
      return response.data;
    },
    onSettled: async () => {
      await invalidateShippingQueries(queryClient);
    },
  });
}

export function useV2AdminCancelShippingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, reason }: { batchId: string; reason?: string | null }) => {
      const response = await V2AdminShippingAPI.cancelBatch(batchId, { reason: reason || null });
      return response.data;
    },
    onSettled: async () => {
      await invalidateShippingQueries(queryClient);
    },
  });
}

export function useV2AdminDownloadShippingBatchPdf() {
  return useMutation({
    mutationFn: async (batchId: string): Promise<DownloadV2AdminShippingBatchPdfResult> => {
      return V2AdminShippingAPI.downloadBatchPrintPdf(batchId);
    },
  });
}
