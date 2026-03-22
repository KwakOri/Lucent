'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  V2PriceList,
  V2PriceListItem,
  V2Product,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import { useV2AdminVariantsMap } from '@/lib/client/hooks/useV2CatalogAdmin';
import { useV2AdminUpsertInventoryLevel } from '@/lib/client/hooks/useV2AdminOps';
import {
  FULFILLMENT_TYPE_LABELS,
  VARIANT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

export type SaveCampaignVariantPriceParams = {
  product: V2Product;
  variant: V2Variant;
  unitAmount: number;
  baseItem: V2PriceListItem | null;
  campaignItem: V2PriceListItem | null;
};

type CampaignPricingBulkTableProps = {
  products: V2Product[];
  isAlwaysOnCampaign: boolean;
  baseItems: V2PriceListItem[];
  campaignItems: V2PriceListItem[];
  basePriceListsById: Map<string, V2PriceList>;
  defaultStockLocationId: string | null;
  onSavePrice: (params: SaveCampaignVariantPriceParams) => Promise<void>;
};

type VariantPricingRow = {
  product: V2Product;
  variant: V2Variant;
  baseItem: V2PriceListItem | null;
  campaignItem: V2PriceListItem | null;
  configured: boolean;
};

type DirtyMap = Record<string, true>;

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function pickBestPriceItem(
  items: V2PriceListItem[],
  priceListsById: Map<string, V2PriceList>,
): V2PriceListItem | null {
  if (items.length === 0) {
    return null;
  }

  const sorted = [...items].sort((left, right) => {
    const leftList = priceListsById.get(left.price_list_id);
    const rightList = priceListsById.get(right.price_list_id);

    const priorityDiff = (rightList?.priority || 0) - (leftList?.priority || 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const leftPublished = leftList?.published_at ? new Date(leftList.published_at).getTime() : 0;
    const rightPublished = rightList?.published_at ? new Date(rightList.published_at).getTime() : 0;
    if (leftPublished !== rightPublished) {
      return rightPublished - leftPublished;
    }

    return right.created_at.localeCompare(left.created_at);
  });

  return sorted[0] || null;
}

function findPriceItem(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string;
  priceListsById?: Map<string, V2PriceList>;
}): V2PriceListItem | null {
  const matched = params.items.filter(
    (item) =>
      item.status === 'ACTIVE' &&
      item.product_id === params.productId &&
      (item.variant_id === params.variantId || item.variant_id === null),
  );
  if (matched.length === 0) {
    return null;
  }

  const exact = matched.filter((item) => item.variant_id === params.variantId);
  if (exact.length > 0) {
    if (params.priceListsById) {
      return pickBestPriceItem(exact, params.priceListsById);
    }
    return exact[0] || null;
  }

  if (params.priceListsById) {
    return pickBestPriceItem(matched, params.priceListsById);
  }
  return matched[0] || null;
}

function setDirtyFlag(previous: DirtyMap, id: string, isDirty: boolean): DirtyMap {
  if (isDirty) {
    if (previous[id]) {
      return previous;
    }
    return {
      ...previous,
      [id]: true,
    };
  }

  if (!previous[id]) {
    return previous;
  }

  const next = {
    ...previous,
  };
  delete next[id];
  return next;
}

export function CampaignPricingBulkTable({
  products,
  isAlwaysOnCampaign,
  baseItems,
  campaignItems,
  basePriceListsById,
  defaultStockLocationId,
  onSavePrice,
}: CampaignPricingBulkTableProps) {
  const [expandedProducts, setExpandedProducts] = useState<DirtyMap>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [dirtyPriceVariantIds, setDirtyPriceVariantIds] = useState<DirtyMap>({});
  const [dirtyStockVariantIds, setDirtyStockVariantIds] = useState<DirtyMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const {
    variantsByProductId,
    isLoading: variantsLoading,
    isFetching: variantsFetching,
    isError: variantsError,
  } = useV2AdminVariantsMap(productIds);

  const upsertInventoryLevel = useV2AdminUpsertInventoryLevel();

  const variantRowsByProductId = useMemo(() => {
    const result: Record<string, VariantPricingRow[]> = {};

    products.forEach((product) => {
      const variants = variantsByProductId[product.id] || [];
      result[product.id] = variants.map((variant) => {
        const baseItem = findPriceItem({
          items: baseItems,
          productId: product.id,
          variantId: variant.id,
          priceListsById: basePriceListsById,
        });
        const campaignItem = findPriceItem({
          items: campaignItems,
          productId: product.id,
          variantId: variant.id,
        });
        const configured = isAlwaysOnCampaign ? Boolean(campaignItem) : Boolean(baseItem || campaignItem);

        return {
          product,
          variant,
          baseItem,
          campaignItem,
          configured,
        };
      });
    });

    return result;
  }, [baseItems, basePriceListsById, campaignItems, isAlwaysOnCampaign, products, variantsByProductId]);

  const variantRowsById = useMemo(() => {
    const map = new Map<string, VariantPricingRow>();
    Object.values(variantRowsByProductId).forEach((rows) => {
      rows.forEach((row) => {
        map.set(row.variant.id, row);
      });
    });
    return map;
  }, [variantRowsByProductId]);

  useEffect(() => {
    if (variantRowsById.size === 0) {
      return;
    }

    setPriceDrafts((previous) => {
      let hasChanges = false;
      const next = {
        ...previous,
      };
      variantRowsById.forEach((row, variantId) => {
        if (next[variantId] !== undefined) {
          return;
        }
        hasChanges = true;
        next[variantId] = String(row.campaignItem?.unit_amount ?? row.baseItem?.unit_amount ?? '');
      });
      return hasChanges ? next : previous;
    });

    setStockDrafts((previous) => {
      let hasChanges = false;
      const next = {
        ...previous,
      };
      variantRowsById.forEach((_, variantId) => {
        if (next[variantId] !== undefined) {
          return;
        }
        hasChanges = true;
        next[variantId] = '';
      });
      return hasChanges ? next : previous;
    });
  }, [variantRowsById]);

  const handlePriceChange = (variantId: string, value: string) => {
    const row = variantRowsById.get(variantId);
    if (!row) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);

    setPriceDrafts((previous) => ({
      ...previous,
      [variantId]: value,
    }));

    const trimmed = value.trim();
    if (!trimmed) {
      setDirtyPriceVariantIds((previous) => setDirtyFlag(previous, variantId, false));
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    const baseline = row.campaignItem?.unit_amount ?? row.baseItem?.unit_amount ?? null;
    const isDirty = !Number.isInteger(parsed) || parsed < 0 || baseline === null || parsed !== baseline;
    setDirtyPriceVariantIds((previous) => setDirtyFlag(previous, variantId, isDirty));
  };

  const handleStockChange = (variantId: string, value: string) => {
    setMessage(null);
    setErrorMessage(null);

    setStockDrafts((previous) => ({
      ...previous,
      [variantId]: value,
    }));

    const hasChanges = value.trim().length > 0;
    setDirtyStockVariantIds((previous) => setDirtyFlag(previous, variantId, hasChanges));
  };

  const pendingPriceCount = Object.keys(dirtyPriceVariantIds).length;
  const pendingStockCount = Object.keys(dirtyStockVariantIds).length;
  const pendingCount = pendingPriceCount + pendingStockCount;

  const handleSaveAll = async () => {
    const pendingPriceIds = Object.keys(dirtyPriceVariantIds);
    const pendingStockIds = Object.keys(dirtyStockVariantIds);

    if (pendingPriceIds.length === 0 && pendingStockIds.length === 0) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const targetVariantIds = Array.from(new Set([...pendingPriceIds, ...pendingStockIds]));

      for (const variantId of targetVariantIds) {
        const row = variantRowsById.get(variantId);
        if (!row) {
          continue;
        }

        if (dirtyPriceVariantIds[variantId]) {
          const raw = (priceDrafts[variantId] || '').trim();
          if (!raw) {
            throw new Error('판매가는 비워둘 수 없습니다.');
          }
          const unitAmount = parseNonNegativeInteger(raw, '판매가');
          await onSavePrice({
            product: row.product,
            variant: row.variant,
            unitAmount,
            baseItem: row.baseItem,
            campaignItem: row.campaignItem,
          });
        }

        if (dirtyStockVariantIds[variantId]) {
          const requiresStockUpdate =
            row.variant.fulfillment_type === 'PHYSICAL' && row.variant.track_inventory;

          if (requiresStockUpdate) {
            const stockRaw = (stockDrafts[variantId] || '').trim();
            if (!stockRaw) {
              continue;
            }
            const onHandQuantity = parseNonNegativeInteger(stockRaw, '재고 수량');
            await upsertInventoryLevel.mutateAsync({
              variant_id: row.variant.id,
              location_id: defaultStockLocationId || null,
              on_hand_quantity: onHandQuantity,
              metadata: {
                source: 'v2-campaign-pricing-bulk-table',
              },
            });
          }
        }
      }

      setDirtyPriceVariantIds({});
      setDirtyStockVariantIds({});
      setStockDrafts((previous) => {
        const next = {
          ...previous,
        };
        pendingStockIds.forEach((variantId) => {
          next[variantId] = '';
        });
        return next;
      });
      setMessage(`가격 ${pendingPriceIds.length}건, 재고 ${pendingStockIds.length}건을 저장했습니다.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">일괄 편집 모드</p>
            <p className="mt-1 text-xs text-gray-500">
              표의 여러 옵션 가격/재고를 수정한 뒤 한 번에 저장합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge intent={pendingCount > 0 ? 'warning' : 'info'}>
              변경 {pendingCount}건
            </Badge>
            <Button onClick={handleSaveAll} disabled={pendingCount === 0} loading={isSaving}>
              변경 일괄 저장
            </Button>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {variantsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          옵션 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">상품</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">유형</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">옵션 수</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">설정 현황</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">편집</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {products.map((product) => {
              const rows = variantRowsByProductId[product.id] || [];
              const configuredCount = rows.filter((row) => row.configured).length;
              const dirtyCount = rows.filter(
                (row) => dirtyPriceVariantIds[row.variant.id] || dirtyStockVariantIds[row.variant.id],
              ).length;
              const isExpanded = Boolean(expandedProducts[product.id]);

              return (
                <Fragment key={product.id}>
                  <tr>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-900">{product.title}</p>
                      <p className="mt-1 text-xs text-gray-500">/{product.slug}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge intent="default" size="sm">
                        {product.product_kind === 'BUNDLE' ? '번들' : '일반'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge intent="info" size="sm">{rows.length}개</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Badge intent="success" size="sm">설정 {configuredCount}</Badge>
                        {dirtyCount > 0 && (
                          <Badge intent="warning" size="sm">변경 {dirtyCount}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="text-xs font-medium text-primary-700 hover:underline"
                        onClick={() =>
                          setExpandedProducts((previous) => {
                            const isOpen = Boolean(previous[product.id]);
                            if (isOpen) {
                              const next = {
                                ...previous,
                              };
                              delete next[product.id];
                              return next;
                            }
                            return {
                              ...previous,
                              [product.id]: true,
                            };
                          })
                        }
                      >
                        {isExpanded ? '옵션 접기' : '옵션 펼치기'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="bg-gray-50 px-3 py-3">
                        {variantsLoading || variantsFetching ? (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                            옵션 정보를 불러오는 중입니다.
                          </div>
                        ) : rows.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                            등록된 옵션이 없습니다.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">옵션</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">BASE 가격</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">캠페인 가격</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">판매가 입력</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">재고 입력</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">상태</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {rows.map((row) => {
                                  const requiresStockUpdate =
                                    row.variant.fulfillment_type === 'PHYSICAL' && row.variant.track_inventory;
                                  const isPriceDirty = Boolean(dirtyPriceVariantIds[row.variant.id]);
                                  const isStockDirty = Boolean(dirtyStockVariantIds[row.variant.id]);

                                  return (
                                    <tr key={row.variant.id}>
                                      <td className="px-3 py-2">
                                        <p className="font-medium text-gray-900">{row.variant.title || 'default'}</p>
                                        <p className="mt-1 text-xs text-gray-500">
                                          {row.variant.sku} · {FULFILLMENT_TYPE_LABELS[row.variant.fulfillment_type]}
                                        </p>
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600">
                                        {row.baseItem ? formatCurrency(row.baseItem.unit_amount) : '미설정'}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600">
                                        {row.campaignItem ? formatCurrency(row.campaignItem.unit_amount) : '미설정'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={priceDrafts[row.variant.id] || ''}
                                          onChange={(event) => handlePriceChange(row.variant.id, event.target.value)}
                                          placeholder="예: 25000"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="1"
                                          disabled={!requiresStockUpdate}
                                          value={stockDrafts[row.variant.id] || ''}
                                          onChange={(event) => handleStockChange(row.variant.id, event.target.value)}
                                          placeholder={requiresStockUpdate ? '예: 120' : '재고 추적 비활성'}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                          <Badge intent={row.configured ? 'success' : 'error'} size="sm">
                                            {row.configured ? '설정됨' : '미설정'}
                                          </Badge>
                                          <Badge intent="default" size="sm">
                                            {VARIANT_STATUS_LABELS[row.variant.status]}
                                          </Badge>
                                          {(isPriceDirty || isStockDirty) && (
                                            <Badge intent="warning" size="sm">저장 대기</Badge>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
