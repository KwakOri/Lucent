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
export type V2BundleMode = 'FIXED' | 'CUSTOMIZABLE';
export type V2BundleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type V2BundlePricingStrategy = 'WEIGHTED' | 'FIXED_AMOUNT';
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
}

export interface V2DigitalAsset {
  id: string;
  variant_id: string;
  asset_role: V2AssetRole;
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

export interface GetV2BundleDefinitionsParams {
  bundleProductId?: string;
  status?: V2BundleStatus;
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
  storage_path: string;
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
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version_no?: number;
  checksum?: string | null;
  status?: V2DigitalAssetStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateV2DigitalAssetData {
  file_name?: string;
  storage_path?: string;
  mime_type?: string;
  file_size?: number;
  checksum?: string | null;
  status?: V2DigitalAssetStatus;
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

  async getProductPublishReadiness(
    productId: string,
  ): Promise<ApiResponse<ProductPublishReadiness>> {
    return apiClient.get(
      `/api/v2/catalog/admin/products/${productId}/publish-readiness`,
    );
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
