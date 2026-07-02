'use client';

import { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  adminButtonClass,
  adminTableBodyClass,
  adminTableContainerClass,
  adminTableHeadCellClass,
  adminTableHeadClass,
} from '@/src/components/admin/AdminDesignSystem';
import type { V2ProjectProductListItem } from '@/lib/client/api/v2-catalog-admin.api';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
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

function CountTile({
  value,
  label,
  tone = 'neutral',
}: {
  value: number;
  label: string;
  tone?: 'neutral' | 'active';
}) {
  const toneClass =
    tone === 'active'
      ? 'border-[#cde8d5] bg-[#edf8ef] text-[#2c7a3f]'
      : 'border-[#dbe8fb] bg-[#edf4ff] text-[#2563eb]';

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border text-sm font-black ${toneClass}`}
      aria-label={`${label} ${value}`}
      title={`${label} ${value}`}
    >
      {value}
    </div>
  );
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
      <div className={`overflow-x-auto ${adminTableContainerClass}`}>
        <table className="w-full min-w-[1180px] text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="w-12 px-3 py-2 text-left font-bold text-[#1a1a2e]/55">
                <Checkbox
                  size="sm"
                  checked={allProductsSelected}
                  indeterminate={hasPartialSelection}
                  disabled={isSelectionDisabled || products.length === 0}
                  label={<span className="sr-only">현재 목록 상품 전체 선택</span>}
                  onChange={(event) => onToggleAllProducts(event.target.checked)}
                />
              </th>
              <th className={adminTableHeadCellClass}>커버</th>
              <th className={adminTableHeadCellClass}>상품</th>
              <th className={adminTableHeadCellClass}>상태</th>
              <th className={adminTableHeadCellClass}>한 줄 설명</th>
              <th className={adminTableHeadCellClass}>옵션 수</th>
              <th className={adminTableHeadCellClass}>활성 옵션</th>
              <th className={`${adminTableHeadCellClass} text-right`}>편집</th>
            </tr>
          </thead>
          <tbody className={adminTableBodyClass}>
            {products.map((product) => {
              const coverMedia = product.cover_media;
              const isSelected = selectedProductIdSet.has(product.id);

              return (
                <tr
                  key={product.id}
                  className={`align-middle transition-colors ${isSelected ? 'bg-[#fff8e6]' : 'bg-white'}`}
                >
                  <td className="px-3 py-3 align-middle">
                    <Checkbox
                      size="sm"
                      checked={isSelected}
                      disabled={isSelectionDisabled}
                      label={<span className="sr-only">{product.title} 선택</span>}
                      onChange={(event) =>
                        onToggleProduct(product.id, event.target.checked)
                      }
                    />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="h-14 w-14 overflow-hidden rounded-[12px] border border-[#e7e3d3] bg-[#faf9f3]">
                      {coverMedia?.public_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- project policy uses native img instead of next/image.
                        <img
                          src={coverMedia.public_url}
                          alt={coverMedia.alt_text || `${product.title} 대표 이미지`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#1a1a2e]/35">
                          없음
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge intent={resolveProductKindIntent(product.product_kind)}>
                          {PRODUCT_KIND_LABELS[product.product_kind]}
                        </Badge>
                        <p className="font-black text-[#1a1a2e]">{product.title}</p>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">
                        최근 수정 {formatDateTime(product.updated_at)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Badge intent={resolveProductStatusIntent(product.status)}>
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <p className="min-w-[190px] max-w-[300px] text-sm font-medium leading-6 text-[#1a1a2e]/60">
                      {product.short_description || '한 줄 설명이 없습니다.'}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <CountTile value={product.variant_count} label="옵션 수" />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <CountTile
                      value={product.variant_status_counts.ACTIVE}
                      label="활성 옵션"
                      tone="active"
                    />
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    <Button
                      size="sm"
                      intent="neutral"
                      className={`${adminButtonClass} !h-12 !w-12 !rounded-[14px] !px-0`}
                      aria-label={`${product.title} 상세 편집`}
                      title="상세 편집"
                      onClick={() => onOpenDetail(product.id)}
                    >
                      <Pencil className="h-5 w-5 stroke-[2.4]" aria-hidden />
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
