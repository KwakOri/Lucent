'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  V2PriceList,
  V2PriceListItem,
  V2Product,
  V2ProductMedia,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2AdminProductMedia,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { useV2AdminUpsertInventoryLevel } from '@/lib/client/hooks/useV2AdminOps';
import {
  FULFILLMENT_TYPE_LABELS,
  VARIANT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

const DETAIL_ROLE_SET = new Set(['DETAIL', 'GALLERY']);

export type SaveCampaignVariantPriceParams = {
  product: V2Product;
  variant: V2Variant;
  unitAmount: number;
  baseItem: V2PriceListItem | null;
  campaignItem: V2PriceListItem | null;
};

type CampaignPricingProductCardProps = {
  product: V2Product;
  isAlwaysOnCampaign: boolean;
  baseItems: V2PriceListItem[];
  campaignItems: V2PriceListItem[];
  basePriceListsById: Map<string, V2PriceList>;
  defaultStockLocationId: string | null;
  onSavePrice: (params: SaveCampaignVariantPriceParams) => Promise<void>;
};

type VariantPricingRow = {
  variant: V2Variant;
  baseItem: V2PriceListItem | null;
  campaignItem: V2PriceListItem | null;
  configured: boolean;
};

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

function sortMediaForDisplay(left: V2ProductMedia, right: V2ProductMedia): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }
  return left.created_at.localeCompare(right.created_at);
}

function getCoverMedia(mediaList: V2ProductMedia[]): V2ProductMedia | null {
  const active = mediaList.filter((media) => media.status === 'ACTIVE');
  return (
    active.find((media) => media.is_primary) ||
    active.find((media) => media.media_role === 'PRIMARY') ||
    null
  );
}

function getDetailMedia(mediaList: V2ProductMedia[], coverMediaId: string | null): V2ProductMedia[] {
  return mediaList
    .filter(
      (media) =>
        media.status === 'ACTIVE' &&
        media.id !== coverMediaId &&
        DETAIL_ROLE_SET.has(media.media_role),
    )
    .sort(sortMediaForDisplay);
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
    const rightPublished = rightList?.published_at
      ? new Date(rightList.published_at).getTime()
      : 0;
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

export function CampaignPricingProductCard({
  product,
  isAlwaysOnCampaign,
  baseItems,
  campaignItems,
  basePriceListsById,
  defaultStockLocationId,
  onSavePrice,
}: CampaignPricingProductCardProps) {
  const [isDetailMediaOpen, setIsDetailMediaOpen] = useState(false);
  const [isVariantAccordionOpen, setIsVariantAccordionOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  const { data: mediaList } = useV2AdminProductMedia(product.id);
  const { data: variants, isLoading: variantsLoading, error: variantsError } = useV2AdminVariants(
    isVariantAccordionOpen ? product.id : null,
  );
  const upsertInventoryLevel = useV2AdminUpsertInventoryLevel();

  const coverMedia = useMemo(() => getCoverMedia(mediaList || []), [mediaList]);
  const detailMedia = useMemo(
    () => getDetailMedia(mediaList || [], coverMedia?.id || null),
    [coverMedia?.id, mediaList],
  );

  const variantRows = useMemo<VariantPricingRow[]>(() => {
    return (variants || []).map((variant) => {
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
        variant,
        baseItem,
        campaignItem,
        configured,
      };
    });
  }, [baseItems, basePriceListsById, campaignItems, isAlwaysOnCampaign, product.id, variants]);

  const configuredVariantCount = variantRows.filter((row) => row.configured).length;

  useEffect(() => {
    if (variantRows.length === 0) {
      return;
    }
    setPriceDrafts((previous) => {
      const next = { ...previous };
      variantRows.forEach((row) => {
        if (next[row.variant.id] !== undefined) {
          return;
        }
        next[row.variant.id] = String(
          row.campaignItem?.unit_amount ?? row.baseItem?.unit_amount ?? '',
        );
      });
      return next;
    });
    setStockDrafts((previous) => {
      const next = { ...previous };
      variantRows.forEach((row) => {
        if (next[row.variant.id] !== undefined) {
          return;
        }
        next[row.variant.id] = '';
      });
      return next;
    });
  }, [variantRows]);

  const handleSaveVariant = async (row: VariantPricingRow) => {
    const priceRaw = (priceDrafts[row.variant.id] || '').trim();
    const stockRaw = (stockDrafts[row.variant.id] || '').trim();
    const requiresStockUpdate = row.variant.fulfillment_type === 'PHYSICAL' && row.variant.track_inventory;

    setMessage(null);
    setErrorMessage(null);
    setSavingVariantId(row.variant.id);

    try {
      if (!priceRaw) {
        throw new Error('판매가를 입력해 주세요.');
      }

      const unitAmount = parseNonNegativeInteger(priceRaw, '판매가');
      await onSavePrice({
        product,
        variant: row.variant,
        unitAmount,
        baseItem: row.baseItem,
        campaignItem: row.campaignItem,
      });

      if (requiresStockUpdate && stockRaw) {
        const onHandQuantity = parseNonNegativeInteger(stockRaw, '재고 수량');
        await upsertInventoryLevel.mutateAsync({
          variant_id: row.variant.id,
          location_id: defaultStockLocationId || null,
          on_hand_quantity: onHandQuantity,
          metadata: {
            source: 'v2-campaign-pricing-quick-list',
          },
        });
      }

      setMessage('옵션 가격/재고를 저장했습니다.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSavingVariantId(null);
    }
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {coverMedia?.public_url ? (
              <img
                src={coverMedia.public_url}
                alt={coverMedia.alt_text || `${product.title} 대표 이미지`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                이미지 없음
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{product.title}</h3>
              <Badge intent="default">{product.product_kind === 'BUNDLE' ? '번들' : '일반'}</Badge>
              <Badge intent="info">{configuredVariantCount}/{variantRows.length || 0} 설정</Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {product.short_description || '한 줄 설명이 없습니다.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>상세 이미지 {detailMedia.length}장</span>
              <span>·</span>
              <button
                type="button"
                className="font-medium text-primary-700 hover:underline"
                onClick={() => setIsDetailMediaOpen((previous) => !previous)}
              >
                {isDetailMediaOpen ? '이미지 접기' : '이미지 보기'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            intent="neutral"
            onClick={() => setIsVariantAccordionOpen((previous) => !previous)}
          >
            {isVariantAccordionOpen ? '옵션 접기' : '옵션 펼치기'}
          </Button>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isDetailMediaOpen && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          {detailMedia.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 상세 이미지가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {detailMedia.map((media) => (
                <div key={media.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {media.public_url ? (
                    <img
                      src={media.public_url}
                      alt={media.alt_text || `${product.title} 상세 이미지`}
                      className="aspect-square h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-xs text-gray-400">
                      URL 없음
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isVariantAccordionOpen && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">옵션별 가격/재고 입력</p>
            <Badge intent="info">{variantRows.length}개</Badge>
          </div>

          {variantsLoading && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
              옵션 목록을 불러오는 중입니다.
            </div>
          )}
          {!variantsLoading && variantsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
              옵션 목록을 불러오지 못했습니다.
            </div>
          )}
          {!variantsLoading && !variantsError && variantRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
              등록된 옵션이 없습니다.
            </div>
          )}

          {!variantsLoading && !variantsError && variantRows.length > 0 && (
            <div className="space-y-3">
              {variantRows.map((row) => {
                const requiresStockUpdate =
                  row.variant.fulfillment_type === 'PHYSICAL' && row.variant.track_inventory;
                const isSavingRow = savingVariantId === row.variant.id;

                return (
                  <div key={row.variant.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {row.variant.title || 'default'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {row.variant.sku} · {FULFILLMENT_TYPE_LABELS[row.variant.fulfillment_type]}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge intent={row.configured ? 'success' : 'error'} size="sm">
                          {row.configured ? '가격 설정됨' : '가격 미설정'}
                        </Badge>
                        <Badge intent="default" size="sm">
                          {VARIANT_STATUS_LABELS[row.variant.status]}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_200px_auto] lg:items-end">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        <p>BASE 가격: {row.baseItem ? formatCurrency(row.baseItem.unit_amount) : '미설정'}</p>
                        {!isAlwaysOnCampaign && (
                          <p className="mt-1">
                            캠페인 가격:{' '}
                            {row.campaignItem ? formatCurrency(row.campaignItem.unit_amount) : '미설정'}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">판매가(원)</p>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={priceDrafts[row.variant.id] || ''}
                          onChange={(event) =>
                            setPriceDrafts((previous) => ({
                              ...previous,
                              [row.variant.id]: event.target.value,
                            }))
                          }
                          placeholder="예: 25000"
                        />
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">재고 수량(on hand)</p>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          disabled={!requiresStockUpdate}
                          value={stockDrafts[row.variant.id] || ''}
                          onChange={(event) =>
                            setStockDrafts((previous) => ({
                              ...previous,
                              [row.variant.id]: event.target.value,
                            }))
                          }
                          placeholder={requiresStockUpdate ? '예: 120' : '재고 추적 비활성'}
                        />
                      </div>

                      <div>
                        <Button
                          size="sm"
                          onClick={() => void handleSaveVariant(row)}
                          loading={isSavingRow || upsertInventoryLevel.isPending}
                        >
                          저장
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
