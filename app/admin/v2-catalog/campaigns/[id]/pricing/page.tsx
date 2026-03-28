'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  CampaignPricingBulkTable,
  type SaveCampaignVariantPriceParams,
} from '@/src/components/admin/v2-catalog/CampaignPricingBulkTable';
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
import { queryKeys } from '@/lib/client/hooks/query-keys';
import { useV2AdminStockLocations } from '@/lib/client/hooks/useV2AdminOps';
import { formatDateRange, getErrorMessage } from '@/lib/client/utils/v2-campaign-admin';
import { resolveEligibleCampaignProducts } from '@/lib/client/utils/v2-campaign-targeting';

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

function parseDirectPrice(raw: string): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('판매가는 0 이상의 정수여야 합니다.');
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
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [discountMode, setDiscountMode] = useState<DiscountMode>('FIXED');
  const [discountValue, setDiscountValue] = useState('');
  const hasAppliedPendingVariantRef = useRef(false);

  const campaignId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);
  const presetProductId = (searchParams.get('productId') || '').trim();
  const pendingOnly = searchParams.get('pendingOnly') === '1';

  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useV2Campaign(campaignId);
  const { data: targets, isLoading: targetsLoading, error: targetsError } = useV2CampaignTargets(campaignId);
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: stockLocations, isLoading: stockLocationsLoading } = useV2AdminStockLocations();
  const isAlwaysOnCampaign = campaign?.campaign_type === 'ALWAYS_ON';
  const campaignPriceScopeType = isAlwaysOnCampaign ? 'BASE' : 'OVERRIDE';
  const { data: campaignPriceLists, isLoading: campaignPriceListsLoading } = useV2PriceLists({
    campaignId,
    scopeType: campaignPriceScopeType,
  });
  const { data: basePriceLists, isLoading: basePriceListsLoading } = useV2PriceLists({
    scopeType: 'BASE',
    status: 'PUBLISHED',
  });

  const createPriceList = useCreateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const updatePriceListItem = useUpdateV2PriceListItem();

  const publishedCampaignPriceList = useMemo(
    () => (campaignPriceLists || []).find((list) => list.status === 'PUBLISHED') || null,
    [campaignPriceLists],
  );
  const activeCampaignPriceList = useMemo(
    () => publishedCampaignPriceList || pickLatestPriceList(campaignPriceLists || []),
    [campaignPriceLists, publishedCampaignPriceList],
  );
  const activeBaseList = useMemo(
    () => pickLatestPriceList(basePriceLists || []),
    [basePriceLists],
  );

  const {
    data: campaignPriceItems,
    isLoading: campaignPriceItemsLoading,
    error: campaignPriceItemsError,
  } = useV2PriceListItems(activeCampaignPriceList?.id || null);
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
    stockLocationsLoading ||
    campaignPriceListsLoading ||
    basePriceListsLoading ||
    campaignPriceItemsLoading ||
    baseItemsLoading ||
    variantsLoading;

  const eligibleProducts = useMemo(() => {
    return resolveEligibleCampaignProducts({
      campaignType: campaign?.campaign_type || 'SALE',
      campaignSourceId: campaign?.source_id || null,
      targets: targets || [],
      products: products || [],
    });
  }, [campaign?.campaign_type, campaign?.source_id, products, targets]);

  const presetProduct = useMemo(
    () => eligibleProducts.find((product) => product.id === presetProductId) || null,
    [eligibleProducts, presetProductId],
  );

  useEffect(() => {
    if (eligibleProducts.length === 0) {
      setSelectedProductId('');
      return;
    }
    if (presetProductId) {
      if (presetProduct) {
        if (selectedProductId !== presetProduct.id) {
          setSelectedProductId(presetProduct.id);
        }
      } else {
        setSelectedProductId('');
      }
      return;
    }
    if (selectedProductId && eligibleProducts.some((product) => product.id === selectedProductId)) {
      return;
    }
    setSelectedProductId(eligibleProducts[0].id);
  }, [eligibleProducts, presetProduct, presetProductId, selectedProductId]);

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

  const campaignPriceItem = useMemo(() => {
    if (!selectedProductId || !selectedVariantId || !(campaignPriceItems || []).length) {
      return null;
    }
    return findPriceItem({
      items: campaignPriceItems || [],
      productId: selectedProductId,
      variantId: selectedVariantId,
    });
  }, [campaignPriceItems, selectedProductId, selectedVariantId]);

  const selectedProductVariantPriceStatus = useMemo(() => {
    const map = new Map<string, { hasBase: boolean; hasCampaignPrice: boolean; configured: boolean }>();
    (variants || []).forEach((variant) => {
      const base = findPriceItem({
        items: baseItems || [],
        productId: selectedProductId,
        variantId: variant.id,
        priceListsById: basePriceListById,
      });
      const campaignPrice = findPriceItem({
        items: campaignPriceItems || [],
        productId: selectedProductId,
        variantId: variant.id,
      });
      map.set(variant.id, {
        hasBase: Boolean(base),
        hasCampaignPrice: Boolean(campaignPrice),
        configured: isAlwaysOnCampaign ? Boolean(campaignPrice) : Boolean(base || campaignPrice),
      });
    });
    return map;
  }, [baseItems, basePriceListById, campaignPriceItems, isAlwaysOnCampaign, selectedProductId, variants]);

  const variantRows = useMemo(() => {
    return (variants || []).map((variant) => {
      const base = findPriceItem({
        items: baseItems || [],
        productId: selectedProductId,
        variantId: variant.id,
        priceListsById: basePriceListById,
      });
      const campaignPrice = findPriceItem({
        items: campaignPriceItems || [],
        productId: selectedProductId,
        variantId: variant.id,
      });
      const status = selectedProductVariantPriceStatus.get(variant.id) || {
        hasBase: false,
        hasCampaignPrice: false,
        configured: false,
      };
      return {
        variant,
        base,
        campaignPrice,
        ...status,
      };
    });
  }, [
    baseItems,
    basePriceListById,
    campaignPriceItems,
    selectedProductId,
    selectedProductVariantPriceStatus,
    variants,
  ]);

  useEffect(() => {
    if (!pendingOnly || hasAppliedPendingVariantRef.current) {
      return;
    }
    if (!(variants || []).length) {
      return;
    }
    const pendingVariant = (variants || []).find(
      (variant) => !selectedProductVariantPriceStatus.get(variant.id)?.configured,
    );
    if (pendingVariant) {
      setSelectedVariantId(pendingVariant.id);
    }
    hasAppliedPendingVariantRef.current = true;
  }, [pendingOnly, selectedProductVariantPriceStatus, variants]);

  useEffect(() => {
    if (isAlwaysOnCampaign) {
      setDiscountMode('FIXED');
      setDiscountValue(campaignPriceItem ? String(campaignPriceItem.unit_amount) : '');
      return;
    }
    if (!basePriceItem && !campaignPriceItem) {
      setDiscountMode('FIXED');
      setDiscountValue('');
      return;
    }
    if (!basePriceItem && campaignPriceItem) {
      setDiscountMode('FIXED');
      setDiscountValue(String(campaignPriceItem.unit_amount));
      return;
    }
    if (!campaignPriceItem) {
      setDiscountMode('FIXED');
      setDiscountValue('');
      return;
    }
    if (!basePriceItem) {
      return;
    }

    const basePrice = basePriceItem.unit_amount;
    const overridePrice = campaignPriceItem.unit_amount;
    const fixedDiscount = Math.max(0, basePrice - overridePrice);
    setDiscountMode('FIXED');
    setDiscountValue(String(fixedDiscount));
  }, [basePriceItem, campaignPriceItem, isAlwaysOnCampaign]);

  const previewFinalPrice = useMemo(() => {
    if (isAlwaysOnCampaign) {
      if (!discountValue.trim()) {
        return campaignPriceItem ? campaignPriceItem.unit_amount : null;
      }
      try {
        return parseDirectPrice(discountValue);
      } catch {
        return null;
      }
    }

    if (!discountValue.trim()) {
      if (campaignPriceItem) {
        return campaignPriceItem.unit_amount;
      }
      return basePriceItem ? basePriceItem.unit_amount : null;
    }
    try {
      if (!basePriceItem) {
        return parseDirectPrice(discountValue);
      }
      return computeFinalPrice(basePriceItem.unit_amount, discountMode, discountValue);
    } catch {
      return null;
    }
  }, [basePriceItem, campaignPriceItem, discountMode, discountValue, isAlwaysOnCampaign]);

  const campaignPriceListRef = useRef<V2PriceList | null>(null);

  useEffect(() => {
    campaignPriceListRef.current = activeCampaignPriceList || null;
  }, [activeCampaignPriceList]);

  const refreshPricingQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.v2CatalogAdmin.pricing.all,
    });
  };

  const ensureCampaignPriceList = async (): Promise<V2PriceList> => {
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다.');
    }

    let priceList = activeCampaignPriceList || campaignPriceListRef.current;
    if (!priceList) {
      const created = await createPriceList.mutateAsync({
        campaign_id: campaign.id,
        name: isAlwaysOnCampaign ? `${campaign.name} 기본 가격` : `${campaign.name} 캠페인 가격`,
        scope_type: campaignPriceScopeType,
        status: 'DRAFT',
        currency_code: 'KRW',
        starts_at: campaign.starts_at,
        ends_at: campaign.ends_at,
        skipInvalidate: true,
      });
      priceList = created.data;
    }

    if (!priceList) {
      throw new Error('캠페인 가격표를 준비하지 못했습니다.');
    }

    campaignPriceListRef.current = priceList;
    return priceList;
  };

  const upsertCampaignVariantPrice = async ({
    product,
    variant,
    unitAmount,
    baseItem,
    campaignItem,
    skipInvalidate = false,
  }: SaveCampaignVariantPriceParams) => {
    const priceList = await ensureCampaignPriceList();

    if (campaignItem) {
      await updatePriceListItem.mutateAsync({
        itemId: campaignItem.id,
        data: {
          unit_amount: unitAmount,
          compare_at_amount: isAlwaysOnCampaign ? null : (baseItem?.unit_amount ?? null),
          status: 'ACTIVE',
          product_id: product.id,
          variant_id: variant.id,
        },
        skipInvalidate,
      });
    } else {
      await createPriceListItem.mutateAsync({
        priceListId: priceList.id,
        data: {
          product_id: product.id,
          variant_id: variant.id,
          unit_amount: unitAmount,
          compare_at_amount: isAlwaysOnCampaign ? null : (baseItem?.unit_amount ?? null),
          status: 'ACTIVE',
        },
        skipInvalidate,
      });
    }

    if (priceList.status !== 'PUBLISHED') {
      await publishPriceList.mutateAsync({
        id: priceList.id,
        skipInvalidate,
      });
      campaignPriceListRef.current = {
        ...priceList,
        status: 'PUBLISHED',
      };
    }
  };

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
      if (!discountValue.trim()) {
        throw new Error(
          isAlwaysOnCampaign
            ? '기본 판매가를 입력해 주세요.'
            : basePriceItem
              ? '할인 수치를 입력해 주세요.'
              : '판매가를 입력해 주세요.',
        );
      }

      const finalPrice = isAlwaysOnCampaign
        ? parseDirectPrice(discountValue)
        : basePriceItem
          ? computeFinalPrice(basePriceItem.unit_amount, discountMode, discountValue)
          : parseDirectPrice(discountValue);

      await upsertCampaignVariantPrice({
        product: selectedProduct,
        variant: selectedVariant,
        unitAmount: finalPrice,
        baseItem: basePriceItem,
        campaignItem: campaignPriceItem,
        skipInvalidate: true,
      });
      await refreshPricingQueries();

      setMessage(
        isAlwaysOnCampaign
          ? `${selectedVariant.title} 기본 판매가를 ${formatCurrency(finalPrice)}으로 저장했습니다.`
          : `${selectedVariant.title} 할인 가격을 ${formatCurrency(finalPrice)}으로 저장했습니다.`,
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
    campaignPriceItemsError ||
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

  if (presetProductId && !selectedProduct) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          선택한 상품을 현재 캠페인 대상에서 찾지 못했습니다. 캠페인 대상 목록에서 다시 선택해 주세요.
        </div>
        <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  const defaultStockLocationId = stockLocations?.[0]?.id || null;
  const quickEditorProducts = pendingOnly
    ? eligibleProducts.filter((product) => {
        const productVariants = (campaignPriceItems || []).filter(
          (item) => item.status === 'ACTIVE' && item.product_id === product.id,
        );
        if (isAlwaysOnCampaign) {
          return productVariants.length === 0;
        }
        if (productVariants.length > 0) {
          return false;
        }
        const baseConfigured = (baseItems || []).some(
          (item) => item.status === 'ACTIVE' && item.product_id === product.id,
        );
        return !baseConfigured;
      })
    : eligibleProducts;

  const configuredItems = (campaignPriceItems || []).filter((item) => item.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge intent="default">캠페인 가격 설정</Badge>
            <Badge intent="info">{campaign.name}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {isAlwaysOnCampaign ? '상시 기본 가격 설정' : '대상별 할인 가격 설정'}
          </h1>
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">상품 리스트 빠른 편집</h2>
            <p className="mt-1 text-sm text-gray-500">
              표에서 여러 상품/옵션 가격과 재고를 한 번에 수정하고 일괄 저장합니다.
            </p>
          </div>
          <Badge intent="info">{quickEditorProducts.length}개</Badge>
        </div>

        <div className="mt-4">
          {quickEditorProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              {pendingOnly
                ? '미설정 옵션이 있는 상품이 없습니다.'
                : '편집할 대상 상품이 없습니다.'}
            </div>
          ) : (
            <CampaignPricingBulkTable
              products={quickEditorProducts}
              isAlwaysOnCampaign={isAlwaysOnCampaign}
              baseItems={baseItems || []}
              campaignItems={campaignPriceItems || []}
              basePriceListsById={basePriceListById}
              defaultStockLocationId={defaultStockLocationId}
              onSavePrice={upsertCampaignVariantPrice}
              onAfterSave={refreshPricingQueries}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">대상 상품</label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{selectedProduct?.title || '-'}</p>
                <Badge intent="default" size="sm">
                  {selectedProduct?.product_kind === 'BUNDLE' ? '번들' : '일반'}
                </Badge>
                {presetProductId && <Badge intent="info" size="sm">상위 페이지에서 선택됨</Badge>}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700">옵션 목록</label>
              {selectedVariantId && !selectedProductVariantPriceStatus.get(selectedVariantId)?.configured && (
                <Badge intent="error" size="sm">가격 미설정</Badge>
              )}
            </div>

            {variantRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                등록된 옵션이 없습니다.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                {variantRows.map((row) => (
                  <button
                    key={row.variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(row.variant.id)}
                    className={`flex w-full items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 ${
                      selectedVariantId === row.variant.id
                        ? 'bg-primary-50'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{row.variant.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {row.variant.sku}
                        {row.variant.fulfillment_type ? ` · ${row.variant.fulfillment_type}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge intent={row.configured ? 'success' : 'error'} size="sm">
                        {row.configured ? '설정됨' : '미설정'}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        BASE {row.base ? formatCurrency(row.base.unit_amount) : '없음'}
                      </p>
                      {!isAlwaysOnCampaign && (
                        <p className="text-xs text-gray-500">
                          캠페인 {row.campaignPrice ? formatCurrency(row.campaignPrice.unit_amount) : '없음'}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_220px]">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {isAlwaysOnCampaign ? '현재 BASE 가격' : 'BASE 기준 가격'}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {isAlwaysOnCampaign
                ? campaignPriceItem
                  ? formatCurrency(campaignPriceItem.unit_amount)
                  : '미설정'
                : basePriceItem
                  ? formatCurrency(basePriceItem.unit_amount)
                  : '미설정'}
            </p>
            {!isAlwaysOnCampaign && !basePriceItem && (
              <Badge intent="error" size="sm" className="mt-2">캠페인에서 직접 입력 필요</Badge>
            )}
          </div>

          {isAlwaysOnCampaign ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-800">상시 캠페인은 BASE 가격을 직접 관리합니다.</p>
              <p className="mt-1 text-xs text-blue-700">
                이 가격은 기본 판매가로 사용되며, 기간 캠페인이 겹치면 해당 캠페인 OVERRIDE 가격이 우선됩니다.
              </p>
            </div>
          ) : basePriceItem ? (
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
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-800">BASE 가격이 없는 옵션입니다.</p>
              <p className="mt-1 text-xs text-red-700">
                이 화면에서 캠페인 판매가를 직접 입력해 첫 가격을 설정할 수 있습니다.
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {isAlwaysOnCampaign
                ? '기본 판매가(원)'
                : basePriceItem
                ? discountMode === 'FIXED'
                  ? '할인 금액(원)'
                  : '할인율(%)'
                : '캠페인 판매가(원)'}
            </label>
            <Input
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              type="number"
              min="0"
              step={isAlwaysOnCampaign ? '1' : basePriceItem ? (discountMode === 'FIXED' ? '1' : '0.1') : '1'}
              placeholder={
                isAlwaysOnCampaign
                  ? '예: 30000'
                  : basePriceItem
                    ? (discountMode === 'FIXED' ? '예: 5000' : '예: 20')
                    : '예: 25000'
              }
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">예상 판매가</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {previewFinalPrice === null ? '계산 불가' : formatCurrency(previewFinalPrice)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {isAlwaysOnCampaign
              ? '상시(BASE) 가격으로 저장됩니다.'
              : basePriceItem
              ? '캠페인 기간에는 OVERRIDE 가격이 BASE보다 우선 적용됩니다.'
              : 'BASE 미설정 상태에서는 입력값이 캠페인 판매가로 바로 저장됩니다.'}
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={saveCampaignDiscount} loading={isSaving}>
            {isAlwaysOnCampaign ? '기본 가격 저장' : '할인 가격 저장'}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isAlwaysOnCampaign ? '저장된 BASE 가격' : '저장된 캠페인 가격'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isAlwaysOnCampaign
                ? '이 상시 캠페인에 연결된 옵션별 기본 판매가를 확인할 수 있습니다.'
                : '이 캠페인에 연결된 옵션별 할인가를 확인할 수 있습니다.'}
            </p>
          </div>
          <Badge intent="info">{configuredItems.length}개</Badge>
        </div>

        <div className="mt-4 space-y-2">
          {configuredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              {isAlwaysOnCampaign
                ? '아직 설정된 BASE 가격이 없습니다.'
                : '아직 설정된 할인 가격이 없습니다.'}
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
