import type {
  V2Campaign,
  V2CampaignTarget,
  V2CampaignType,
  V2Product,
} from '@/lib/client/api/v2-catalog-admin.api';

function resolveTargetProductId(target: V2CampaignTarget): string | null {
  if (target.target_type === 'PRODUCT') {
    return target.target_id;
  }

  if (target.target_type === 'VARIANT' || target.target_type === 'BUNDLE_DEFINITION') {
    const snapshot = target.source_snapshot_json as {
      product_id?: unknown;
      bundle_product_id?: unknown;
      target_product_id?: unknown;
    } | null;
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    if (typeof snapshot.product_id === 'string' && snapshot.product_id.trim().length > 0) {
      return snapshot.product_id;
    }
    if (
      typeof snapshot.bundle_product_id === 'string' &&
      snapshot.bundle_product_id.trim().length > 0
    ) {
      return snapshot.bundle_product_id;
    }
    if (
      typeof snapshot.target_product_id === 'string' &&
      snapshot.target_product_id.trim().length > 0
    ) {
      return snapshot.target_product_id;
    }
  }

  return null;
}

export function buildCampaignProjectIdSet(params: {
  campaign: V2Campaign;
  targets: V2CampaignTarget[];
  productsById: Map<string, V2Product>;
}): Set<string> {
  const includeProjectIds = new Set<string>();

  params.targets
    .filter((target) => !target.is_excluded)
    .forEach((target) => {
      if (target.target_type === 'PROJECT') {
        includeProjectIds.add(target.target_id);
        return;
      }

      const productId = resolveTargetProductId(target);
      if (!productId) {
        return;
      }

      const projectId = params.productsById.get(productId)?.project_id;
      if (projectId) {
        includeProjectIds.add(projectId);
      }
    });

  if (includeProjectIds.size === 0 && params.campaign.source_id) {
    includeProjectIds.add(params.campaign.source_id);
  }

  return includeProjectIds;
}

export function resolveEligibleCampaignProducts(params: {
  campaignType: V2CampaignType;
  campaignSourceId?: string | null;
  targets: V2CampaignTarget[];
  products: V2Product[];
}): V2Product[] {
  const activeProducts = params.products.filter(
    (product) => product.status === 'ACTIVE' || product.status === 'DRAFT',
  );

  const includeProjectIds = new Set<string>();
  const includeProductIds = new Set<string>();
  const excludeProjectIds = new Set<string>();
  const excludeProductIds = new Set<string>();

  params.targets.forEach((target) => {
    const projectBucket = target.is_excluded ? excludeProjectIds : includeProjectIds;
    const productBucket = target.is_excluded ? excludeProductIds : includeProductIds;

    if (target.target_type === 'PROJECT') {
      projectBucket.add(target.target_id);
      return;
    }

    const productId = resolveTargetProductId(target);
    if (productId) {
      productBucket.add(productId);
    }
  });

  const hasIncludeTargets = includeProjectIds.size > 0 || includeProductIds.size > 0;
  const normalizedCampaignSourceId =
    typeof params.campaignSourceId === 'string' && params.campaignSourceId.trim().length > 0
      ? params.campaignSourceId.trim()
      : null;
  const hasSourceProjectMatch =
    normalizedCampaignSourceId !== null &&
    activeProducts.some((product) => product.project_id === normalizedCampaignSourceId);

  let candidates = activeProducts;
  if (params.campaignType === 'ALWAYS_ON') {
    if (includeProjectIds.size > 0) {
      candidates = activeProducts.filter((product) => includeProjectIds.has(product.project_id));
    } else if (includeProductIds.size > 0) {
      candidates = activeProducts.filter((product) => includeProductIds.has(product.id));
    } else if (hasSourceProjectMatch && normalizedCampaignSourceId) {
      candidates = activeProducts.filter(
        (product) => product.project_id === normalizedCampaignSourceId,
      );
    }
  } else if (hasIncludeTargets) {
    candidates = activeProducts.filter(
      (product) =>
        includeProjectIds.has(product.project_id) || includeProductIds.has(product.id),
    );
  }

  const filtered = candidates.filter((product) => {
    if (excludeProjectIds.has(product.project_id)) {
      return false;
    }
    if (excludeProductIds.has(product.id)) {
      return false;
    }
    return true;
  });

  return filtered.sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.title.localeCompare(right.title, 'ko');
  });
}

export function buildProductsByIdMap(products: V2Product[]): Map<string, V2Product> {
  return new Map(products.map((product) => [product.id, product]));
}
