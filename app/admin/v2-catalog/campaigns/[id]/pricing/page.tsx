'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type { V2PriceList, V2PriceListItem } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2PriceList,
  useCreateV2PriceListItem,
  usePublishV2PriceList,
  useUpdateV2PriceListItem,
  useV2AdminProducts,
  useV2AdminVariants,
  useV2Campaign,
  useV2CampaignTargets,
  useV2PriceListItems,
  useV2PriceLists,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { formatDateRange, getErrorMessage } from '@/lib/client/utils/v2-campaign-admin';

type DiscountMode = 'FIXED' | 'PERCENT';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function pickLatestPriceList(lists: V2PriceList[]): V2PriceList | null {
  if (lists.length === 0) {
    return null;
  }
  const sorted = [...lists].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return sorted[0] || null;
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

function parseFixedDiscount(raw: string): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('고정 할인값은 0 이상의 정수여야 합니다.');
  }
  return value;
}

function parsePercentDiscount(raw: string): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('퍼센트 할인값은 0~100 사이 숫자여야 합니다.');
  }
  return value;
}

function computeFinalPrice(basePrice: number, mode: DiscountMode, rawValue: string): number {
  if (mode === 'FIXED') {
    const amount = parseFixedDiscount(rawValue);
    return Math.max(0, basePrice - amount);
  }
  const percent = parsePercentDiscount(rawValue);
  return Math.max(0, Math.round(basePrice * ((100 - percent) / 100)));
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
    return exact[0];
  }

  if (params.priceListsById) {
    return pickBestPriceItem(matched, params.priceListsById);
  }
  return matched[0];
}

export default function V2CatalogCampaignPricingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [discountMode, setDiscountMode] = useState<DiscountMode>('FIXED');
  const [discountValue, setDiscountValue] = useState('');

  const campaignId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useV2Campaign(campaignId);
  const { data: targets, isLoading: targetsLoading, error: targetsError } = useV2CampaignTargets(campaignId);
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: campaignPriceLists, isLoading: campaignPriceListsLoading } = useV2PriceLists({
    campaignId,
    scopeType: 'OVERRIDE',
  });
  const { data: basePriceLists, isLoading: basePriceListsLoading } = useV2PriceLists({
    scopeType: 'BASE',
    status: 'PUBLISHED',
    campaignId: '',
  });

  const createPriceList = useCreateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const updatePriceListItem = useUpdateV2PriceListItem();

  const publishedOverrideList = useMemo(
    () => (campaignPriceLists || []).find((list) => list.status === 'PUBLISHED') || null,
    [campaignPriceLists],
  );
  const activeOverrideList = useMemo(
    () => publishedOverrideList || pickLatestPriceList(campaignPriceLists || []),
    [campaignPriceLists, publishedOverrideList],
  );
  const activeBaseList = useMemo(
    () => pickLatestPriceList(basePriceLists || []),
    [basePriceLists],
  );

  const {
    data: overrideItems,
    isLoading: overrideItemsLoading,
    error: overrideItemsError,
  } = useV2PriceListItems(activeOverrideList?.id || null);
  const {
    data: baseItems,
    isLoading: baseItemsLoading,
    error: baseItemsError,
  } = useV2PriceListItems(activeBaseList?.id || null);
  const { data: variants, isLoading: variantsLoading, error: variantsError } = useV2AdminVariants(
    selectedProductId || null,
  );

  const isLoading =
    campaignLoading ||
    targetsLoading ||
    productsLoading ||
    campaignPriceListsLoading ||
    basePriceListsLoading ||
    overrideItemsLoading ||
    baseItemsLoading ||
    variantsLoading;

  const eligibleProducts = useMemo(() => {
    const activeProducts = (products || []).filter(
      (product) => product.status === 'ACTIVE' || product.status === 'DRAFT',
    );
    if (!targets || targets.length === 0) {
      return activeProducts;
    }

    const includeProductIds = new Set<string>();
    const excludedProductIds = new Set<string>();

    targets.forEach((target) => {
      const destination = target.is_excluded ? excludedProductIds : includeProductIds;

      if (target.target_type === 'PROJECT') {
        activeProducts
          .filter((product) => product.project_id === target.target_id)
          .forEach((product) => destination.add(product.id));
        return;
      }

      if (target.target_type === 'PRODUCT') {
        destination.add(target.target_id);
        return;
      }

      if (target.target_type === 'VARIANT') {
        const snapshot = target.source_snapshot_json as { product_id?: unknown } | null;
        if (snapshot && typeof snapshot.product_id === 'string') {
          destination.add(snapshot.product_id);
        }
      }
    });

    if (includeProductIds.size === 0) {
      return activeProducts.filter((product) => !excludedProductIds.has(product.id));
    }

    return activeProducts.filter(
      (product) => includeProductIds.has(product.id) && !excludedProductIds.has(product.id),
    );
  }, [products, targets]);

  useEffect(() => {
    if (eligibleProducts.length === 0) {
      setSelectedProductId('');
      return;
    }
    if (selectedProductId && eligibleProducts.some((product) => product.id === selectedProductId)) {
      return;
    }
    setSelectedProductId(eligibleProducts[0].id);
  }, [eligibleProducts, selectedProductId]);

  useEffect(() => {
    const nextVariants = variants || [];
    if (nextVariants.length === 0) {
      setSelectedVariantId('');
      return;
    }
    if (selectedVariantId && nextVariants.some((variant) => variant.id === selectedVariantId)) {
      return;
    }
    setSelectedVariantId(nextVariants[0].id);
  }, [selectedVariantId, variants]);

  const selectedProduct = useMemo(
    () => eligibleProducts.find((product) => product.id === selectedProductId) || null,
    [eligibleProducts, selectedProductId],
  );
  const selectedVariant = useMemo(
    () => (variants || []).find((variant) => variant.id === selectedVariantId) || null,
    [selectedVariantId, variants],
  );

  const basePriceListById = useMemo(() => {
    const map = new Map<string, V2PriceList>();
    (basePriceLists || []).forEach((list) => {
      map.set(list.id, list);
    });
    return map;
  }, [basePriceLists]);

  const basePriceItem = useMemo(() => {
    if (!selectedProductId || !selectedVariantId || !(baseItems || []).length) {
      return null;
    }
    return findPriceItem({
      items: baseItems || [],
      productId: selectedProductId,
      variantId: selectedVariantId,
      priceListsById: basePriceListById,
    });
  }, [baseItems, basePriceListById, selectedProductId, selectedVariantId]);

  const overridePriceItem = useMemo(() => {
    if (!selectedProductId || !selectedVariantId || !(overrideItems || []).length) {
      return null;
    }
    return findPriceItem({
      items: overrideItems || [],
      productId: selectedProductId,
      variantId: selectedVariantId,
    });
  }, [overrideItems, selectedProductId, selectedVariantId]);

  useEffect(() => {
    if (!basePriceItem) {
      setDiscountMode('FIXED');
      setDiscountValue('');
      return;
    }
    if (!overridePriceItem) {
      setDiscountMode('FIXED');
      setDiscountValue('');
      return;
    }
    const basePrice = basePriceItem.unit_amount;
    const overridePrice = overridePriceItem.unit_amount;
    const fixedDiscount = Math.max(0, basePrice - overridePrice);
    setDiscountMode('FIXED');
    setDiscountValue(String(fixedDiscount));
  }, [basePriceItem, overridePriceItem]);

  const previewFinalPrice = useMemo(() => {
    if (!basePriceItem) {
      return null;
    }
    if (!discountValue.trim()) {
      return basePriceItem.unit_amount;
    }
    try {
      return computeFinalPrice(basePriceItem.unit_amount, discountMode, discountValue);
    } catch {
      return null;
    }
  }, [basePriceItem, discountMode, discountValue]);

  const isSaving =
    createPriceList.isPending ||
    publishPriceList.isPending ||
    createPriceListItem.isPending ||
    updatePriceListItem.isPending;

  const saveCampaignDiscount = async () => {
    setMessage(null);
    setErrorMessage(null);

    try {
      if (!campaign) {
        throw new Error('캠페인을 찾을 수 없습니다.');
      }
      if (!selectedProduct || !selectedVariant) {
        throw new Error('대상 상품과 옵션을 먼저 선택해 주세요.');
      }
      if (!basePriceItem) {
        throw new Error('선택한 옵션에 BASE 가격이 없습니다. 옵션 화면에서 BASE 가격을 먼저 입력해 주세요.');
      }
      if (!discountValue.trim()) {
        throw new Error('할인 수치를 입력해 주세요.');
      }

      const finalPrice = computeFinalPrice(basePriceItem.unit_amount, discountMode, discountValue);

      let priceList = activeOverrideList;
      if (!priceList) {
        const created = await createPriceList.mutateAsync({
          campaign_id: campaign.id,
          name: `${campaign.name} 캠페인 가격`,
          scope_type: 'OVERRIDE',
          status: 'DRAFT',
          currency_code: 'KRW',
          starts_at: campaign.starts_at,
          ends_at: campaign.ends_at,
        });
        priceList = created.data;
      }

      if (!priceList) {
        throw new Error('캠페인 가격표를 준비하지 못했습니다.');
      }

      if (overridePriceItem) {
        await updatePriceListItem.mutateAsync({
          itemId: overridePriceItem.id,
          data: {
            unit_amount: finalPrice,
            compare_at_amount: basePriceItem.unit_amount,
            status: 'ACTIVE',
            product_id: selectedProduct.id,
            variant_id: selectedVariant.id,
          },
        });
      } else {
        await createPriceListItem.mutateAsync({
          priceListId: priceList.id,
          data: {
            product_id: selectedProduct.id,
            variant_id: selectedVariant.id,
            unit_amount: finalPrice,
            compare_at_amount: basePriceItem.unit_amount,
            status: 'ACTIVE',
          },
        });
      }

      if (priceList.status !== 'PUBLISHED') {
        await publishPriceList.mutateAsync(priceList.id);
      }

      setMessage(
        `${selectedVariant.title} 할인 가격을 ${formatCurrency(finalPrice)}으로 저장했습니다.`,
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="캠페인 가격 설정 화면을 불러오는 중입니다." />
      </div>
    );
  }

  if (
    campaignError ||
    targetsError ||
    productsError ||
    overrideItemsError ||
    baseItemsError ||
    variantsError ||
    !campaign ||
    !targets ||
    !products
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          캠페인 가격 설정 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  const configuredItems = (overrideItems || []).filter((item) => item.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge intent="default">캠페인 가격 설정</Badge>
            <Badge intent="info">{campaign.name}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">대상별 할인 가격 설정</h1>
          <p className="mt-1 text-sm text-gray-500">{formatDateRange(campaign.starts_at, campaign.ends_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}`)}>
            상세로 돌아가기
          </Button>
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">대상 상품</label>
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {eligibleProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">대상 옵션</label>
            <select
              value={selectedVariantId}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {(variants || []).map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_220px]">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">BASE 가격</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {basePriceItem ? formatCurrency(basePriceItem.unit_amount) : '미설정'}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">할인 방식</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  discountMode === 'FIXED'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setDiscountMode('FIXED')}
              >
                고정 금액 할인
              </button>
              <button
                type="button"
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  discountMode === 'PERCENT'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setDiscountMode('PERCENT')}
              >
                퍼센트 할인
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {discountMode === 'FIXED' ? '할인 금액(원)' : '할인율(%)'}
            </label>
            <Input
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              type="number"
              min="0"
              step={discountMode === 'FIXED' ? '1' : '0.1'}
              placeholder={discountMode === 'FIXED' ? '예: 5000' : '예: 20'}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">예상 판매가</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {previewFinalPrice === null ? '계산 불가' : formatCurrency(previewFinalPrice)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            캠페인 기간에는 OVERRIDE 가격이 BASE보다 우선 적용됩니다.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={saveCampaignDiscount} loading={isSaving}>
            할인 가격 저장
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">저장된 캠페인 가격</h2>
            <p className="mt-1 text-sm text-gray-500">
              이 캠페인에 연결된 옵션별 할인가를 확인할 수 있습니다.
            </p>
          </div>
          <Badge intent="info">{configuredItems.length}개</Badge>
        </div>

        <div className="mt-4 space-y-2">
          {configuredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              아직 설정된 할인 가격이 없습니다.
            </div>
          ) : (
            configuredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <p className="text-sm font-medium text-gray-900">
                  {item.product?.title || item.product_id} / {item.variant?.title || item.variant_id || '기본 옵션'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  판매가 {formatCurrency(item.unit_amount)}
                  {item.compare_at_amount !== null ? ` · 기준가 ${formatCurrency(item.compare_at_amount)}` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
