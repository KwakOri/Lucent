/**
 * V2 Admin / Ops API Client
 *
 * V2 운영 큐 조회 및 고위험 액션 실행 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse } from '@/types';

export type V2AdminActionStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELED';
export type V2AdminApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';

export interface V2AdminActionCatalogItem {
  action_key: string;
  domain: string;
  resource_type: string;
  required_permission_code: string | null;
  requires_approval: boolean;
  approval_role_code: string | null;
  endpoint: string;
  transition_key: string;
}

export interface V2AdminActionCatalogScreen {
  screen_key: string;
  screen_name: string;
  actions: V2AdminActionCatalogItem[];
}

export interface V2AdminActionCatalog {
  generated_at: string;
  screens: V2AdminActionCatalogScreen[];
}

export interface V2AdminRoleWithPermissions {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  permissions: string[];
}

export interface V2AdminMyRbac {
  user_id: string;
  roles: Array<{
    id: string;
    role_id: string;
    role_code: string | null;
    role_name: string | null;
    scope_type: string;
    scope_id: string | null;
    status: string;
    assigned_at: string;
    expires_at: string | null;
  }>;
  permissions: string[];
}

export interface V2AdminActionLog {
  id: string;
  action_key: string;
  domain: string;
  resource_type: string | null;
  resource_id: string | null;
  actor_id: string | null;
  actor_email_snapshot: string | null;
  action_status: V2AdminActionStatus;
  request_id: string | null;
  requires_approval: boolean;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface V2AdminApprovalRequest {
  id: string;
  action_log_id: string;
  domain: string;
  action_key: string;
  requester_id: string | null;
  assignee_role_code: string | null;
  status: V2AdminApprovalStatus;
  requested_at: string;
  decided_at: string | null;
  approver_id: string | null;
  decision_note: string | null;
}

export interface V2AdminOrderQueueRow {
  order_id: string;
  order_no: string;
  sales_channel_id: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  grand_total: number;
  placed_at: string | null;
  created_at: string;
  fulfillment_group_count: number;
  active_shipment_count: number;
  active_entitlement_count: number;
}

export interface V2AdminFulfillmentQueueRow {
  fulfillment_group_id: string;
  order_id: string;
  fulfillment_kind: 'DIGITAL' | 'SHIPMENT';
  fulfillment_group_status: string;
  fulfillment_id: string | null;
  fulfillment_status: string | null;
  shipment_id: string | null;
  shipment_status: string | null;
  active_reserved_quantity: number;
  active_entitlement_count: number;
  updated_at: string;
}

export interface V2AdminInventoryHealthRow {
  inventory_level_id: string;
  variant_id: string;
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  safety_stock_quantity: number;
  active_reservation_quantity: number;
  reservation_delta: number;
  updated_at: string;
}

export interface ListV2AdminActionLogsParams {
  limit?: number;
  status?: V2AdminActionStatus;
  domain?: string;
}

export interface ListV2AdminApprovalsParams {
  limit?: number;
  status?: V2AdminApprovalStatus;
}

export interface ListV2AdminOrderQueueParams {
  limit?: number;
  order_status?: string;
}

export interface ListV2AdminFulfillmentQueueParams {
  limit?: number;
  kind?: 'DIGITAL' | 'SHIPMENT';
  status?: string;
}

export interface ListV2AdminInventoryHealthParams {
  limit?: number;
  only_mismatches?: boolean;
  only_low_stock?: boolean;
}

export interface V2AdminListResponse<T> {
  items: T[];
  limit: number;
}

function toQueryString(params: Record<string, string | number | boolean | undefined | null>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const V2AdminOpsAPI = {
  async getActionCatalog(): Promise<ApiResponse<V2AdminActionCatalog>> {
    return apiClient.get('/api/v2/admin/actions/catalog');
  },

  async getMyRbac(): Promise<ApiResponse<V2AdminMyRbac>> {
    return apiClient.get('/api/v2/admin/rbac/me');
  },

  async getRoles(): Promise<ApiResponse<V2AdminRoleWithPermissions[]>> {
    return apiClient.get('/api/v2/admin/rbac/roles');
  },

  async listActionLogs(
    params: ListV2AdminActionLogsParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminActionLog>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/audit/action-logs${query}`);
  },

  async listApprovals(
    params: ListV2AdminApprovalsParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminApprovalRequest>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/audit/approvals${query}`);
  },

  async listOrderQueue(
    params: ListV2AdminOrderQueueParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminOrderQueueRow>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/order-queue${query}`);
  },

  async listFulfillmentQueue(
    params: ListV2AdminFulfillmentQueueParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2AdminFulfillmentQueueRow>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/fulfillment-queue${query}`);
  },

  async listInventoryHealth(
    params: ListV2AdminInventoryHealthParams = {},
  ): Promise<
    ApiResponse<
      V2AdminListResponse<V2AdminInventoryHealthRow> & {
        summary: {
          total: number;
          mismatch_count: number;
          low_stock_count: number;
        };
      }
    >
  > {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/inventory-health${query}`);
  },

  async refundOrder(
    orderId: string,
    data: {
      amount?: number | null;
      reason?: string | null;
      external_reference?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.post(`/api/v2/checkout/orders/${orderId}/refund`, data);
  },

  async dispatchShipment(
    shipmentId: string,
    data: {
      metadata?: Record<string, unknown> | null;
    } = {},
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.post(`/api/v2/fulfillment/admin/shipments/${shipmentId}/dispatch`, data);
  },

  async reissueEntitlement(
    entitlementId: string,
    data: {
      token_hash?: string | null;
      token_reference?: string | null;
      expires_at?: string | null;
      max_downloads?: number | null;
      metadata?: Record<string, unknown> | null;
    } = {},
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.post(
      `/api/v2/fulfillment/admin/entitlements/${entitlementId}/reissue`,
      data,
    );
  },

  async revokeEntitlement(
    entitlementId: string,
    data: {
      reason?: string | null;
      metadata?: Record<string, unknown> | null;
    } = {},
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.post(
      `/api/v2/fulfillment/admin/entitlements/${entitlementId}/revoke`,
      data,
    );
  },
};
