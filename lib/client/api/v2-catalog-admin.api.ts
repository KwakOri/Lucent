/**
 * V2 Catalog Admin API Client
 *
 * v2 catalog 운영 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse } from '@/types';

export type V2ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type V2ArtistStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type V2ProductKind = 'STANDARD' | 'BUNDLE';
export type V2ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type V2FulfillmentType = 'DIGITAL' | 'PHYSICAL';
export type V2VariantStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type V2MediaType = 'IMAGE' | 'VIDEO';
export type V2MediaRole = 'PRIMARY' | 'GALLERY' | 'DETAIL';
export type V2MediaStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type V2AssetRole = 'PRIMARY' | 'BONUS';
export type V2DigitalAssetStatus = 'DRAFT' | 'READY' | 'RETIRED';
export type V2MediaAssetKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'ARCHIVE' | 'FILE';
export type V2MediaAssetStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type V2BundleMode = 'FIXED' | 'CUSTOMIZABLE';
export type V2BundleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type V2BundlePricingStrategy = 'WEIGHTED' | 'FIXED_AMOUNT';
export type V2CampaignType = 'POPUP' | 'EVENT' | 'SALE' | 'DROP' | 'ALWAYS_ON';
export type V2CampaignStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CLOSED'
  | 'ARCHIVED';
export type V2CampaignTargetType =
  | 'PROJECT'
  | 'PRODUCT'
  | 'VARIANT'
  | 'BUNDLE_DEFINITION';
export type V2PriceListScope = 'BASE' | 'OVERRIDE';
export type V2PriceListStatus = 'DRAFT' | 'PUBLISHED' | 'ROLLED_BACK' | 'ARCHIVED';
export type V2PriceItemStatus = 'ACTIVE' | 'INACTIVE';
export type V2PromotionType =
  | 'ITEM_PERCENT'
  | 'ITEM_FIXED'
  | 'ORDER_PERCENT'
  | 'ORDER_FIXED'
  | 'SHIPPING_PERCENT'
  | 'SHIPPING_FIXED';
export type V2PromotionStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type V2CombinabilityMode = 'STACKABLE' | 'EXCLUSIVE';
export type V2PromotionRuleType =
  | 'MIN_ORDER_AMOUNT'
  | 'MIN_ITEM_QUANTITY'
  | 'TARGET_PROJECT'
  | 'TARGET_PRODUCT'
  | 'TARGET_VARIANT'
  | 'TARGET_BUNDLE'
  | 'CHANNEL'
  | 'USER_SEGMENT';
export type V2CouponStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXHAUSTED'
  | 'EXPIRED'
  | 'ARCHIVED';
export type V2CouponRedemptionStatus =
  | 'RESERVED'
  | 'APPLIED'
  | 'RELEASED'
  | 'CANCELED'
  | 'EXPIRED';
export type MigrationCheckSeverity = 'BLOCKING' | 'ADVISORY';

export interface V2Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number;
  status: V2ProjectStatus;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  profile_image_url: string | null;
  status: V2ArtistStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2ProjectArtist {
  id: string;
  project_id: string;
  artist_id: string;
  role: string;
  sort_order: number;
  is_primary: boolean;
  status: V2ArtistStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  artist?: V2Artist;
}

export interface V2Product {
  id: string;
  project_id: string;
  product_kind: V2ProductKind;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  sort_order: number;
  status: V2ProductStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2Variant {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  fulfillment_type: V2FulfillmentType;
  requires_shipping: boolean;
  track_inventory: boolean;
  weight_grams: number | null;
  dimension_json: Record<string, unknown> | null;
  option_summary_json: Record<string, unknown> | null;
  status: V2VariantStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2ProductMedia {
  id: string;
  product_id: string;
  media_type: V2MediaType;
  media_role: V2MediaRole;
  media_asset_id: string | null;
  storage_path: string;
  public_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  status: V2MediaStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  media_asset?: V2MediaAsset | null;
}

export interface V2DigitalAsset {
  id: string;
  variant_id: string;
  asset_role: V2AssetRole;
  media_asset_id: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version_no: number;
  checksum: string | null;
  status: V2DigitalAssetStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  media_asset?: V2MediaAsset | null;
}

export interface V2MediaAsset {
  id: string;
  asset_kind: V2MediaAssetKind;
  storage_provider: string;
  storage_bucket: string | null;
  storage_path: string;
  public_url: string | null;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  checksum: string | null;
  status: V2MediaAssetStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2BundleComponentOption {
  id: string;
  bundle_component_id: string;
  option_key: string;
  option_value: string;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface V2BundleComponent {
  id: string;
  bundle_definition_id: string;
  component_variant_id: string;
  is_required: boolean;
  min_quantity: number;
  max_quantity: number;
  default_quantity: number;
  sort_order: number;
  price_allocation_weight: number;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  options?: V2BundleComponentOption[];
  variant?: Pick<
    V2Variant,
    | 'id'
    | 'sku'
    | 'title'
    | 'fulfillment_type'
    | 'requires_shipping'
    | 'track_inventory'
    | 'status'
  > | null;
}

export interface V2BundleDefinition {
  id: string;
  bundle_product_id: string;
  anchor_product_id: string;
  version_no: number;
  mode: V2BundleMode;
  status: V2BundleStatus;
  pricing_strategy: V2BundlePricingStrategy;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2BundleValidationCheck {
  key: string;
  passed: boolean;
  detail: string;
}

export interface V2BundleValidationResult {
  bundle_definition_id: string;
  mode: V2BundleMode;
  status: V2BundleStatus;
  ready: boolean;
  checks: V2BundleValidationCheck[];
  selected_components_resolved: Array<{
    bundle_component_id: string;
    component_variant_id: string;
    quantity_per_parent: number;
  }>;
}

export interface V2BundleResolveResult {
  bundle_definition_id: string;
  mode: V2BundleMode;
  status: V2BundleStatus;
  parent_line: {
    line_type: 'BUNDLE_PARENT';
    bundle_definition_id_snapshot: string;
    parent_variant_id: string | null;
    quantity: number;
    parent_unit_amount: number | null;
  };
  component_lines: Array<{
    line_type: 'BUNDLE_COMPONENT';
    bundle_component_id_snapshot: string;
    component_variant_id: string;
    component_variant_sku: string;
    component_variant_title: string;
    fulfillment_type: V2FulfillmentType;
    requires_shipping: boolean;
    quantity_per_parent: number;
    quantity: number;
    allocation_weight: number;
    allocated_unit_amount: number | null;
    allocated_discount_amount: number;
    allocated_total_amount_per_parent: number | null;
  }>;
  fulfillment_groups: {
    digital: Array<{ component_variant_id: string; quantity: number }>;
    physical: Array<{ component_variant_id: string; quantity: number }>;
  };
  summary: {
    component_line_count: number;
    total_component_quantity: number;
    allocation: {
      parent_unit_amount: number | null;
      component_total_per_parent: number | null;
      difference_per_parent: number | null;
    };
  };
}

export interface V2BundleOpsContractResult {
  bundle_definition_id: string;
  mode: V2BundleMode;
  status: V2BundleStatus;
  policy_version: string;
  parent_line_contract: {
    line_type: 'BUNDLE_PARENT';
    direct_refund_supported: boolean;
    direct_reship_supported: boolean;
    reason: string;
  };
  component_line_contracts: Array<{
    bundle_component_id_snapshot: string;
    component_variant_id: string;
    component_variant_sku: string;
    fulfillment_type: V2FulfillmentType;
    requires_shipping: boolean;
    quantity: number;
    refund_contract: {
      supported: boolean;
      basis: 'COMPONENT_LINE';
      quantity_field: string;
      amount_fields: string[];
      snapshot_field: string;
    };
    reship_contract: {
      supported: boolean;
      basis: 'COMPONENT_LINE';
      quantity_field: string;
      snapshot_field: string;
    };
    digital_regrant_contract: {
      supported: boolean;
      basis: 'COMPONENT_LINE';
      snapshot_field: string;
    };
  }>;
  summary: {
    component_line_count: number;
    refundable_component_lines: number;
    reshippable_component_lines: number;
    digital_regrant_component_lines: number;
  };
}

export interface V2BundleCanaryReportResult {
  generated_at: string;
  source: 'EXPLICIT' | 'ACTIVE_DEFAULT';
  sample_parent_quantity: number;
  sample_parent_unit_amount: number | null;
  target_count: number;
  summary: {
    ready_count: number;
    monitoring_count: number;
    blocked_count: number;
  };
  targets: Array<{
    definition_id: string;
    bundle_product_id: string;
    version_no: number;
    status: V2BundleStatus;
    mode: V2BundleMode;
    validation_ready: boolean;
    failed_validation_checks: string[];
    shadow_resolution: {
      pass: boolean;
      error: string | null;
      allocation_difference_per_parent: number | null;
    };
    live_snapshot: {
      has_live_orders: boolean;
      parent_line_count: number;
      component_line_count: number;
      component_missing_parent_ref: number;
      orphan_component_lines: number;
      component_missing_snapshot: number;
      snapshot_integrity_passed: boolean | null;
    };
    canary_status: 'READY' | 'MONITORING' | 'BLOCKED';
  }>;
}

export interface PublishReadinessCheck {
  key: string;
  passed: boolean;
  detail: string;
}

export interface ProductPublishReadiness {
  product_id: string;
  ready: boolean;
  checks: PublishReadinessCheck[];
}

export interface MigrationCheckResult {
  key: string;
  passed: boolean;
  severity: MigrationCheckSeverity;
  expected: string;
  actual: string;
  detail: string;
}

export interface MigrationCompareReport {
  generated_at: string;
  sample_limit: number;
  counts: {
    legacy: {
      projects: number;
      artists: number;
      products: number;
      digital_products: number;
    };
    v2: {
      projects_total: number;
      projects_mapped: number;
      artists_total: number;
      artists_mapped: number;
      products_total: number;
      products_mapped: number;
      variants_total: number;
      product_media_total: number;
      digital_assets_total: number;
    };
  };
  checks: MigrationCheckResult[];
  differences: Record<string, unknown>;
  read_switch: {
    ready: boolean;
    blocking_checks: string[];
    recommended_order: string[];
  };
}

export interface ReadSwitchChecklistItem {
  key: string;
  passed: boolean;
  severity: MigrationCheckSeverity;
  detail: string;
  action: string;
}

export interface ReadSwitchChecklist {
  generated_at: string;
  ready: boolean;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  blocking_failed_checks: number;
  advisory_failed_checks: number;
  blocking_checks: string[];
  checklist: ReadSwitchChecklistItem[];
  recommended_order: string[];
}

export interface ReadSwitchRemediationTask {
  check_key: string;
  severity: MigrationCheckSeverity;
  title: string;
  detail: string;
  expected: string;
  actual: string;
  action: string;
  sample_source: string | null;
  sample_count: number;
  samples: Array<Record<string, unknown>>;
}

export interface ReadSwitchRemediationTaskReport {
  generated_at: string;
  ready: boolean;
  summary: {
    failed_total: number;
    blocking_failed: number;
    advisory_failed: number;
  };
  blocking_tasks: ReadSwitchRemediationTask[];
  advisory_tasks: ReadSwitchRemediationTask[];
  recommended_order: string[];
}

export interface V2Campaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  campaign_type: V2CampaignType;
  status: V2CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  channel_scope_json: unknown[];
  purchase_limit_json: Record<string, unknown>;
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2CampaignTarget {
  id: string;
  campaign_id: string;
  target_type: V2CampaignTargetType;
  target_id: string;
  sort_order: number;
  is_excluded: boolean;
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2PriceList {
  id: string;
  campaign_id: string | null;
  rollback_of_price_list_id: string | null;
  name: string;
  scope_type: V2PriceListScope;
  status: V2PriceListStatus;
  currency_code: string;
  priority: number;
  published_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  channel_scope_json: unknown[];
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  variant_id: string | null;
  status: V2PriceItemStatus;
  unit_amount: number;
  compare_at_amount: number | null;
  min_purchase_quantity: number;
  max_purchase_quantity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  channel_scope_json: unknown[];
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  product?: Pick<V2Product, 'id' | 'title' | 'slug' | 'status' | 'product_kind'>;
  variant?: Pick<
    V2Variant,
    | 'id'
    | 'sku'
    | 'title'
    | 'status'
    | 'fulfillment_type'
    | 'requires_shipping'
  > | null;
}

export interface V2Promotion {
  id: string;
  campaign_id: string | null;
  name: string;
  description: string | null;
  promotion_type: V2PromotionType;
  status: V2PromotionStatus;
  combinability_mode: V2CombinabilityMode;
  coupon_required: boolean;
  priority: number;
  discount_value: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  channel_scope_json: unknown[];
  purchase_limit_json: Record<string, unknown>;
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2PromotionRule {
  id: string;
  promotion_id: string;
  rule_type: V2PromotionRuleType;
  status: V2PriceItemStatus;
  sort_order: number;
  rule_payload: Record<string, unknown>;
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2Coupon {
  id: string;
  promotion_id: string | null;
  code: string;
  status: V2CouponStatus;
  starts_at: string | null;
  ends_at: string | null;
  max_issuance: number | null;
  max_redemptions_per_user: number;
  reserved_count: number;
  redeemed_count: number;
  channel_scope_json: unknown[];
  purchase_limit_json: Record<string, unknown>;
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string;
  order_id: string | null;
  status: V2CouponRedemptionStatus;
  quote_reference: string | null;
  reserved_at: string;
  applied_at: string | null;
  released_at: string | null;
  expires_at: string | null;
  source_type: string | null;
  source_id: string | null;
  source_snapshot_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface V2CouponValidationResult {
  code: string;
  eligible: boolean;
  reason: string | null;
  evaluated_at: string;
  coupon?: V2Coupon & {
    promotion?: V2Promotion | null;
  };
  checks?: Array<{
    key: string;
    passed: boolean;
    detail: string;
  }>;
}

export interface V2PriceQuoteLineResult {
  variant_id: string;
  product_id: string;
  project_id: string;
  product_kind: V2ProductKind;
  sku: string;
  title: string;
  quantity: number;
  fulfillment_type: V2FulfillmentType;
  requires_shipping: boolean;
  pricing: {
    base_price_list_id: string | null;
    base_price_list_item_id: string | null;
    base_unit_amount: number | null;
    override_price_list_id: string | null;
    override_price_list_item_id: string | null;
    override_unit_amount: number | null;
    selected_price_list_id: string;
    selected_price_list_item_id: string;
    unit_amount: number;
    compare_at_amount: number | null;
    line_subtotal: number;
    line_total_after_item_discounts: number;
  };
  adjustments: Array<{
    source_type: 'PROMOTION' | 'COUPON';
    source_id: string;
    label_snapshot: string;
    amount: number;
    phase: 'auto' | 'coupon' | 'shipping';
  }>;
  discounts: {
    auto: number;
    coupon: number;
    manual: number;
  };
}

export interface V2PriceQuoteResult {
  quote_reference: string;
  evaluated_at: string;
  context: {
    campaign_id: string | null;
    channel: string | null;
    coupon_code: string | null;
    user_id: string | null;
    shipping_amount: number;
  };
  price_candidates: Array<{
    variant_id: string;
    candidates: Array<{
      item_id: string;
      price_list_id: string;
      scope_type: V2PriceListScope;
      campaign_id: string | null;
      priority: number;
      unit_amount: number;
      starts_at: string | null;
      ends_at: string | null;
      selected: boolean;
    }>;
  }>;
  coupon: V2CouponValidationResult | null;
  lines: V2PriceQuoteLineResult[];
  promotion_evaluations: Array<{
    promotion_id: string;
    name: string;
    phase: 'auto' | 'coupon' | 'shipping';
    promotion_type: V2PromotionType;
    combinability_mode: V2CombinabilityMode;
    eligible: boolean;
    coupon_matched: boolean;
    skipped_reason: string | null;
    applied_discount_amount: number;
    rule_results: Array<{
      rule_id: string;
      passed: boolean;
      detail: string;
    }>;
  }>;
  applied_promotions: Array<{
    promotion_id: string;
    name: string;
    phase: 'auto' | 'coupon' | 'shipping';
    promotion_type: V2PromotionType;
    applied_discount_amount: number;
  }>;
  summary: {
    subtotal: number;
    line_subtotal_after_item_discounts: number;
    item_discount_total: number;
    order_level_discount_total: number;
    shipping_amount: number;
    shipping_discount_total: number;
    total_discount: number;
    total_payable_amount: number;
  };
}

export interface V2OrderSnapshotContract {
  order_adjustments: {
    required_fields: string[];
    enums: {
      target_scope: string[];
      source_type: string[];
    };
  };
  order_item_adjustments: {
    required_fields: string[];
    enums: {
      source_type: string[];
    };
  };
  mapping_examples: Array<{
    pricing_source: string;
    adjustment_target: string;
    source_type: string;
    target_scope?: string;
  }>;
}

export interface V2PriceQuoteLineInput {
  variant_id: string;
  quantity: number;
}

export interface GetV2ProjectsParams {
  status?: V2ProjectStatus;
}

export interface GetV2ArtistsParams {
  projectId?: string;
}

export interface GetV2ProductsParams {
  projectId?: string;
  status?: V2ProductStatus;
}

export interface GetV2MediaAssetsParams {
  kind?: V2MediaAssetKind;
  status?: V2MediaAssetStatus;
  search?: string;
}

export interface GetV2BundleDefinitionsParams {
  bundleProductId?: string;
  status?: V2BundleStatus;
}

export interface GetV2CampaignsParams {
  status?: V2CampaignStatus;
  campaignType?: V2CampaignType;
}

export interface GetV2PriceListsParams {
  campaignId?: string;
  scopeType?: V2PriceListScope;
  status?: V2PriceListStatus;
}

export interface GetV2PromotionsParams {
  campaignId?: string;
  status?: V2PromotionStatus;
  couponRequired?: boolean;
}

export interface GetV2CouponsParams {
  promotionId?: string;
  status?: V2CouponStatus;
}

export interface GetV2CouponRedemptionsParams {
  couponId?: string;
  userId?: string;
  status?: V2CouponRedemptionStatus;
  quoteReference?: string;
}

export interface CreateV2ProjectData {
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  sort_order?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2ProjectData {
  name?: string;
  slug?: string;
  description?: string | null;
  cover_image_url?: string | null;
  sort_order?: number;
  metadata?: Record<string, unknown>;
  status?: V2ProjectStatus;
  is_active?: boolean;
}

export interface CreateV2ArtistData {
  name: string;
  slug: string;
  bio?: string | null;
  profile_image_url?: string | null;
  status?: V2ArtistStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2ArtistData {
  name?: string;
  slug?: string;
  bio?: string | null;
  profile_image_url?: string | null;
  status?: V2ArtistStatus;
  metadata?: Record<string, unknown>;
}

export interface LinkV2ArtistToProjectData {
  role?: string;
  sort_order?: number;
  is_primary?: boolean;
  status?: V2ArtistStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateV2ProductData {
  project_id: string;
  product_kind?: V2ProductKind;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  sort_order?: number;
  status?: V2ProductStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2ProductData {
  project_id?: string;
  product_kind?: V2ProductKind;
  title?: string;
  slug?: string;
  short_description?: string | null;
  description?: string | null;
  sort_order?: number;
  status?: V2ProductStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateV2VariantData {
  sku: string;
  title: string;
  fulfillment_type: V2FulfillmentType;
  requires_shipping?: boolean;
  track_inventory?: boolean;
  weight_grams?: number | null;
  dimension_json?: Record<string, unknown> | null;
  option_summary_json?: Record<string, unknown> | null;
  status?: V2VariantStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2VariantData {
  sku?: string;
  title?: string;
  fulfillment_type?: V2FulfillmentType;
  requires_shipping?: boolean;
  track_inventory?: boolean;
  weight_grams?: number | null;
  dimension_json?: Record<string, unknown> | null;
  option_summary_json?: Record<string, unknown> | null;
  status?: V2VariantStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateV2MediaData {
  media_type?: V2MediaType;
  media_role?: V2MediaRole;
  media_asset_id?: string;
  storage_path?: string;
  public_url?: string | null;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  status?: V2MediaStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2MediaData {
  media_type?: V2MediaType;
  media_role?: V2MediaRole;
  media_asset_id?: string;
  storage_path?: string;
  public_url?: string | null;
  alt_text?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  status?: V2MediaStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateV2DigitalAssetData {
  asset_role?: V2AssetRole;
  media_asset_id?: string;
  file_name?: string;
  storage_path?: string;
  public_url?: string | null;
  mime_type?: string;
  file_size?: number;
  version_no?: number;
  checksum?: string | null;
  status?: V2DigitalAssetStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2DigitalAssetData {
  media_asset_id?: string;
  file_name?: string;
  storage_path?: string;
  public_url?: string | null;
  mime_type?: string;
  file_size?: number;
  checksum?: string | null;
  status?: V2DigitalAssetStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateV2MediaAssetData {
  asset_kind?: V2MediaAssetKind;
  storage_provider?: string;
  storage_bucket?: string | null;
  storage_path: string;
  public_url?: string | null;
  file_name?: string;
  mime_type?: string | null;
  file_size?: number | null;
  checksum?: string | null;
  status?: V2MediaAssetStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2MediaAssetData {
  asset_kind?: V2MediaAssetKind;
  storage_bucket?: string | null;
  storage_path?: string;
  public_url?: string | null;
  file_name?: string;
  mime_type?: string | null;
  file_size?: number | null;
  checksum?: string | null;
  status?: V2MediaAssetStatus;
  metadata?: Record<string, unknown>;
}

export interface UploadV2MediaAssetFileData {
  file: File;
  asset_kind?: V2MediaAssetKind;
  status?: V2MediaAssetStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateV2BundleDefinitionData {
  bundle_product_id: string;
  anchor_product_id?: string;
  mode?: V2BundleMode;
  status?: V2BundleStatus;
  pricing_strategy?: V2BundlePricingStrategy;
  version_no?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2BundleDefinitionData {
  mode?: V2BundleMode;
  status?: V2BundleStatus;
  pricing_strategy?: V2BundlePricingStrategy;
  metadata?: Record<string, unknown>;
}

export interface CloneV2BundleDefinitionVersionData {
  metadata_patch?: Record<string, unknown>;
}

export interface CreateV2BundleComponentData {
  component_variant_id: string;
  is_required?: boolean;
  min_quantity?: number;
  max_quantity?: number;
  default_quantity?: number;
  sort_order?: number;
  price_allocation_weight?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2BundleComponentData {
  component_variant_id?: string;
  is_required?: boolean;
  min_quantity?: number;
  max_quantity?: number;
  default_quantity?: number;
  sort_order?: number;
  price_allocation_weight?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateV2BundleComponentOptionData {
  option_key: string;
  option_value: string;
  sort_order?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2BundleComponentOptionData {
  option_key?: string;
  option_value?: string;
  sort_order?: number;
  metadata?: Record<string, unknown>;
}

export interface V2BundleComponentSelectionData {
  component_variant_id: string;
  quantity: number;
}

export interface ValidateV2BundleDefinitionData {
  selected_components?: V2BundleComponentSelectionData[];
}

export interface ResolveV2BundleData {
  bundle_definition_id: string;
  parent_variant_id?: string | null;
  parent_quantity?: number;
  parent_unit_amount?: number | null;
  selected_components?: V2BundleComponentSelectionData[];
}

export interface BuildV2BundleOpsContractData {
  bundle_definition_id: string;
  parent_variant_id?: string | null;
  parent_quantity?: number;
  parent_unit_amount?: number | null;
  selected_components?: V2BundleComponentSelectionData[];
}

export interface BuildV2BundleCanaryReportData {
  definition_ids?: string[];
  sample_parent_quantity?: number;
  sample_parent_unit_amount?: number | null;
}

export interface CreateV2CampaignData {
  code: string;
  name: string;
  description?: string | null;
  campaign_type?: V2CampaignType;
  status?: V2CampaignStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  purchase_limit_json?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2CampaignData {
  code?: string;
  name?: string;
  description?: string | null;
  campaign_type?: V2CampaignType;
  status?: V2CampaignStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  purchase_limit_json?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateV2CampaignTargetData {
  target_type: V2CampaignTargetType;
  target_id: string;
  sort_order?: number;
  is_excluded?: boolean;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2CampaignTargetData {
  target_type?: V2CampaignTargetType;
  target_id?: string;
  sort_order?: number;
  is_excluded?: boolean;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateV2PriceListData {
  campaign_id?: string | null;
  name: string;
  scope_type?: V2PriceListScope;
  status?: V2PriceListStatus;
  currency_code?: string;
  priority?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2PriceListData {
  campaign_id?: string | null;
  rollback_of_price_list_id?: string | null;
  name?: string;
  scope_type?: V2PriceListScope;
  status?: V2PriceListStatus;
  currency_code?: string;
  priority?: number;
  published_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateV2PriceListItemData {
  product_id: string;
  variant_id?: string | null;
  status?: V2PriceItemStatus;
  unit_amount: number;
  compare_at_amount?: number | null;
  min_purchase_quantity?: number;
  max_purchase_quantity?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2PriceListItemData {
  product_id?: string;
  variant_id?: string | null;
  status?: V2PriceItemStatus;
  unit_amount?: number;
  compare_at_amount?: number | null;
  min_purchase_quantity?: number;
  max_purchase_quantity?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateV2PromotionData {
  campaign_id?: string | null;
  name: string;
  description?: string | null;
  promotion_type?: V2PromotionType;
  status?: V2PromotionStatus;
  combinability_mode?: V2CombinabilityMode;
  coupon_required?: boolean;
  priority?: number;
  discount_value: number;
  max_discount_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  purchase_limit_json?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2PromotionData {
  campaign_id?: string | null;
  name?: string;
  description?: string | null;
  promotion_type?: V2PromotionType;
  status?: V2PromotionStatus;
  combinability_mode?: V2CombinabilityMode;
  coupon_required?: boolean;
  priority?: number;
  discount_value?: number;
  max_discount_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  channel_scope_json?: unknown[];
  purchase_limit_json?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateV2PromotionRuleData {
  rule_type: V2PromotionRuleType;
  status?: V2PriceItemStatus;
  sort_order?: number;
  rule_payload?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2PromotionRuleData {
  rule_type?: V2PromotionRuleType;
  status?: V2PriceItemStatus;
  sort_order?: number;
  rule_payload?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateV2CouponData {
  promotion_id?: string | null;
  code: string;
  status?: V2CouponStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  max_issuance?: number | null;
  max_redemptions_per_user?: number;
  channel_scope_json?: unknown[];
  purchase_limit_json?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2CouponData {
  promotion_id?: string | null;
  code?: string;
  status?: V2CouponStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  max_issuance?: number | null;
  max_redemptions_per_user?: number;
  channel_scope_json?: unknown[];
  purchase_limit_json?: Record<string, unknown>;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ValidateV2CouponData {
  code: string;
  user_id?: string | null;
  campaign_id?: string | null;
  channel?: string | null;
  evaluated_at?: string | null;
}

export interface ReserveV2CouponData {
  user_id: string;
  quote_reference?: string | null;
  expires_at?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  source_snapshot_json?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ReleaseV2CouponRedemptionData {
  reason?: string | null;
}

export interface RedeemV2CouponRedemptionData {
  order_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BuildV2PriceQuoteData {
  lines: V2PriceQuoteLineInput[];
  campaign_id?: string | null;
  channel?: string | null;
  coupon_code?: string | null;
  user_id?: string | null;
  shipping_amount?: number | null;
  quote_reference?: string | null;
  evaluated_at?: string | null;
}

export interface PreviewV2BundleData {
  bundle_definition_id: string;
  parent_quantity?: number;
  selected_components?: V2BundleComponentSelectionData[];
}

function buildSearchParams(
  values: Record<string, string | undefined>,
): string {
  const searchParams = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const V2CatalogAdminAPI = {
  async getProjects(
    params: GetV2ProjectsParams = {},
  ): Promise<ApiResponse<V2Project[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/projects${buildSearchParams({
        status: params.status,
      })}`,
    );
  },

  async getProject(id: string): Promise<ApiResponse<V2Project>> {
    return apiClient.get(`/api/v2/catalog/admin/projects/${id}`);
  },

  async createProject(
    data: CreateV2ProjectData,
  ): Promise<ApiResponse<V2Project>> {
    return apiClient.post('/api/v2/catalog/admin/projects', data);
  },

  async updateProject(
    id: string,
    data: UpdateV2ProjectData,
  ): Promise<ApiResponse<V2Project>> {
    return apiClient.patch(`/api/v2/catalog/admin/projects/${id}`, data);
  },

  async publishProject(id: string): Promise<ApiResponse<V2Project>> {
    return apiClient.patch(`/api/v2/catalog/admin/projects/${id}/publish`, {});
  },

  async unpublishProject(id: string): Promise<ApiResponse<V2Project>> {
    return apiClient.patch(`/api/v2/catalog/admin/projects/${id}/unpublish`, {});
  },

  async deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/v2/catalog/admin/projects/${id}`);
  },

  async getArtists(
    params: GetV2ArtistsParams = {},
  ): Promise<ApiResponse<V2Artist[] | V2ProjectArtist[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/artists${buildSearchParams({
        projectId: params.projectId,
      })}`,
    );
  },

  async getArtist(id: string): Promise<ApiResponse<V2Artist>> {
    return apiClient.get(`/api/v2/catalog/admin/artists/${id}`);
  },

  async createArtist(data: CreateV2ArtistData): Promise<ApiResponse<V2Artist>> {
    return apiClient.post('/api/v2/catalog/admin/artists', data);
  },

  async updateArtist(
    id: string,
    data: UpdateV2ArtistData,
  ): Promise<ApiResponse<V2Artist>> {
    return apiClient.patch(`/api/v2/catalog/admin/artists/${id}`, data);
  },

  async linkArtistToProject(
    projectId: string,
    artistId: string,
    data: LinkV2ArtistToProjectData = {},
  ): Promise<ApiResponse<V2ProjectArtist>> {
    return apiClient.post(
      `/api/v2/catalog/admin/projects/${projectId}/artists/${artistId}/link`,
      data,
    );
  },

  async unlinkArtistFromProject(
    projectId: string,
    artistId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(
      `/api/v2/catalog/admin/projects/${projectId}/artists/${artistId}/link`,
    );
  },

  async getProducts(
    params: GetV2ProductsParams = {},
  ): Promise<ApiResponse<V2Product[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/products${buildSearchParams({
        projectId: params.projectId,
        status: params.status,
      })}`,
    );
  },

  async getProduct(id: string): Promise<ApiResponse<V2Product>> {
    return apiClient.get(`/api/v2/catalog/admin/products/${id}`);
  },

  async createProduct(data: CreateV2ProductData): Promise<ApiResponse<V2Product>> {
    return apiClient.post('/api/v2/catalog/admin/products', data);
  },

  async updateProduct(
    id: string,
    data: UpdateV2ProductData,
  ): Promise<ApiResponse<V2Product>> {
    return apiClient.patch(`/api/v2/catalog/admin/products/${id}`, data);
  },

  async deleteProduct(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/v2/catalog/admin/products/${id}`);
  },

  async getVariants(productId: string): Promise<ApiResponse<V2Variant[]>> {
    return apiClient.get(`/api/v2/catalog/admin/products/${productId}/variants`);
  },

  async createVariant(
    productId: string,
    data: CreateV2VariantData,
  ): Promise<ApiResponse<V2Variant>> {
    return apiClient.post(`/api/v2/catalog/admin/products/${productId}/variants`, data);
  },

  async updateVariant(
    variantId: string,
    data: UpdateV2VariantData,
  ): Promise<ApiResponse<V2Variant>> {
    return apiClient.patch(`/api/v2/catalog/admin/variants/${variantId}`, data);
  },

  async deleteVariant(
    variantId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/v2/catalog/admin/variants/${variantId}`);
  },

  async getMediaAssets(
    params: GetV2MediaAssetsParams = {},
  ): Promise<ApiResponse<V2MediaAsset[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/media-assets${buildSearchParams({
        kind: params.kind,
        status: params.status,
        search: params.search,
      })}`,
    );
  },

  async createMediaAsset(
    data: CreateV2MediaAssetData,
  ): Promise<ApiResponse<V2MediaAsset>> {
    return apiClient.post('/api/v2/catalog/admin/media-assets', data);
  },

  async updateMediaAsset(
    mediaAssetId: string,
    data: UpdateV2MediaAssetData,
  ): Promise<ApiResponse<V2MediaAsset>> {
    return apiClient.patch(`/api/v2/catalog/admin/media-assets/${mediaAssetId}`, data);
  },

  async uploadMediaAssetFile(
    data: UploadV2MediaAssetFileData,
  ): Promise<ApiResponse<V2MediaAsset>> {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.asset_kind) {
      formData.append('asset_kind', data.asset_kind);
    }
    if (data.status) {
      formData.append('status', data.status);
    }
    if (data.metadata && Object.keys(data.metadata).length > 0) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }
    return apiClient.post('/api/v2/catalog/admin/media-assets/upload', formData);
  },

  async getProductMedia(productId: string): Promise<ApiResponse<V2ProductMedia[]>> {
    return apiClient.get(`/api/v2/catalog/admin/products/${productId}/media`);
  },

  async createProductMedia(
    productId: string,
    data: CreateV2MediaData,
  ): Promise<ApiResponse<V2ProductMedia>> {
    return apiClient.post(`/api/v2/catalog/admin/products/${productId}/media`, data);
  },

  async updateProductMedia(
    mediaId: string,
    data: UpdateV2MediaData,
  ): Promise<ApiResponse<V2ProductMedia>> {
    return apiClient.patch(`/api/v2/catalog/admin/media/${mediaId}`, data);
  },

  async deactivateProductMedia(
    mediaId: string,
  ): Promise<ApiResponse<V2ProductMedia>> {
    return apiClient.post(`/api/v2/catalog/admin/media/${mediaId}/deactivate`, {});
  },

  async getVariantAssets(
    variantId: string,
  ): Promise<ApiResponse<V2DigitalAsset[]>> {
    return apiClient.get(`/api/v2/catalog/admin/variants/${variantId}/assets`);
  },

  async createDigitalAsset(
    variantId: string,
    data: CreateV2DigitalAssetData,
  ): Promise<ApiResponse<V2DigitalAsset>> {
    return apiClient.post(`/api/v2/catalog/admin/variants/${variantId}/assets`, data);
  },

  async updateDigitalAsset(
    assetId: string,
    data: UpdateV2DigitalAssetData,
  ): Promise<ApiResponse<V2DigitalAsset>> {
    return apiClient.patch(`/api/v2/catalog/admin/assets/${assetId}`, data);
  },

  async activateDigitalAsset(
    assetId: string,
  ): Promise<ApiResponse<V2DigitalAsset>> {
    return apiClient.post(`/api/v2/catalog/admin/assets/${assetId}/activate`, {});
  },

  async deactivateDigitalAsset(
    assetId: string,
  ): Promise<ApiResponse<V2DigitalAsset>> {
    return apiClient.post(`/api/v2/catalog/admin/assets/${assetId}/deactivate`, {});
  },

  async getBundleDefinitions(
    params: GetV2BundleDefinitionsParams = {},
  ): Promise<ApiResponse<V2BundleDefinition[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/bundles/definitions${buildSearchParams({
        bundleProductId: params.bundleProductId,
        status: params.status,
      })}`,
    );
  },

  async getBundleDefinition(
    definitionId: string,
  ): Promise<ApiResponse<V2BundleDefinition>> {
    return apiClient.get(`/api/v2/catalog/admin/bundles/definitions/${definitionId}`);
  },

  async createBundleDefinition(
    data: CreateV2BundleDefinitionData,
  ): Promise<ApiResponse<V2BundleDefinition>> {
    return apiClient.post('/api/v2/catalog/admin/bundles/definitions', data);
  },

  async updateBundleDefinition(
    definitionId: string,
    data: UpdateV2BundleDefinitionData,
  ): Promise<ApiResponse<V2BundleDefinition>> {
    return apiClient.patch(
      `/api/v2/catalog/admin/bundles/definitions/${definitionId}`,
      data,
    );
  },

  async publishBundleDefinition(
    definitionId: string,
  ): Promise<ApiResponse<V2BundleDefinition>> {
    return apiClient.post(
      `/api/v2/catalog/admin/bundles/definitions/${definitionId}/publish`,
      {},
    );
  },

  async archiveBundleDefinition(
    definitionId: string,
  ): Promise<ApiResponse<V2BundleDefinition>> {
    return apiClient.post(
      `/api/v2/catalog/admin/bundles/definitions/${definitionId}/archive`,
      {},
    );
  },

  async cloneBundleDefinitionVersion(
    definitionId: string,
    data: CloneV2BundleDefinitionVersionData = {},
  ): Promise<ApiResponse<V2BundleDefinition>> {
    return apiClient.post(
      `/api/v2/catalog/admin/bundles/definitions/${definitionId}/clone-version`,
      data,
    );
  },

  async getBundleComponents(
    definitionId: string,
  ): Promise<ApiResponse<V2BundleComponent[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/bundles/definitions/${definitionId}/components`,
    );
  },

  async createBundleComponent(
    definitionId: string,
    data: CreateV2BundleComponentData,
  ): Promise<ApiResponse<V2BundleComponent>> {
    return apiClient.post(
      `/api/v2/catalog/admin/bundles/definitions/${definitionId}/components`,
      data,
    );
  },

  async updateBundleComponent(
    componentId: string,
    data: UpdateV2BundleComponentData,
  ): Promise<ApiResponse<V2BundleComponent>> {
    return apiClient.patch(`/api/v2/catalog/admin/bundles/components/${componentId}`, data);
  },

  async deleteBundleComponent(
    componentId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/v2/catalog/admin/bundles/components/${componentId}`);
  },

  async createBundleComponentOption(
    componentId: string,
    data: CreateV2BundleComponentOptionData,
  ): Promise<ApiResponse<V2BundleComponentOption>> {
    return apiClient.post(`/api/v2/catalog/admin/bundles/components/${componentId}/options`, data);
  },

  async updateBundleComponentOption(
    optionId: string,
    data: UpdateV2BundleComponentOptionData,
  ): Promise<ApiResponse<V2BundleComponentOption>> {
    return apiClient.patch(`/api/v2/catalog/admin/bundles/component-options/${optionId}`, data);
  },

  async deleteBundleComponentOption(
    optionId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/v2/catalog/admin/bundles/component-options/${optionId}`);
  },

  async validateBundleDefinition(
    definitionId: string,
    data: ValidateV2BundleDefinitionData = {},
  ): Promise<ApiResponse<V2BundleValidationResult>> {
    return apiClient.post(
      `/api/v2/catalog/admin/bundles/definitions/${definitionId}/validate`,
      data,
    );
  },

  async previewBundle(
    data: PreviewV2BundleData,
  ): Promise<ApiResponse<V2BundleResolveResult>> {
    return apiClient.post('/api/v2/catalog/admin/bundles/preview', data);
  },

  async resolveBundle(
    data: ResolveV2BundleData,
  ): Promise<ApiResponse<V2BundleResolveResult>> {
    return apiClient.post('/api/v2/catalog/admin/bundles/resolve', data);
  },

  async buildBundleOpsContract(
    data: BuildV2BundleOpsContractData,
  ): Promise<ApiResponse<V2BundleOpsContractResult>> {
    return apiClient.post('/api/v2/catalog/admin/bundles/ops-contract', data);
  },

  async buildBundleCanaryReport(
    data: BuildV2BundleCanaryReportData = {},
  ): Promise<ApiResponse<V2BundleCanaryReportResult>> {
    return apiClient.post('/api/v2/catalog/admin/bundles/canary-report', data);
  },

  async getProductPublishReadiness(
    productId: string,
  ): Promise<ApiResponse<ProductPublishReadiness>> {
    return apiClient.get(
      `/api/v2/catalog/admin/products/${productId}/publish-readiness`,
    );
  },

  async getCampaigns(
    params: GetV2CampaignsParams = {},
  ): Promise<ApiResponse<V2Campaign[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/campaigns${buildSearchParams({
        status: params.status,
        campaignType: params.campaignType,
      })}`,
    );
  },

  async getCampaign(id: string): Promise<ApiResponse<V2Campaign>> {
    return apiClient.get(`/api/v2/catalog/admin/campaigns/${id}`);
  },

  async createCampaign(
    data: CreateV2CampaignData,
  ): Promise<ApiResponse<V2Campaign>> {
    return apiClient.post('/api/v2/catalog/admin/campaigns', data);
  },

  async updateCampaign(
    id: string,
    data: UpdateV2CampaignData,
  ): Promise<ApiResponse<V2Campaign>> {
    return apiClient.patch(`/api/v2/catalog/admin/campaigns/${id}`, data);
  },

  async activateCampaign(id: string): Promise<ApiResponse<V2Campaign>> {
    return apiClient.post(`/api/v2/catalog/admin/campaigns/${id}/activate`, {});
  },

  async suspendCampaign(id: string): Promise<ApiResponse<V2Campaign>> {
    return apiClient.post(`/api/v2/catalog/admin/campaigns/${id}/suspend`, {});
  },

  async closeCampaign(id: string): Promise<ApiResponse<V2Campaign>> {
    return apiClient.post(`/api/v2/catalog/admin/campaigns/${id}/close`, {});
  },

  async getCampaignTargets(
    campaignId: string,
  ): Promise<ApiResponse<V2CampaignTarget[]>> {
    return apiClient.get(`/api/v2/catalog/admin/campaigns/${campaignId}/targets`);
  },

  async createCampaignTarget(
    campaignId: string,
    data: CreateV2CampaignTargetData,
  ): Promise<ApiResponse<V2CampaignTarget>> {
    return apiClient.post(`/api/v2/catalog/admin/campaigns/${campaignId}/targets`, data);
  },

  async updateCampaignTarget(
    targetId: string,
    data: UpdateV2CampaignTargetData,
  ): Promise<ApiResponse<V2CampaignTarget>> {
    return apiClient.patch(`/api/v2/catalog/admin/campaign-targets/${targetId}`, data);
  },

  async deleteCampaignTarget(
    targetId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/api/v2/catalog/admin/campaign-targets/${targetId}`);
  },

  async getPriceLists(
    params: GetV2PriceListsParams = {},
  ): Promise<ApiResponse<V2PriceList[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/price-lists${buildSearchParams({
        campaignId: params.campaignId,
        scopeType: params.scopeType,
        status: params.status,
      })}`,
    );
  },

  async getPriceList(id: string): Promise<ApiResponse<V2PriceList>> {
    return apiClient.get(`/api/v2/catalog/admin/price-lists/${id}`);
  },

  async createPriceList(
    data: CreateV2PriceListData,
  ): Promise<ApiResponse<V2PriceList>> {
    return apiClient.post('/api/v2/catalog/admin/price-lists', data);
  },

  async updatePriceList(
    id: string,
    data: UpdateV2PriceListData,
  ): Promise<ApiResponse<V2PriceList>> {
    return apiClient.patch(`/api/v2/catalog/admin/price-lists/${id}`, data);
  },

  async publishPriceList(id: string): Promise<ApiResponse<V2PriceList>> {
    return apiClient.post(`/api/v2/catalog/admin/price-lists/${id}/publish`, {});
  },

  async rollbackPriceList(
    id: string,
  ): Promise<
    ApiResponse<{
      rolled_back_price_list: V2PriceList;
      restored_price_list: V2PriceList;
    }>
  > {
    return apiClient.post(`/api/v2/catalog/admin/price-lists/${id}/rollback`, {});
  },

  async getPriceListItems(
    priceListId: string,
  ): Promise<ApiResponse<V2PriceListItem[]>> {
    return apiClient.get(`/api/v2/catalog/admin/price-lists/${priceListId}/items`);
  },

  async createPriceListItem(
    priceListId: string,
    data: CreateV2PriceListItemData,
  ): Promise<ApiResponse<V2PriceListItem>> {
    return apiClient.post(`/api/v2/catalog/admin/price-lists/${priceListId}/items`, data);
  },

  async updatePriceListItem(
    itemId: string,
    data: UpdateV2PriceListItemData,
  ): Promise<ApiResponse<V2PriceListItem>> {
    return apiClient.patch(`/api/v2/catalog/admin/price-list-items/${itemId}`, data);
  },

  async deactivatePriceListItem(
    itemId: string,
  ): Promise<ApiResponse<V2PriceListItem>> {
    return apiClient.post(`/api/v2/catalog/admin/price-list-items/${itemId}/deactivate`, {});
  },

  async getPromotions(
    params: GetV2PromotionsParams = {},
  ): Promise<ApiResponse<V2Promotion[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/promotions${buildSearchParams({
        campaignId: params.campaignId,
        status: params.status,
        couponRequired:
          params.couponRequired === undefined
            ? undefined
            : String(params.couponRequired),
      })}`,
    );
  },

  async getPromotion(id: string): Promise<ApiResponse<V2Promotion>> {
    return apiClient.get(`/api/v2/catalog/admin/promotions/${id}`);
  },

  async createPromotion(
    data: CreateV2PromotionData,
  ): Promise<ApiResponse<V2Promotion>> {
    return apiClient.post('/api/v2/catalog/admin/promotions', data);
  },

  async updatePromotion(
    id: string,
    data: UpdateV2PromotionData,
  ): Promise<ApiResponse<V2Promotion>> {
    return apiClient.patch(`/api/v2/catalog/admin/promotions/${id}`, data);
  },

  async getPromotionRules(
    promotionId: string,
  ): Promise<ApiResponse<V2PromotionRule[]>> {
    return apiClient.get(`/api/v2/catalog/admin/promotions/${promotionId}/rules`);
  },

  async createPromotionRule(
    promotionId: string,
    data: CreateV2PromotionRuleData,
  ): Promise<ApiResponse<V2PromotionRule>> {
    return apiClient.post(`/api/v2/catalog/admin/promotions/${promotionId}/rules`, data);
  },

  async updatePromotionRule(
    ruleId: string,
    data: UpdateV2PromotionRuleData,
  ): Promise<ApiResponse<V2PromotionRule>> {
    return apiClient.patch(`/api/v2/catalog/admin/promotion-rules/${ruleId}`, data);
  },

  async getCoupons(
    params: GetV2CouponsParams = {},
  ): Promise<ApiResponse<V2Coupon[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/coupons${buildSearchParams({
        promotionId: params.promotionId,
        status: params.status,
      })}`,
    );
  },

  async getCoupon(id: string): Promise<ApiResponse<V2Coupon>> {
    return apiClient.get(`/api/v2/catalog/admin/coupons/${id}`);
  },

  async createCoupon(data: CreateV2CouponData): Promise<ApiResponse<V2Coupon>> {
    return apiClient.post('/api/v2/catalog/admin/coupons', data);
  },

  async updateCoupon(
    id: string,
    data: UpdateV2CouponData,
  ): Promise<ApiResponse<V2Coupon>> {
    return apiClient.patch(`/api/v2/catalog/admin/coupons/${id}`, data);
  },

  async getCouponRedemptions(
    params: GetV2CouponRedemptionsParams = {},
  ): Promise<ApiResponse<V2CouponRedemption[]>> {
    return apiClient.get(
      `/api/v2/catalog/admin/coupon-redemptions${buildSearchParams({
        couponId: params.couponId,
        userId: params.userId,
        status: params.status,
        quoteReference: params.quoteReference,
      })}`,
    );
  },

  async validateCoupon(
    data: ValidateV2CouponData,
  ): Promise<ApiResponse<V2CouponValidationResult>> {
    return apiClient.post('/api/v2/catalog/admin/coupons/validate', data);
  },

  async reserveCoupon(
    couponId: string,
    data: ReserveV2CouponData,
  ): Promise<
    ApiResponse<{
      coupon: V2Coupon;
      redemption: V2CouponRedemption;
    }>
  > {
    return apiClient.post(`/api/v2/catalog/admin/coupons/${couponId}/reserve`, data);
  },

  async releaseCouponRedemption(
    redemptionId: string,
    data: ReleaseV2CouponRedemptionData = {},
  ): Promise<
    ApiResponse<{
      coupon: V2Coupon;
      redemption: V2CouponRedemption;
    }>
  > {
    return apiClient.post(
      `/api/v2/catalog/admin/coupon-redemptions/${redemptionId}/release`,
      data,
    );
  },

  async redeemCouponRedemption(
    redemptionId: string,
    data: RedeemV2CouponRedemptionData = {},
  ): Promise<
    ApiResponse<{
      coupon: V2Coupon;
      redemption: V2CouponRedemption;
    }>
  > {
    return apiClient.post(
      `/api/v2/catalog/admin/coupon-redemptions/${redemptionId}/redeem`,
      data,
    );
  },

  async buildPriceQuote(
    data: BuildV2PriceQuoteData,
  ): Promise<ApiResponse<V2PriceQuoteResult>> {
    return apiClient.post('/api/v2/catalog/admin/pricing/quote', data);
  },

  async evaluatePromotions(
    data: BuildV2PriceQuoteData,
  ): Promise<
    ApiResponse<{
      quote_reference: string;
      evaluated_at: string;
      coupon: V2CouponValidationResult | null;
      promotion_evaluations: V2PriceQuoteResult['promotion_evaluations'];
      applied_promotions: V2PriceQuoteResult['applied_promotions'];
      summary: V2PriceQuoteResult['summary'];
    }>
  > {
    return apiClient.post('/api/v2/catalog/admin/pricing/promotions/evaluate', data);
  },

  async getPricingDebugTrace(
    data: BuildV2PriceQuoteData,
  ): Promise<ApiResponse<V2PriceQuoteResult>> {
    return apiClient.post('/api/v2/catalog/admin/pricing/debug', data);
  },

  async getOrderSnapshotContract(): Promise<ApiResponse<V2OrderSnapshotContract>> {
    return apiClient.get('/api/v2/catalog/admin/pricing/order-snapshot-contract');
  },

  async getMigrationCompareReport(
    sampleLimit = 20,
  ): Promise<ApiResponse<MigrationCompareReport>> {
    return apiClient.get(
      `/api/v2/catalog/admin/migration/compare-report${buildSearchParams({
        sampleLimit: String(sampleLimit),
      })}`,
    );
  },

  async getReadSwitchChecklist(
    sampleLimit = 20,
  ): Promise<ApiResponse<ReadSwitchChecklist>> {
    return apiClient.get(
      `/api/v2/catalog/admin/migration/read-switch-checklist${buildSearchParams({
        sampleLimit: String(sampleLimit),
      })}`,
    );
  },

  async getReadSwitchRemediationTasks(
    sampleLimit = 20,
  ): Promise<ApiResponse<ReadSwitchRemediationTaskReport>> {
    return apiClient.get(
      `/api/v2/catalog/admin/migration/remediation-tasks${buildSearchParams({
        sampleLimit: String(sampleLimit),
      })}`,
    );
  },
};
