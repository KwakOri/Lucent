import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse } from '@/types';

export type V2AdminProductionBatchStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELED';

export interface V2AdminProductionCandidate {
  order_id: string;
  order_no: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  grand_total: number;
  placed_at: string | null;
  created_at: string;
  waiting_shipment_count: number;
  in_transit_shipment_count: number;
  delivered_shipment_count: number;
  has_bundle: boolean;
  has_physical: boolean;
  has_digital: boolean;
  depositor_name: string | null;
  project_id: string | null;
  project_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  project_ids: string[];
  campaign_ids: string[];
  linear_stage: 'PAYMENT_CONFIRMED';
}

export interface V2AdminProductionBatchQueueRow {
  id: string;
  batch_no: string;
  status: V2AdminProductionBatchStatus;
  title: string;
  order_count: number;
  item_quantity_total: number;
  activated_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  activate_failed_count: number;
  complete_failed_count: number;
}

export type V2AdminTransitionResult = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';

export interface V2AdminProductionBatchOrderRow {
  id: string;
  batch_id: string;
  order_id: string;
  order_no: string;
  stage_at_snapshot: string;
  customer_snapshot: Record<string, unknown> | null;
  pricing_snapshot: Record<string, unknown> | null;
  line_items_snapshot: Array<Record<string, unknown>> | null;
  transition_activate_status: V2AdminTransitionResult;
  transition_complete_status: V2AdminTransitionResult;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2AdminProductionBatchAggregateRow {
  id: string;
  batch_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity_total: number;
  order_count: number;
  created_at: string;
  updated_at: string;
}

export interface V2AdminProductionBatchDetail {
  batch: V2AdminProductionBatchQueueRow & Record<string, unknown>;
  orders: V2AdminProductionBatchOrderRow[];
  aggregates: V2AdminProductionBatchAggregateRow[];
}

export interface V2AdminProductionBatchBlockedRow {
  order_id: string;
  order_no: string | null;
  reason: string;
}

export interface V2AdminProductionBatchPreviewAggregate {
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity_total: number;
  order_count: number;
}

export interface V2AdminProductionBatchPreview {
  requested_order_count: number;
  valid_order_count: number;
  blocked_order_count: number;
  blocked_rows: V2AdminProductionBatchBlockedRow[];
  valid_order_ids: string[];
  aggregates: V2AdminProductionBatchPreviewAggregate[];
}

export interface V2AdminListResponse<T> {
  items: T[];
  limit: number;
}

export interface ListV2AdminProductionCandidatesParams {
  limit?: number;
  keyword?: string;
  date_from?: string;
  date_to?: string;
  project_id?: string;
  campaign_id?: string;
}

export interface ListV2AdminProductionBatchesParams {
  limit?: number;
  status?: V2AdminProductionBatchStatus;
}

export interface PreviewV2AdminProductionBatchInput {
  order_ids: string[];
}

export interface CreateV2AdminProductionBatchInput {
  title?: string;
  order_ids: string[];
  notes?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ActV2AdminProductionBatchInput {
  reason?: string | null;
  request_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

function toQueryString<T extends object>(params: T) {
  const searchParams = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const V2AdminProductionAPI = {
  async listCandidates(
    params: ListV2AdminProductionCandidatesParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminProductionCandidate>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/production/candidates${query}`);
  },

  async previewBatch(
    data: PreviewV2AdminProductionBatchInput,
  ): Promise<ApiResponse<V2AdminProductionBatchPreview>> {
    return apiClient.post('/api/v2/admin/ops/production/batches/preview', data);
  },

  async createBatch(
    data: CreateV2AdminProductionBatchInput,
  ): Promise<ApiResponse<V2AdminProductionBatchDetail>> {
    return apiClient.post('/api/v2/admin/ops/production/batches', data);
  },

  async listBatches(
    params: ListV2AdminProductionBatchesParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminProductionBatchQueueRow>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/production/batches${query}`);
  },

  async getBatchDetail(batchId: string): Promise<ApiResponse<V2AdminProductionBatchDetail>> {
    return apiClient.get(`/api/v2/admin/ops/production/batches/${batchId}`);
  },

  async activateBatch(
    batchId: string,
    data: ActV2AdminProductionBatchInput = {},
  ): Promise<ApiResponse<V2AdminProductionBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/production/batches/${batchId}/activate`, data);
  },

  async completeBatch(
    batchId: string,
    data: ActV2AdminProductionBatchInput = {},
  ): Promise<ApiResponse<V2AdminProductionBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/production/batches/${batchId}/complete`, data);
  },

  async cancelBatch(
    batchId: string,
    data: Pick<ActV2AdminProductionBatchInput, 'reason'> = {},
  ): Promise<ApiResponse<V2AdminProductionBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/production/batches/${batchId}/cancel`, data);
  },
};
