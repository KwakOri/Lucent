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
  excluded_count: number;
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
  is_excluded: boolean;
  excluded_reason: string | null;
  excluded_at: string | null;
  excluded_by: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2AdminProductionBatchAggregateRow {
  id: string;
  batch_id: string;
  product_id: string | null;
  variant_id: string | null;
  thumbnail_url?: string | null;
  product_name: string;
  variant_name: string | null;
  quantity_total: number;
  order_count: number;
  created_at: string;
  updated_at: string;
}

export interface V2AdminProductionBatchItemRow {
  id: string;
  batch_id: string;
  order_id: string;
  order_item_id: string;
  project_id_snapshot: string | null;
  project_name_snapshot: string | null;
  campaign_id_snapshot: string | null;
  campaign_name_snapshot: string | null;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string | null;
  variant_name_snapshot: string | null;
  quantity: number;
  production_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'FAILED';
  transition_activate_status: V2AdminTransitionResult;
  transition_complete_status: V2AdminTransitionResult;
  activated_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface V2AdminCreatedProductionBatch {
  id: string | null;
  batch_no: string | null;
  title: string | null;
  project_id: string | null;
  project_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  order_count: number;
  item_quantity_total: number;
}

export interface V2AdminProductionBatchDetail {
  batch: V2AdminProductionBatchQueueRow & Record<string, unknown>;
  orders: V2AdminProductionBatchOrderRow[];
  aggregates: V2AdminProductionBatchAggregateRow[];
  items?: V2AdminProductionBatchItemRow[];
  created_batch_count?: number;
  created_batches?: V2AdminCreatedProductionBatch[];
  grouped_by?: string;
}

export interface V2AdminProductionSavedViewFilter {
  project_id: string | null;
  campaign_id: string | null;
}

export interface V2AdminProductionSavedView {
  id: string;
  name: string;
  filter: V2AdminProductionSavedViewFilter;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface V2AdminProductionBatchBlockedRow {
  order_id: string;
  order_no: string | null;
  reason: string;
}

export interface V2AdminProductionBatchPreviewAggregate {
  product_id: string | null;
  variant_id: string | null;
  thumbnail_url?: string | null;
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

export interface DownloadV2AdminProductionBatchPdfResult {
  blob: Blob;
  filename: string;
}

export interface CreateV2AdminProductionSavedViewInput {
  name: string;
  filter: V2AdminProductionSavedViewFilter;
  is_default?: boolean;
  metadata?: Record<string, unknown> | null;
  owner_admin_id?: string;
}

export interface UpdateV2AdminProductionSavedViewInput {
  name?: string;
  filter?: V2AdminProductionSavedViewFilter;
  is_default?: boolean;
  metadata?: Record<string, unknown> | null;
  owner_admin_id?: string;
}

export interface ProductionSavedViewOwnerParams {
  owner_admin_id?: string;
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

function resolveFilenameFromDisposition(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).trim();
    } catch {
      return utf8Match[1].trim();
    }
  }

  const plainMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
  if (!plainMatch?.[1]) {
    return null;
  }
  return plainMatch[1].trim();
}

type ProductionPdfDownloadErrorPayload = {
  message: string;
  errorCode: string | null;
  rawText: string;
};

async function readProductionPdfDownloadErrorPayload(
  response: Response,
): Promise<ProductionPdfDownloadErrorPayload> {
  const rawText = (await response.text()).trim();
  let parsed: Record<string, unknown> | null = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  const messageFromJson =
    parsed && typeof parsed.message === 'string' ? parsed.message.trim() : '';
  const messageFromText =
    rawText && !rawText.startsWith('<!DOCTYPE') && !rawText.startsWith('<html')
      ? rawText
      : '';
  const errorCode =
    parsed && typeof parsed.errorCode === 'string' && parsed.errorCode.trim()
      ? parsed.errorCode.trim()
      : null;

  return {
    message:
      messageFromJson || messageFromText || '제작 의뢰서 PDF 생성에 실패했습니다.',
    errorCode,
    rawText,
  };
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

  async listViews(
    params: ProductionSavedViewOwnerParams = {},
  ): Promise<ApiResponse<{ items: V2AdminProductionSavedView[] }>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/production/views${query}`);
  },

  async createView(
    data: CreateV2AdminProductionSavedViewInput,
    params: ProductionSavedViewOwnerParams = {},
  ): Promise<ApiResponse<V2AdminProductionSavedView>> {
    const payload = params.owner_admin_id
      ? { ...data, owner_admin_id: params.owner_admin_id }
      : data;
    return apiClient.post('/api/v2/admin/ops/production/views', payload);
  },

  async updateView(
    viewId: string,
    data: UpdateV2AdminProductionSavedViewInput,
    params: ProductionSavedViewOwnerParams = {},
  ): Promise<ApiResponse<V2AdminProductionSavedView>> {
    const payload = params.owner_admin_id
      ? { ...data, owner_admin_id: params.owner_admin_id }
      : data;
    return apiClient.patch(`/api/v2/admin/ops/production/views/${viewId}`, payload);
  },

  async deleteView(
    viewId: string,
    params: ProductionSavedViewOwnerParams = {},
  ): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    const query = toQueryString(params);
    return apiClient.delete(`/api/v2/admin/ops/production/views/${viewId}${query}`);
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

  async downloadBatchPrintPdf(
    batchId: string,
  ): Promise<DownloadV2AdminProductionBatchPdfResult> {
    const response = await fetch(
      `/api/v2/admin/ops/production/batches/${batchId}/print-pdf`,
      {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const errorPayload = await readProductionPdfDownloadErrorPayload(response);
      const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
      const messageParts = [errorPayload.message, `status=${statusLabel}`];
      if (errorPayload.errorCode) {
        messageParts.push(`code=${errorPayload.errorCode}`);
      }
      const message = messageParts.join(' / ');

      if (process.env.NODE_ENV !== 'production') {
        console.error('[V2AdminProductionAPI] downloadBatchPrintPdf failed', {
          batchId,
          status: response.status,
          statusText: response.statusText,
          errorCode: errorPayload.errorCode,
          responseBody: errorPayload.rawText,
        });
      }

      throw new Error(message);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('생성된 PDF 파일이 비어 있습니다.');
    }

    const filename =
      resolveFilenameFromDisposition(response.headers.get('content-disposition')) ||
      `production_batch_${batchId}.pdf`;

    return {
      blob,
      filename,
    };
  },
};
