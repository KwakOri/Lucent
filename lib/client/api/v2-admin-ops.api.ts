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

export interface V2AdminCutoverPolicy {
  rollout_stage: 'STAGE_1' | 'STAGE_2' | 'STAGE_3';
  approval_enforced: boolean;
  approval_enforced_actions: string[];
  legacy_write_mode: string;
  description: string;
  updated_at: string;
}

export interface V2AdminCutoverPolicyCheckResult {
  policy: V2AdminCutoverPolicy;
  action: {
    action_key: string | null;
    requires_approval: boolean;
    approval_enforced_for_action: boolean;
  };
  decision: 'APPROVAL_REQUIRED' | 'DIRECT_EXECUTE';
}

export type V2CutoverStatus =
  | 'NOT_STARTED'
  | 'SCHEMA_READY'
  | 'BACKFILL_DONE'
  | 'SHADOW_VERIFIED'
  | 'LIMITED_CUTOVER'
  | 'WRITE_DEFAULT_V2'
  | 'LEGACY_READONLY';

export type V2CutoverGateType =
  | 'DATA_CONSISTENCY'
  | 'BEHAVIORAL'
  | 'OPERATIONS'
  | 'ROLLBACK_READY';

export type V2CutoverGateResult = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

export type V2CutoverBatchStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED';

export type V2CutoverRouteTarget = 'LEGACY' | 'V2' | 'SHADOW';

export type V2CutoverStageRunStatus =
  | 'PLANNED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'ROLLED_BACK'
  | 'CANCELED';

export type V2CutoverIssueStatus = 'OPEN' | 'MITIGATING' | 'RESOLVED';
export type V2CutoverIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type V2CutoverReopenDecision = 'NOT_REQUIRED' | 'READY' | 'BLOCKED';

export interface V2CutoverDomain {
  id: string;
  domain_key: string;
  domain_name: string;
  status: V2CutoverStatus;
  current_stage: number;
  next_action: string | null;
  owner_role_code: string | null;
  last_gate_result: V2CutoverGateResult;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface V2CutoverGateReport {
  id: string;
  domain_id: string;
  gate_type: V2CutoverGateType;
  gate_key: string;
  gate_result: V2CutoverGateResult;
  measured_at: string;
  threshold_json: Record<string, unknown>;
  metrics_json: Record<string, unknown>;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  domain?: Pick<V2CutoverDomain, 'domain_key' | 'domain_name' | 'status' | 'current_stage'>;
}

export interface V2CutoverGateChecklistCheck {
  gate_type: V2CutoverGateType;
  latest_result: V2CutoverGateResult | null;
  latest_at: string | null;
  detail: string | null;
  report_id: string | null;
  passed: boolean;
  warn: boolean;
  failed: boolean;
  missing: boolean;
  blocking: boolean;
}

export interface V2CutoverGateChecklistDomain {
  domain: Pick<
    V2CutoverDomain,
    | 'id'
    | 'domain_key'
    | 'domain_name'
    | 'status'
    | 'current_stage'
    | 'next_action'
    | 'owner_role_code'
    | 'last_gate_result'
    | 'updated_at'
  >;
  gate_checks: V2CutoverGateChecklistCheck[];
  summary: {
    required_total: number;
    passed: number;
    warn: number;
    failed: number;
    missing: number;
  };
  decision: 'READY' | 'REVIEW' | 'BLOCKED';
}

export interface V2CutoverGateChecklist {
  generated_at: string;
  required_gate_types: V2CutoverGateType[];
  domains: V2CutoverGateChecklistDomain[];
  summary: {
    total_domains: number;
    ready_count: number;
    review_count: number;
    blocked_count: number;
  };
}

export interface V2CutoverReopenReadinessDomain {
  domain: Pick<
    V2CutoverDomain,
    | 'id'
    | 'domain_key'
    | 'domain_name'
    | 'status'
    | 'current_stage'
    | 'owner_role_code'
    | 'next_action'
  >;
  gate: {
    decision: V2CutoverGateChecklistDomain['decision'];
    summary: V2CutoverGateChecklistDomain['summary'] | null;
  };
  issues: {
    unresolved_count: number;
    highest_severity: V2CutoverIssueSeverity | null;
    latest_occurred_at: string | null;
  };
  latest_stage_run: {
    id: string;
    stage_no: number;
    run_key: string;
    status: V2CutoverStageRunStatus;
    transition_mode: V2CutoverStageRun['transition_mode'];
    started_at: string | null;
    finished_at: string | null;
    updated_at: string | null;
  } | null;
  active_routing_flag: {
    id: string;
    target: V2CutoverRouteTarget;
    traffic_percent: number;
    priority: number;
    reason: string | null;
    updated_at: string | null;
  } | null;
  rollback: {
    mode_active: boolean;
    has_rollback_history: boolean;
    needs_reopen: boolean;
  };
  approval_checks: {
    gate_ready: boolean;
    unresolved_issues_cleared: boolean;
    latest_stage_run_completed: boolean;
  };
  reopen_decision: V2CutoverReopenDecision;
  blockers: string[];
}

export interface V2CutoverReopenReadiness {
  generated_at: string;
  required_gate_types: V2CutoverGateType[];
  domains: V2CutoverReopenReadinessDomain[];
  summary: {
    total_domains: number;
    reopen_required_count: number;
    ready_count: number;
    blocked_count: number;
    not_required_count: number;
  };
}

export interface V2CutoverBatch {
  id: string;
  domain_id: string;
  batch_key: string;
  run_type: string;
  status: V2CutoverBatchStatus;
  idempotency_key: string | null;
  started_at: string | null;
  finished_at: string | null;
  source_snapshot: Record<string, unknown>;
  result_summary: Record<string, unknown>;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  domain?: Pick<V2CutoverDomain, 'domain_key' | 'domain_name' | 'status' | 'current_stage'>;
}

export interface V2CutoverRoutingFlag {
  id: string;
  domain_id: string;
  channel: string | null;
  campaign_id: string | null;
  target: V2CutoverRouteTarget;
  traffic_percent: number;
  enabled: boolean;
  priority: number;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  domain?: Pick<V2CutoverDomain, 'domain_key' | 'domain_name' | 'status' | 'current_stage'>;
}

export interface V2CutoverStageRun {
  id: string;
  domain_id: string;
  stage_no: number;
  run_key: string;
  status: V2CutoverStageRunStatus;
  transition_mode: 'BASELINE' | 'LIMITED' | 'FULL' | 'ROLLBACK';
  started_at: string | null;
  finished_at: string | null;
  limited_targets: unknown[];
  summary: Record<string, unknown>;
  approval_note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  domain?: Pick<V2CutoverDomain, 'domain_key' | 'domain_name' | 'status' | 'current_stage'>;
}

export interface V2CutoverStageIssue {
  id: string;
  stage_run_id: string | null;
  domain_id: string;
  stage_no: number;
  status: V2CutoverIssueStatus;
  severity: V2CutoverIssueSeverity;
  issue_type: string;
  title: string;
  detail: string | null;
  recovery_action: string | null;
  owner_role_code: string | null;
  occurred_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  domain?: Pick<V2CutoverDomain, 'domain_key' | 'domain_name' | 'status' | 'current_stage'>;
  stage_run?: Pick<V2CutoverStageRun, 'id' | 'run_key' | 'status' | 'stage_no'>;
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
  waiting_shipment_count: number;
  in_transit_shipment_count: number;
  delivered_shipment_count: number;
  active_entitlement_count: number;
  has_bundle: boolean;
  has_physical: boolean;
  has_digital: boolean;
}

export interface V2AdminOrderDetail {
  order: Record<string, unknown>;
  queue_row: V2AdminOrderQueueRow | null;
  items: Array<Record<string, unknown>>;
  adjustments: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  fulfillment_queue: V2AdminFulfillmentQueueRow[];
  action_logs: V2AdminActionLog[];
  approvals: V2AdminApprovalRequest[];
}

export type V2AdminBulkOrderActionMode = 'DRY_RUN' | 'EXECUTE';
export type V2AdminBulkOrderActionKey =
  | 'FULFILLMENT_SHIPMENT_DISPATCH'
  | 'FULFILLMENT_ENTITLEMENT_REISSUE'
  | 'FULFILLMENT_ENTITLEMENT_REVOKE';

export interface V2AdminBulkOrderActionCandidate {
  resource_type: 'SHIPMENT' | 'DIGITAL_ENTITLEMENT';
  resource_id: string;
  current_status: string | null;
  transition_key: string;
}

export interface V2AdminBulkOrderActionRow {
  order_id: string;
  order_no: string | null;
  exists: boolean;
  statuses: {
    order_status: string;
    payment_status: string;
    fulfillment_status: string;
  } | null;
  candidate_count: number;
  candidates: V2AdminBulkOrderActionCandidate[];
}

export interface V2AdminBulkOrderActionResult {
  mode: V2AdminBulkOrderActionMode;
  action_key: V2AdminBulkOrderActionKey;
  requested_at: string;
  summary: {
    requested_order_count: number;
    found_order_count: number;
    missing_order_count: number;
    candidate_count: number;
  };
  rows: V2AdminBulkOrderActionRow[];
  execute?: {
    queued_count: number;
    action_log_ids: string[];
    logs: Array<Record<string, unknown>>;
    note: string;
  };
}

export type V2AdminOrderLinearStage =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PRODUCTION'
  | 'READY_TO_SHIP'
  | 'IN_TRANSIT'
  | 'DELIVERED';

export type V2AdminOrderLinearTransitionActionKey =
  | 'ORDER_PAYMENT_MARK_AUTHORIZED'
  | 'ORDER_PAYMENT_MARK_CAPTURED'
  | 'ORDER_PAYMENT_MARK_PENDING'
  | 'FULFILLMENT_SHIPMENT_FORCE_STATUS'
  | 'FULFILLMENT_ENTITLEMENT_FORCE_STATUS'
  | 'FULFILLMENT_SHIPMENT_DISPATCH'
  | 'FULFILLMENT_SHIPMENT_DELIVER'
  | 'FULFILLMENT_ENTITLEMENT_REISSUE';

export interface V2AdminOrderLinearTransitionAction {
  sequence: number;
  action_key: V2AdminOrderLinearTransitionActionKey;
  resource_type: 'ORDER' | 'SHIPMENT' | 'DIGITAL_ENTITLEMENT';
  resource_id: string;
  from_state: string | null;
  to_state: string | null;
  requires_approval: boolean;
  note: string | null;
}

export interface V2AdminOrderLinearTransitionRow {
  order_id: string;
  order_no: string | null;
  exists: boolean;
  current_stage: V2AdminOrderLinearStage | null;
  target_stage: V2AdminOrderLinearStage;
  executable: boolean;
  statuses: {
    order_status: string;
    payment_status: string;
    fulfillment_status: string;
  } | null;
  composition: {
    has_bundle: boolean;
    has_physical: boolean;
    has_digital: boolean;
  };
  action_count: number;
  actions: V2AdminOrderLinearTransitionAction[];
  blocked_reasons: string[];
  warning_reasons: string[];
}

export interface V2AdminOrderLinearTransitionResult {
  mode: 'PREVIEW' | 'EXECUTE';
  requested_at: string;
  target_stage: V2AdminOrderLinearStage;
  summary: {
    requested_order_count: number;
    found_order_count: number;
    executable_order_count: number;
    blocked_order_count: number;
    total_action_count: number;
  };
  rows: V2AdminOrderLinearTransitionRow[];
  execute?: {
    attempted_action_count: number;
    succeeded_count: number;
    pending_approval_count: number;
    failed_count: number;
    logs: Array<Record<string, unknown>>;
  };
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

export interface V2AdminStockLocation {
  id: string;
  code: string;
  name: string;
  location_type: string;
  priority: number;
  is_active: boolean;
  country_code: string;
  region_code: string | null;
}

export interface V2AdminInventoryLevelRow {
  id: string;
  variant_id: string;
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  safety_stock_quantity: number;
  updated_reason: string | null;
  updated_at: string;
  metadata: Record<string, unknown>;
  location: V2AdminStockLocation | null;
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

export interface BulkV2AdminOrderActionInput {
  mode?: V2AdminBulkOrderActionMode;
  action_key: V2AdminBulkOrderActionKey;
  order_ids: string[];
  reason?: string | null;
  request_id?: string | null;
  preview_limit?: number;
  metadata?: Record<string, unknown> | null;
}

export interface V2AdminOrderLinearTransitionInput {
  order_ids: string[];
  target_stage: V2AdminOrderLinearStage;
  reason?: string | null;
  request_id?: string | null;
  metadata?: Record<string, unknown> | null;
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

export interface ListV2AdminInventoryLevelsParams {
  variant_id: string;
  location_id?: string;
}

export interface UpsertV2AdminInventoryLevelInput {
  variant_id: string;
  location_id?: string | null;
  on_hand_quantity?: number;
  safety_stock_quantity?: number;
  metadata?: Record<string, unknown> | null;
}

export type V2AdminSalesStatsPreset =
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'CUSTOM';

export interface ListV2AdminSalesStatsParams {
  from?: string;
  to?: string;
  preset?: V2AdminSalesStatsPreset;
  project_id?: string;
  campaign_id?: string;
  sales_channel_id?: string;
  campaign_type?: string;
}

export interface V2AdminSalesStatsSummary {
  orders_count: number;
  units_sold: number;
  order_gross_amount: number;
  captured_amount: number;
  refund_amount: number;
  net_settlement_amount: number;
  currency_code: string;
}

export interface V2AdminSalesStatsDailyRow {
  date: string;
  orders_count: number;
  units_sold: number;
  order_gross_amount: number;
  captured_amount: number;
  refund_amount: number;
  net_settlement_amount: number;
}

export interface V2AdminSalesStatsByProjectRow {
  project_id: string | null;
  project_name: string;
  currency_code: string;
  order_count: number;
  units_sold: number;
  order_gross_amount: number;
  captured_amount: number;
  refund_amount: number;
  net_settlement_amount: number;
}

export interface V2AdminSalesStatsByCampaignRow {
  campaign_id: string | null;
  campaign_name: string;
  campaign_type: string | null;
  currency_code: string;
  order_count: number;
  units_sold: number;
  order_gross_amount: number;
  captured_amount: number;
  refund_amount: number;
  net_settlement_amount: number;
}

export interface V2AdminSalesStats {
  range: {
    from: string;
    to: string;
    from_iso: string;
    to_exclusive_iso: string;
    preset: V2AdminSalesStatsPreset;
  };
  filters: {
    project_id: string | null;
    campaign_id: string | null;
    sales_channel_id: string | null;
    campaign_type: string | null;
  };
  summary: V2AdminSalesStatsSummary;
  daily: V2AdminSalesStatsDailyRow[];
  by_project: V2AdminSalesStatsByProjectRow[];
  by_campaign: V2AdminSalesStatsByCampaignRow[];
  metadata: {
    sales_basis: string;
    settlement_basis: string;
    allocation_policy_versions: string[];
    capture_policy_version: string;
    refund_policy_version: string;
  };
}

export interface ListV2AdminCutoverDomainsParams {
  limit?: number;
  status?: V2CutoverStatus;
}

export interface UpdateV2AdminCutoverDomainInput {
  status?: V2CutoverStatus;
  current_stage?: number;
  next_action?: string | null;
  owner_role_code?: string | null;
  last_gate_result?: V2CutoverGateResult;
  metadata?: Record<string, unknown> | null;
}

export interface ListV2AdminCutoverGateReportsParams {
  limit?: number;
  domain_key?: string;
  gate_type?: V2CutoverGateType;
  gate_result?: V2CutoverGateResult;
}

export interface ListV2AdminCutoverGateChecklistParams {
  domain_key?: string;
}

export interface ListV2AdminCutoverReopenReadinessParams {
  domain_key?: string;
}

export interface SaveV2AdminCutoverGateReportInput {
  domain_key: string;
  gate_type: V2CutoverGateType;
  gate_key: string;
  gate_result: V2CutoverGateResult;
  measured_at?: string | null;
  threshold_json?: Record<string, unknown> | null;
  metrics_json?: Record<string, unknown> | null;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListV2AdminCutoverBatchesParams {
  limit?: number;
  domain_key?: string;
  status?: V2CutoverBatchStatus;
  run_type?: string;
}

export interface SaveV2AdminCutoverBatchInput {
  domain_key: string;
  batch_key: string;
  run_type: string;
  status?: V2CutoverBatchStatus;
  idempotency_key?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  source_snapshot?: Record<string, unknown> | null;
  result_summary?: Record<string, unknown> | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListV2AdminCutoverRoutingFlagsParams {
  limit?: number;
  domain_key?: string;
  channel?: string;
  enabled?: boolean;
}

export interface SaveV2AdminCutoverRoutingFlagInput {
  id?: string | null;
  domain_key: string;
  channel?: string | null;
  campaign_id?: string | null;
  target: V2CutoverRouteTarget;
  traffic_percent?: number;
  enabled?: boolean;
  priority?: number;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListV2AdminCutoverStageRunsParams {
  limit?: number;
  domain_key?: string;
  stage_no?: number;
  status?: V2CutoverStageRunStatus;
}

export interface SaveV2AdminCutoverStageRunInput {
  domain_key: string;
  stage_no: number;
  run_key: string;
  status?: V2CutoverStageRunStatus;
  transition_mode?: 'BASELINE' | 'LIMITED' | 'FULL' | 'ROLLBACK';
  started_at?: string | null;
  finished_at?: string | null;
  limited_targets?: unknown[] | null;
  summary?: Record<string, unknown> | null;
  approval_note?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListV2AdminCutoverStageIssuesParams {
  limit?: number;
  domain_key?: string;
  stage_no?: number;
  status?: V2CutoverIssueStatus;
  severity?: V2CutoverIssueSeverity;
}

export interface SaveV2AdminCutoverStageIssueInput {
  id?: string | null;
  stage_run_id?: string | null;
  domain_key: string;
  stage_no: number;
  status?: V2CutoverIssueStatus;
  severity?: V2CutoverIssueSeverity;
  issue_type?: string;
  title: string;
  detail?: string | null;
  recovery_action?: string | null;
  owner_role_code?: string | null;
  occurred_at?: string | null;
  resolved_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface V2AdminListResponse<T> {
  items: T[];
  limit: number;
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

export const V2AdminOpsAPI = {
  async getActionCatalog(): Promise<ApiResponse<V2AdminActionCatalog>> {
    return apiClient.get('/api/v2/admin/actions/catalog');
  },

  async getMyRbac(): Promise<ApiResponse<V2AdminMyRbac>> {
    return apiClient.get('/api/v2/admin/rbac/me');
  },

  async getCutoverPolicy(): Promise<ApiResponse<V2AdminCutoverPolicy>> {
    return apiClient.get('/api/v2/admin/cutover-policy');
  },

  async checkCutoverPolicy(data: {
    action_key?: string;
    requires_approval?: boolean;
  }): Promise<ApiResponse<V2AdminCutoverPolicyCheckResult>> {
    return apiClient.post('/api/v2/admin/cutover-policy/check', data);
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

  async listSalesStats(
    params: ListV2AdminSalesStatsParams = {},
  ): Promise<ApiResponse<V2AdminSalesStats>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/ops/sales-stats${query}`);
  },

  async getOrderDetail(orderId: string): Promise<ApiResponse<V2AdminOrderDetail>> {
    return apiClient.get(`/api/v2/admin/ops/orders/${orderId}/detail`);
  },

  async bulkOrderAction(
    data: BulkV2AdminOrderActionInput,
  ): Promise<ApiResponse<V2AdminBulkOrderActionResult>> {
    return apiClient.post('/api/v2/admin/ops/orders/bulk-actions', data);
  },

  async previewOrderLinearTransition(
    data: V2AdminOrderLinearTransitionInput,
  ): Promise<ApiResponse<V2AdminOrderLinearTransitionResult>> {
    return apiClient.post('/api/v2/admin/ops/orders/transition-preview', data);
  },

  async executeOrderLinearTransition(
    data: V2AdminOrderLinearTransitionInput,
  ): Promise<ApiResponse<V2AdminOrderLinearTransitionResult>> {
    return apiClient.post('/api/v2/admin/ops/orders/transition-execute', data);
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

  async listStockLocations(): Promise<ApiResponse<V2AdminStockLocation[]>> {
    return apiClient.get('/api/v2/fulfillment/admin/inventory/locations');
  },

  async listInventoryLevels(
    params: ListV2AdminInventoryLevelsParams,
  ): Promise<ApiResponse<V2AdminInventoryLevelRow[]>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/fulfillment/admin/inventory/levels${query}`);
  },

  async upsertInventoryLevel(
    data: UpsertV2AdminInventoryLevelInput,
  ): Promise<ApiResponse<V2AdminInventoryLevelRow>> {
    return apiClient.post('/api/v2/fulfillment/admin/inventory/levels/upsert', data);
  },

  async listCutoverDomains(
    params: ListV2AdminCutoverDomainsParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2CutoverDomain>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/domains${query}`);
  },

  async updateCutoverDomain(
    domainKey: string,
    data: UpdateV2AdminCutoverDomainInput,
  ): Promise<ApiResponse<V2CutoverDomain>> {
    return apiClient.patch(`/api/v2/admin/cutover/domains/${domainKey}`, data);
  },

  async listCutoverGateReports(
    params: ListV2AdminCutoverGateReportsParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2CutoverGateReport>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/gates${query}`);
  },

  async getCutoverGateChecklist(
    params: ListV2AdminCutoverGateChecklistParams = {},
  ): Promise<ApiResponse<V2CutoverGateChecklist>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/gates/checklist${query}`);
  },

  async getCutoverReopenReadiness(
    params: ListV2AdminCutoverReopenReadinessParams = {},
  ): Promise<ApiResponse<V2CutoverReopenReadiness>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/reopen-readiness${query}`);
  },

  async saveCutoverGateReport(
    data: SaveV2AdminCutoverGateReportInput,
  ): Promise<ApiResponse<V2CutoverGateReport>> {
    return apiClient.post('/api/v2/admin/cutover/gates', data);
  },

  async listCutoverBatches(
    params: ListV2AdminCutoverBatchesParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2CutoverBatch>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/batches${query}`);
  },

  async saveCutoverBatch(
    data: SaveV2AdminCutoverBatchInput,
  ): Promise<ApiResponse<V2CutoverBatch>> {
    return apiClient.post('/api/v2/admin/cutover/batches', data);
  },

  async listCutoverRoutingFlags(
    params: ListV2AdminCutoverRoutingFlagsParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2CutoverRoutingFlag>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/routing-flags${query}`);
  },

  async saveCutoverRoutingFlag(
    data: SaveV2AdminCutoverRoutingFlagInput,
  ): Promise<ApiResponse<V2CutoverRoutingFlag>> {
    return apiClient.post('/api/v2/admin/cutover/routing-flags', data);
  },

  async listCutoverStageRuns(
    params: ListV2AdminCutoverStageRunsParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2CutoverStageRun>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/stage-runs${query}`);
  },

  async saveCutoverStageRun(
    data: SaveV2AdminCutoverStageRunInput,
  ): Promise<ApiResponse<V2CutoverStageRun>> {
    return apiClient.post('/api/v2/admin/cutover/stage-runs', data);
  },

  async listCutoverStageIssues(
    params: ListV2AdminCutoverStageIssuesParams = {},
  ): Promise<ApiResponse<V2AdminListResponse<V2CutoverStageIssue>>> {
    const query = toQueryString(params);
    return apiClient.get(`/api/v2/admin/cutover/stage-issues${query}`);
  },

  async saveCutoverStageIssue(
    data: SaveV2AdminCutoverStageIssueInput,
  ): Promise<ApiResponse<V2CutoverStageIssue>> {
    return apiClient.post('/api/v2/admin/cutover/stage-issues', data);
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
