'use client';

import { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  V2ProjectProductListItem,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
  VARIANT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

type ProjectProductsBulkTableProps = {
  products: V2ProjectProductListItem[];
  selectedProductIds: string[];
  allProductsSelected: boolean;
  hasPartialSelection: boolean;
  isSelectionDisabled?: boolean;
  onToggleProduct: (productId: string, checked: boolean) => void;
  onToggleAllProducts: (checked: boolean) => void;
  onOpenDetail: (productId: string) => void;
};

function resolveProductStatusIntent(status: V2ProjectProductListItem['status']) {
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

function resolveProductKindIntent(kind: V2ProjectProductListItem['product_kind']) {
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

function summarizeVariantStatuses(
  variantCount: number,
  statusCounts: Record<V2VariantStatus, number>,
): string {
  if (variantCount === 0) {
    return '옵션 없음';
  }

  return (['ACTIVE', 'DRAFT', 'INACTIVE'] as const)
    .filter((status) => statusCounts[status] > 0)
    .map((status) => `${VARIANT_STATUS_LABELS[status]} ${statusCounts[status]}개`)
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
  const selectedProductIdSet = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds],
  );

  return (
    <div className="space-y-4">
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
              const coverMedia = product.cover_media;

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
                      <Badge intent="info" size="sm">{product.variant_count}개</Badge>
                      <p className="mt-2 text-xs text-gray-500">
                        {summarizeVariantStatuses(
                          product.variant_count,
                          product.variant_status_counts,
                        )}
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
