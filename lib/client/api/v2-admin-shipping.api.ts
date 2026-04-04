import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse } from '@/types';

export type V2AdminShippingBatchStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELED';

export type V2AdminTransitionResult = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';

export interface V2AdminShippingCandidate {
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
  linear_stage: 'READY_TO_SHIP';
}

export interface V2AdminShippingBatchQueueRow {
  id: string;
  batch_no: string;
  status: V2AdminShippingBatchStatus;
  title: string;
  order_count: number;
  package_count: number;
  dispatched_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  dispatch_failed_count: number;
  delivery_failed_count: number;
  excluded_count: number;
}

export interface V2AdminShippingBatchOrderRow {
  id: string;
  batch_id: string;
  order_id: string;
  order_no: string;
  stage_at_snapshot: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  shipping_address_snapshot: Record<string, unknown> | null;
  line_items_snapshot: Array<Record<string, unknown>> | null;
  dispatch_transition_status: V2AdminTransitionResult;
  delivery_transition_status: V2AdminTransitionResult;
  is_excluded: boolean;
  excluded_reason: string | null;
  excluded_at: string | null;
  excluded_by: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2AdminShippingBatchPackageRow {
  id: string;
  batch_id: string;
  batch_order_id: string;
  shipment_id: string | null;
  carrier_code: string | null;
  tracking_no: string | null;
  label_printed_at: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2AdminShippingBatchDetail {
  batch: V2AdminShippingBatchQueueRow & Record<string, unknown>;
  orders: V2AdminShippingBatchOrderRow[];
  packages: V2AdminShippingBatchPackageRow[];
}

export interface V2AdminShippingBatchBlockedRow {
  order_id: string;
  order_no: string | null;
  reason: string;
}

export interface V2AdminShippingBatchPackingRow {
  order_id: string;
  order_no: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  address_summary: string | null;
  item_count: number;
}

export interface V2AdminShippingBatchPreview {
  requested_order_count: number;
  valid_order_count: number;
  blocked_order_count: number;
  blocked_rows: V2AdminShippingBatchBlockedRow[];
  valid_order_ids: string[];
  packing_rows: V2AdminShippingBatchPackingRow[];
}

export interface V2AdminListResponse<T> {
  items: T[];
  limit: number;
}

export interface ListV2AdminShippingCandidatesParams {
  limit?: number;
  keyword?: string;
  date_from?: string;
  date_to?: string;
  project_id?: string;
  campaign_id?: string;
}

export interface ListV2AdminShippingBatchesParams {
  limit?: number;
  status?: V2AdminShippingBatchStatus;
}

export interface PreviewV2AdminShippingBatchInput {
  order_ids: string[];
}

export interface CreateV2AdminShippingBatchInput {
  title: string;
  order_ids: string[];
  notes?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SaveV2AdminShippingBatchPackagesInput {
  packages: Array<{
    batch_order_id: string;
    shipment_id?: string | null;
    carrier_code?: string | null;
    tracking_no?: string | null;
    notes?: string | null;
  }>;
}

export interface ActV2AdminShippingBatchInput {
  reason?: string | null;
  request_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DownloadV2AdminShippingBatchPdfResult {
  blob: Blob;
  filename: string;
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

type ShippingPdfDownloadErrorPayload = {
  message: string;
  errorCode: string | null;
  rawText: string;
};

async function readShippingPdfDownloadErrorPayload(
  response: Response,
): Promise<ShippingPdfDownloadErrorPayload> {
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
      messageFromJson ||
      messageFromText ||
      '배송 리스트 PDF 생성에 실패했습니다.',
    errorCode,
    rawText,
  };
}

export const V2AdminShippingAPI = {
  async listCandidates(
    params: ListV2AdminShippingCandidatesParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminShippingCandidate>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/shipping/candidates${query}`);
  },

  async previewBatch(
    data: PreviewV2AdminShippingBatchInput,
  ): Promise<ApiResponse<V2AdminShippingBatchPreview>> {
    return apiClient.post('/api/v2/admin/ops/shipping/batches/preview', data);
  },

  async createBatch(
    data: CreateV2AdminShippingBatchInput,
  ): Promise<ApiResponse<V2AdminShippingBatchDetail>> {
    return apiClient.post('/api/v2/admin/ops/shipping/batches', data);
  },

  async listBatches(
    params: ListV2AdminShippingBatchesParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminShippingBatchQueueRow>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/shipping/batches${query}`);
  },

  async getBatchDetail(batchId: string): Promise<ApiResponse<V2AdminShippingBatchDetail>> {
    return apiClient.get(`/api/v2/admin/ops/shipping/batches/${batchId}`);
  },

  async activateBatch(batchId: string): Promise<ApiResponse<V2AdminShippingBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/shipping/batches/${batchId}/activate`, {});
  },

  async saveBatchPackages(
    batchId: string,
    data: SaveV2AdminShippingBatchPackagesInput,
  ): Promise<ApiResponse<V2AdminShippingBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/shipping/batches/${batchId}/packages`, data);
  },

  async dispatchBatch(
    batchId: string,
    data: ActV2AdminShippingBatchInput = {},
  ): Promise<ApiResponse<V2AdminShippingBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/shipping/batches/${batchId}/dispatch`, data);
  },

  async completeBatch(
    batchId: string,
    data: ActV2AdminShippingBatchInput = {},
  ): Promise<ApiResponse<V2AdminShippingBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/shipping/batches/${batchId}/complete`, data);
  },

  async cancelBatch(
    batchId: string,
    data: Pick<ActV2AdminShippingBatchInput, 'reason'> = {},
  ): Promise<ApiResponse<V2AdminShippingBatchDetail>> {
    return apiClient.post(`/api/v2/admin/ops/shipping/batches/${batchId}/cancel`, data);
  },

  async downloadBatchPrintPdf(
    batchId: string,
  ): Promise<DownloadV2AdminShippingBatchPdfResult> {
    const response = await fetch(
      `/api/v2/admin/ops/shipping/batches/${batchId}/print-pdf`,
      {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const errorPayload = await readShippingPdfDownloadErrorPayload(response);
      const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
      const messageParts = [errorPayload.message, `status=${statusLabel}`];
      if (errorPayload.errorCode) {
        messageParts.push(`code=${errorPayload.errorCode}`);
      }
      const message = messageParts.join(' / ');

      if (process.env.NODE_ENV !== 'production') {
        console.error('[V2AdminShippingAPI] downloadBatchPrintPdf failed', {
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
      `shipping_batch_${batchId}.pdf`;

    return {
      blob,
      filename,
    };
  },
};
