import type {
  V2FulfillmentType,
  V2ProductKind,
  V2ProductStatus,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';

const FALLBACK_SLUG = 'product';

function buildStableToken(input: string): string {
  const source = input.trim();

  if (!source) {
    return FALLBACK_SLUG;
  }

  let hash = 0;
  for (const char of source) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return `${FALLBACK_SLUG}-${hash.toString(36).slice(0, 6)}`;
}

export const PRODUCT_KIND_LABELS: Record<V2ProductKind, string> = {
  STANDARD: '개별 상품',
  BUNDLE: '번들 상품',
};

export const PRODUCT_STATUS_LABELS: Record<V2ProductStatus, string> = {
  DRAFT: '임시 저장',
  ACTIVE: '판매 중',
  INACTIVE: '숨김',
  ARCHIVED: '보관됨',
};

export const VARIANT_STATUS_LABELS: Record<V2VariantStatus, string> = {
  DRAFT: '임시 저장',
  ACTIVE: '판매 중',
  INACTIVE: '숨김',
};

export const FULFILLMENT_TYPE_LABELS: Record<V2FulfillmentType, string> = {
  DIGITAL: '디지털',
  PHYSICAL: '실물 배송',
};

export function toKebabCase(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || buildStableToken(input);
}

export function buildProductSlug(title: string): string {
  return toKebabCase(title);
}

export function buildVariantSku(params: {
  productSlug: string;
  variantTitle: string;
  fulfillmentType: V2FulfillmentType;
}): string {
  const productPart = toKebabCase(params.productSlug);
  const titlePart = toKebabCase(params.variantTitle);
  const typePart = params.fulfillmentType === 'DIGITAL' ? 'dig' : 'phy';

  return `${productPart}-${titlePart}-${typePart}`.slice(0, 80);
}
