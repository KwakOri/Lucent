'use client';

import { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  V2Product,
  V2ProductMedia,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2AdminProductMediaMap,
  useV2AdminVariantsMap,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  FULFILLMENT_TYPE_LABELS,
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

type ProjectProductsBulkTableProps = {
  products: V2Product[];
  selectedProductIds: string[];
  allProductsSelected: boolean;
  hasPartialSelection: boolean;
  isSelectionDisabled?: boolean;
  onToggleProduct: (productId: string, checked: boolean) => void;
  onToggleAllProducts: (checked: boolean) => void;
  onOpenDetail: (productId: string) => void;
};

function getCoverMedia(mediaList: V2ProductMedia[]): V2ProductMedia | null {
  const active = mediaList.filter((media) => media.status === 'ACTIVE');
  return (
    active.find((media) => media.is_primary) ||
    active.find((media) => media.media_role === 'PRIMARY') ||
    null
  );
}

function resolveProductStatusIntent(status: V2Product['status']) {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'default';
  }
  return 'info';
}

function resolveProductKindIntent(kind: V2Product['product_kind']) {
  return kind === 'BUNDLE' ? 'warning' : 'info';
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeVariants(variants: V2Variant[]): string {
  if (variants.length === 0) {
    return '옵션 없음';
  }

  const fulfillmentCounts = variants.reduce<Record<string, number>>((accumulator, variant) => {
    const label = FULFILLMENT_TYPE_LABELS[variant.fulfillment_type];
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(fulfillmentCounts)
    .map(([label, count]) => `${label} ${count}개`)
    .join(' · ');
}

export function ProjectProductsBulkTable({
  products,
  selectedProductIds,
  allProductsSelected,
  hasPartialSelection,
  isSelectionDisabled,
  onToggleProduct,
  onToggleAllProducts,
  onOpenDetail,
}: ProjectProductsBulkTableProps) {
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const selectedProductIdSet = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds],
  );
  const {
    variantsByProductId,
    isLoading: variantsLoading,
    isFetching: variantsFetching,
    isError: variantsError,
  } = useV2AdminVariantsMap(productIds);
  const {
    mediaByProductId,
    isError: mediaError,
  } = useV2AdminProductMediaMap(productIds);

  return (
    <div className="space-y-4">
      {variantsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          옵션 정보를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}
      {mediaError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          상품 이미지 정보를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-2 text-left font-semibold text-gray-700">
                <Checkbox
                  size="sm"
                  checked={allProductsSelected}
                  indeterminate={hasPartialSelection}
                  disabled={isSelectionDisabled || products.length === 0}
                  label={<span className="sr-only">현재 목록 상품 전체 선택</span>}
                  onChange={(event) => onToggleAllProducts(event.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">커버</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">상품</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">상태</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">한 줄 설명</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">옵션</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">편집</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {products.map((product) => {
              const productVariants = variantsByProductId[product.id] || [];
              const coverMedia = getCoverMedia(mediaByProductId[product.id] || []);
              const isVariantSummaryLoading = variantsLoading || variantsFetching;

              return (
                <tr key={product.id} className="align-top">
                  <td className="px-3 py-3">
                    <Checkbox
                      size="sm"
                      checked={selectedProductIdSet.has(product.id)}
                      disabled={isSelectionDisabled}
                      label={<span className="sr-only">{product.title} 선택</span>}
                      onChange={(event) =>
                        onToggleProduct(product.id, event.target.checked)
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {coverMedia?.public_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- project policy uses native img instead of next/image.
                        <img
                          src={coverMedia.public_url}
                          alt={coverMedia.alt_text || `${product.title} 대표 이미지`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                          없음
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="min-w-[260px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge intent={resolveProductKindIntent(product.product_kind)}>
                          {PRODUCT_KIND_LABELS[product.product_kind]}
                        </Badge>
                        <p className="font-semibold text-gray-900">{product.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">/{product.slug}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        최근 수정 {formatDateTime(product.updated_at)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge intent={resolveProductStatusIntent(product.status)}>
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <p className="min-w-[240px] max-w-[360px] text-sm leading-6 text-gray-600">
                      {product.short_description || '한 줄 설명이 없습니다.'}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="min-w-[160px]">
                      <Badge intent="info" size="sm">{productVariants.length}개</Badge>
                      <p className="mt-2 text-xs text-gray-500">
                        {isVariantSummaryLoading ? '옵션 확인 중' : summarizeVariants(productVariants)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      size="sm"
                      intent="neutral"
                      className="h-9 w-9 px-0"
                      aria-label={`${product.title} 상세 편집`}
                      title="상세 편집"
                      onClick={() => onOpenDetail(product.id)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
