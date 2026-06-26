'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2CampaignTarget,
  V2PriceList,
  V2PriceListItem,
  V2Product,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useActivateV2Campaign,
  useCloseV2Campaign,
  useCreateV2CampaignTarget,
  useCreateV2PriceList,
  useCreateV2PriceListItem,
  useDeactivateV2PriceListItem,
  useDeleteV2CampaignTarget,
  usePublishV2PriceList,
  useSuspendV2Campaign,
  useUpdateV2PriceListItem,
  useV2BundleDefinitions,
  useV2AdminVariantsMap,
  useV2Campaign,
  useV2CampaignTargets,
  useV2PriceListItems,
  useV2PriceLists,
  useV2Promotions,
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { queryKeys } from '@/lib/client/hooks/query-keys';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TARGET_TYPE_LABELS,
  CAMPAIGN_TYPE_LABELS,
  formatChannelScope,
  formatDateRange,
  getCampaignPeriod,
  getCampaignPeriodIntent,
  getCampaignStatusIntent,
  getErrorMessage,
  resolveTargetLabel,
  summarizeTargetGroups,
} from '@/lib/client/utils/v2-campaign-admin';
import { resolveEligibleCampaignProducts } from '@/lib/client/utils/v2-campaign-targeting';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

type DiscountInputMode = 'NONE' | 'PERCENT' | 'FIXED' | 'DIRECT';

type DiscountDraft = {
  mode: DiscountInputMode;
  value: string;
};

type VariantCampaignState = 'BASE' | 'OVERRIDE' | 'MISSING_BASE' | 'NOT_INCLUDED';

type VariantCampaignRow = {
  variant: V2Variant;
  baseItem: V2PriceListItem | null;
  campaignItem: V2PriceListItem | null;
  included: boolean;
  state: VariantCampaignState;
  effectiveAmount: number | null;
};

type ProductCampaignRow = {
  product: V2Product;
  variants: VariantCampaignRow[];
  includedCount: number;
  baseUsingCount: number;
  overrideCount: number;
  missingBaseCount: number;
  notIncludedCount: number;
};

function pickLatestPriceList(lists: V2PriceList[]): V2PriceList | null {
  if (lists.length === 0) {
    return null;
  }
  const sorted = [...lists].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return sorted[0] || null;
}

function pickBestPriceItem(items: V2PriceListItem[]): V2PriceListItem | null {
  if (items.length === 0) {
    return null;
  }
  const exactActiveItems = items.filter((item) => item.status === 'ACTIVE');
  if (exactActiveItems.length === 0) {
    return null;
  }
  return [...exactActiveItems].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
}

function findVariantPriceItem(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string;
}): V2PriceListItem | null {
  const matched = params.items.filter(
    (item) =>
      item.product_id === params.productId &&
      (item.variant_id === params.variantId || item.variant_id === null),
  );
  const exact = matched.filter((item) => item.variant_id === params.variantId);
  return pickBestPriceItem(exact.length > 0 ? exact : matched);
}

function getTargetBuckets(targets: V2CampaignTarget[]) {
  const include = {
    projectIds: new Set<string>(),
    productIds: new Set<string>(),
    variantIds: new Set<string>(),
  };
  const exclude = {
    projectIds: new Set<string>(),
    productIds: new Set<string>(),
    variantIds: new Set<string>(),
  };

  targets.forEach((target) => {
    const bucket = target.is_excluded ? exclude : include;
    if (target.target_type === 'PROJECT') {
      bucket.projectIds.add(target.target_id);
    }
    if (target.target_type === 'PRODUCT') {
      bucket.productIds.add(target.target_id);
    }
    if (target.target_type === 'VARIANT') {
      bucket.variantIds.add(target.target_id);
    }
  });

  return { include, exclude };
}

function isVariantIncludedInCampaign(params: {
  isAlwaysOnCampaign: boolean;
  product: V2Product;
  variant: V2Variant;
  targets: V2CampaignTarget[];
}) {
  if (params.isAlwaysOnCampaign) {
    return true;
  }

  const buckets = getTargetBuckets(params.targets);
  const included =
    buckets.include.projectIds.has(params.product.project_id) ||
    buckets.include.productIds.has(params.product.id) ||
    buckets.include.variantIds.has(params.variant.id);
  if (!included) {
    return false;
  }

  return !(
    buckets.exclude.projectIds.has(params.product.project_id) ||
    buckets.exclude.productIds.has(params.product.id) ||
    buckets.exclude.variantIds.has(params.variant.id)
  );
}

function parseDiscountValue(mode: DiscountInputMode, rawValue: string): number {
  if (mode === 'PERCENT') {
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('할인율은 0~100 사이 숫자로 입력해 주세요.');
    }
    return value;
  }
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(mode === 'DIRECT' ? '판매가는 0 이상의 정수여야 합니다.' : '할인 금액은 0 이상의 정수여야 합니다.');
  }
  return value;
}

function computeEffectiveAmount(baseAmount: number, draft: DiscountDraft): number {
  if (draft.mode === 'NONE') {
    return baseAmount;
  }
  const value = parseDiscountValue(draft.mode, draft.value);
  if (draft.mode === 'PERCENT') {
    return Math.max(0, Math.round(baseAmount * ((100 - value) / 100)));
  }
  if (draft.mode === 'FIXED') {
    return Math.max(0, baseAmount - value);
  }
  return value;
}

function getDraftPreviewAmount(baseAmount: number | null, draft: DiscountDraft): number | null {
  if (baseAmount === null) {
    return null;
  }
  try {
    return computeEffectiveAmount(baseAmount, draft);
  } catch {
    return null;
  }
}

function getDiscountMetadata(baseAmount: number, draft: DiscountDraft) {
  if (draft.mode === 'NONE') {
    return undefined;
  }
  return {
    pricing_mode:
      draft.mode === 'PERCENT'
        ? 'PERCENT_DISCOUNT'
        : draft.mode === 'FIXED'
          ? 'FIXED_DISCOUNT'
          : 'DIRECT_PRICE',
    discount_value: parseDiscountValue(draft.mode, draft.value),
    base_amount: baseAmount,
  };
}

export default function V2CatalogCampaignDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, DiscountDraft>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  const campaignId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useV2Campaign(campaignId);
  const { data: targets, isLoading: targetsLoading, error: targetsError } = useV2CampaignTargets(campaignId);
  const { data: priceLists, isLoading: priceListsLoading, error: priceListsError } = useV2PriceLists({ campaignId });
  const { data: basePriceLists, isLoading: basePriceListsLoading, error: basePriceListsError } = useV2PriceLists({
    scopeType: 'BASE',
    status: 'PUBLISHED',
  });
  const { data: promotions, isLoading: promotionsLoading, error: promotionsError } = useV2Promotions({ campaignId });
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useV2AdminProjects();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: bundleDefinitions, isLoading: bundlesLoading, error: bundlesError } = useV2BundleDefinitions();

  const activateCampaign = useActivateV2Campaign();
  const suspendCampaign = useSuspendV2Campaign();
  const closeCampaign = useCloseV2Campaign();
  const createTarget = useCreateV2CampaignTarget();
  const deleteTarget = useDeleteV2CampaignTarget();
  const createPriceList = useCreateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const updatePriceListItem = useUpdateV2PriceListItem();
  const deactivatePriceListItem = useDeactivateV2PriceListItem();

  const isAlwaysOnCampaign = campaign?.campaign_type === 'ALWAYS_ON';
  const campaignScopeType = isAlwaysOnCampaign ? 'BASE' : 'OVERRIDE';

  const campaignScopedPriceLists = useMemo(
    () => (priceLists || []).filter((list) => list.scope_type === campaignScopeType),
    [campaignScopeType, priceLists],
  );
  const activeCampaignPriceList = useMemo(() => {
    const published = campaignScopedPriceLists.find((list) => list.status === 'PUBLISHED');
    return published || pickLatestPriceList(campaignScopedPriceLists);
  }, [campaignScopedPriceLists]);
  const activeBasePriceList = useMemo(
    () => pickLatestPriceList(basePriceLists || []),
    [basePriceLists],
  );

  const {
    data: campaignPriceItems,
    isLoading: campaignPriceItemsLoading,
    error: campaignPriceItemsError,
  } = useV2PriceListItems(activeCampaignPriceList?.id || null);
  const {
    data: basePriceItems,
    isLoading: basePriceItemsLoading,
    error: basePriceItemsError,
  } = useV2PriceListItems(activeBasePriceList?.id || null);

  const linkedTargetSummary = useMemo(() => summarizeTargetGroups(targets || []), [targets]);
  const period = useMemo(
    () => (campaign ? getCampaignPeriod(campaign.starts_at, campaign.ends_at) : 'NO_PERIOD'),
    [campaign],
  );

  const groupedTargets = useMemo(() => {
    const map = new Map<string, typeof targets>();
    (targets || []).forEach((target) => {
      const key = target.is_excluded ? `exclude-${target.target_type}` : `include-${target.target_type}`;
      map.set(key, [...(map.get(key) || []), target]);
    });
    return Array.from(map.entries());
  }, [targets]);

  const eligibleProducts = useMemo(() => {
    if (!campaign) {
      return [];
    }
    return resolveEligibleCampaignProducts({
      campaignType: campaign.campaign_type,
      campaignProjectId: campaign.project_id,
      targets: targets || [],
      products: products || [],
    });
  }, [campaign, products, targets]);

  const candidateProducts = useMemo(() => {
    if (!campaign || !products) {
      return [];
    }

    const projectScopeIds = new Set<string>();
    if (campaign.project_id) {
      projectScopeIds.add(campaign.project_id);
    }
    (targets || [])
      .filter((target) => !target.is_excluded && target.target_type === 'PROJECT')
      .forEach((target) => projectScopeIds.add(target.target_id));

    return products.filter((product) => {
      const activeEnough = product.status === 'ACTIVE' || product.status === 'DRAFT';
      if (!activeEnough) {
        return false;
      }
      if (projectScopeIds.size === 0) {
        return true;
      }
      return projectScopeIds.has(product.project_id);
    });
  }, [campaign, products, targets]);

  const productIdsForVariants = useMemo(
    () => candidateProducts.map((product) => product.id),
    [candidateProducts],
  );
  const {
    variantsByProductId,
    isLoading: variantsMapLoading,
    isFetching: variantsMapFetching,
    isError: variantsMapError,
  } = useV2AdminVariantsMap(productIdsForVariants);

  const isLoading =
    campaignLoading ||
    targetsLoading ||
    priceListsLoading ||
    basePriceListsLoading ||
    promotionsLoading ||
    projectsLoading ||
    productsLoading ||
    bundlesLoading ||
    campaignPriceItemsLoading ||
    basePriceItemsLoading ||
    variantsMapLoading;

  const campaignPriceItemsByProductId = useMemo(() => {
    const map = new Map<string, V2PriceListItem[]>();
    (campaignPriceItems || [])
      .filter((item) => item.status === 'ACTIVE')
      .forEach((item) => {
        const list = map.get(item.product_id) || [];
        list.push(item);
        map.set(item.product_id, list);
      });
    return map;
  }, [campaignPriceItems]);

  const basePriceItemsByProductId = useMemo(() => {
    const map = new Map<string, V2PriceListItem[]>();
    (basePriceItems || [])
      .filter((item) => item.status === 'ACTIVE')
      .forEach((item) => {
        const list = map.get(item.product_id) || [];
        list.push(item);
        map.set(item.product_id, list);
      });
    return map;
  }, [basePriceItems]);

  const productCampaignRows = useMemo<ProductCampaignRow[]>(() => {
    if (!campaign) {
      return [];
    }

    return candidateProducts.map((product) => {
      const variants = variantsByProductId[product.id] || [];
      const variantRows = variants.map((variant) => {
        const baseItem = findVariantPriceItem({
          items: basePriceItemsByProductId.get(product.id) || [],
          productId: product.id,
          variantId: variant.id,
        });
        const campaignItem = findVariantPriceItem({
          items: campaignPriceItemsByProductId.get(product.id) || [],
          productId: product.id,
          variantId: variant.id,
        });
        const included = isVariantIncludedInCampaign({
          isAlwaysOnCampaign,
          product,
          variant,
          targets: targets || [],
        });
        const state: VariantCampaignState = !included
          ? 'NOT_INCLUDED'
          : campaignItem
            ? 'OVERRIDE'
            : baseItem
              ? 'BASE'
              : 'MISSING_BASE';

        return {
          variant,
          baseItem,
          campaignItem,
          included,
          state,
          effectiveAmount: campaignItem?.unit_amount ?? baseItem?.unit_amount ?? null,
        };
      });

      return {
        product,
        variants: variantRows,
        includedCount: variantRows.filter((row) => row.included).length,
        baseUsingCount: variantRows.filter((row) => row.state === 'BASE').length,
        overrideCount: variantRows.filter((row) => row.state === 'OVERRIDE').length,
        missingBaseCount: variantRows.filter((row) => row.state === 'MISSING_BASE').length,
        notIncludedCount: variantRows.filter((row) => row.state === 'NOT_INCLUDED').length,
      };
    });
  }, [
    basePriceItemsByProductId,
    campaign,
    campaignPriceItemsByProductId,
    candidateProducts,
    isAlwaysOnCampaign,
    targets,
    variantsByProductId,
  ]);

  const includedProductRows = useMemo(
    () => productCampaignRows.filter((row) => row.includedCount > 0),
    [productCampaignRows],
  );
  const notIncludedProductRows = useMemo(
    () => productCampaignRows.filter((row) => row.notIncludedCount > 0),
    [productCampaignRows],
  );
  const missingBaseVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.missingBaseCount, 0),
    [productCampaignRows],
  );
  const includedVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.includedCount, 0),
    [productCampaignRows],
  );
  const overrideVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.overrideCount, 0),
    [productCampaignRows],
  );
  const baseUsingVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.baseUsingCount, 0),
    [productCampaignRows],
  );
  const notIncludedVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.notIncludedCount, 0),
    [productCampaignRows],
  );

  const campaignPriceListRef = useRef<V2PriceList | null>(null);

  useEffect(() => {
    campaignPriceListRef.current = activeCampaignPriceList || null;
  }, [activeCampaignPriceList]);

  const handleRunAction = async (task: () => Promise<unknown>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await task();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
  };

  const refreshCampaignPricingQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.v2CatalogAdmin.all,
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
        scope_type: campaignScopeType,
        status: 'DRAFT',
        currency_code: 'KRW',
        starts_at: campaign.starts_at,
        ends_at: campaign.ends_at,
        skipInvalidate: true,
      });
      priceList = created.data;
    }

    campaignPriceListRef.current = priceList;
    return priceList;
  };

  const includeVariantTargetIfNeeded = async (
    product: V2Product,
    row: VariantCampaignRow,
  ) => {
    if (row.included || isAlwaysOnCampaign) {
      return;
    }

    await createTarget.mutateAsync({
      campaignId,
      data: {
        target_type: 'VARIANT',
        target_id: row.variant.id,
        source_type: 'ADMIN_CAMPAIGN_DETAIL',
        source_id: product.id,
        source_snapshot_json: {
          product_id: product.id,
          product_title: product.title,
          variant_id: row.variant.id,
          variant_title: row.variant.title,
        },
        metadata: {
          inclusion_mode: 'VARIANT',
        },
      },
    });
  };

  const getDraftForVariant = (variantId: string): DiscountDraft =>
    discountDrafts[variantId] || { mode: 'NONE', value: '' };

  const updateDiscountDraft = (
    variantId: string,
    patch: Partial<DiscountDraft>,
  ) => {
    setDiscountDrafts((previous) => {
      const current = previous[variantId] || { mode: 'NONE', value: '' };
      const next = { ...current, ...patch };
      if (next.mode === 'NONE') {
        next.value = '';
      }
      return {
        ...previous,
        [variantId]: next,
      };
    });
  };

  const handleIncludeVariant = async (
    product: V2Product,
    row: VariantCampaignRow,
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!row.baseItem && !isAlwaysOnCampaign) {
        throw new Error('기본가가 없는 옵션은 캠페인에 포함할 수 없습니다.');
      }

      setSavingVariantId(row.variant.id);
      const draft = getDraftForVariant(row.variant.id);
      await includeVariantTargetIfNeeded(product, row);

      if (draft.mode !== 'NONE') {
        if (!row.baseItem) {
          throw new Error('할인을 적용하려면 먼저 기본가가 필요합니다.');
        }
        const finalAmount = computeEffectiveAmount(row.baseItem.unit_amount, draft);
        const priceList = await ensureCampaignPriceList();
        const metadata = getDiscountMetadata(row.baseItem.unit_amount, draft);

        if (row.campaignItem) {
          await updatePriceListItem.mutateAsync({
            itemId: row.campaignItem.id,
            data: {
              product_id: product.id,
              variant_id: row.variant.id,
              unit_amount: finalAmount,
              compare_at_amount: row.baseItem.unit_amount,
              status: 'ACTIVE',
              metadata,
            },
            skipInvalidate: true,
          });
        } else {
          await createPriceListItem.mutateAsync({
            priceListId: priceList.id,
            data: {
              product_id: product.id,
              variant_id: row.variant.id,
              unit_amount: finalAmount,
              compare_at_amount: row.baseItem.unit_amount,
              status: 'ACTIVE',
              metadata,
            },
            skipInvalidate: true,
          });
        }

        if (priceList.status !== 'PUBLISHED') {
          await publishPriceList.mutateAsync({
            id: priceList.id,
            skipInvalidate: true,
          });
          campaignPriceListRef.current = {
            ...priceList,
            status: 'PUBLISHED',
          };
        }
      }

      await refreshCampaignPricingQueries();
      setSuccessMessage(`${product.title} / ${row.variant.title || '기본 옵션'} 설정을 저장했습니다.`);
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    } finally {
      setSavingVariantId(null);
    }
  };

  const handleUseBasePrice = async (row: VariantCampaignRow) => {
    if (!row.campaignItem) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingVariantId(row.variant.id);
    try {
      await deactivatePriceListItem.mutateAsync(row.campaignItem.id);
      setSuccessMessage(`${row.variant.title || '기본 옵션'}을 기본가 사용으로 전환했습니다.`);
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    } finally {
      setSavingVariantId(null);
    }
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProductIds((previous) => ({
      ...previous,
      [productId]: !previous[productId],
    }));
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!window.confirm('이 대상을 캠페인에서 제거하시겠습니까?')) {
      return;
    }
    await handleRunAction(async () => {
      await deleteTarget.mutateAsync(targetId);
    });
  };

  const openPricingForProduct = (productId: string, pendingOnly = false) => {
    const searchParams = new URLSearchParams();
    searchParams.set('productId', productId);
    if (pendingOnly) {
      searchParams.set('pendingOnly', '1');
    }
    router.push(`/admin/v2-catalog/campaigns/${campaignId}/pricing?${searchParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="캠페인 상세 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (
    campaignError ||
    targetsError ||
    priceListsError ||
    basePriceListsError ||
    promotionsError ||
    projectsError ||
    productsError ||
    bundlesError ||
    campaignPriceItemsError ||
    basePriceItemsError ||
    variantsMapError ||
    !campaign ||
    !targets ||
    !projects ||
    !products ||
    !bundleDefinitions ||
    !priceLists ||
    !promotions
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          캠페인 상세 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/campaigns')}>
          목록으로
        </Button>
      </div>
    );
  }

  const hasPricingData = includedVariantCount > 0;
  const canActivate =
    campaign.status === 'DRAFT' ||
    campaign.status === 'SUSPENDED' ||
    campaign.status === 'CLOSED';
  const canSuspend = campaign.status === 'ACTIVE';
  const canClose = campaign.status === 'ACTIVE' || campaign.status === 'SUSPENDED';
  const activateButtonLabel =
    campaign.status === 'CLOSED'
      ? '재활성화'
      : campaign.status === 'SUSPENDED'
      ? '다시 활성화'
      : '활성화';
  const periodChipLabel =
    period === 'LIVE'
      ? '진행 중'
      : period === 'UPCOMING'
      ? '시작 전'
      : period === 'ENDED'
      ? '기간 종료'
      : '기간 제한 없음';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge intent={getCampaignStatusIntent(campaign.status)}>
              운영: {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </Badge>
            <Badge intent={getCampaignPeriodIntent(period)}>기간: {periodChipLabel}</Badge>
            <Badge intent="default">유형: {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{formatDateRange(campaign.starts_at, campaign.ends_at)}</p>
          <p className="mt-1 text-sm font-medium text-gray-700">
            현재 상태: {CAMPAIGN_STATUS_LABELS[campaign.status]}
            {campaign.status === 'CLOSED' ? ' (필요 시 재활성화 가능)' : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/campaigns')}>
            목록으로
          </Button>
          <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/edit`)}>
            캠페인 수정
          </Button>
          {!isAlwaysOnCampaign && (
            <Button onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/targets/new`)}>
              대상 추가
            </Button>
          )}
          <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/pricing`)}>
            가격 설정
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">대상 상품</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{eligibleProducts.length}</p>
          <p className="mt-1 text-xs text-gray-500">{linkedTargetSummary}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">캠페인 포함 옵션</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{includedVariantCount}</p>
          <p className="mt-1 text-xs text-gray-500">기본가 사용 {baseUsingVariantCount}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">할인/특가 적용</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{overrideVariantCount}</p>
          <p className="mt-1 text-xs text-gray-500">캠페인 OVERRIDE 옵션</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">캠페인 미포함</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{notIncludedVariantCount}</p>
          <p className="mt-1 text-xs text-gray-500">옵션 단위로 포함 가능</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">운영 상태</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{CAMPAIGN_STATUS_LABELS[campaign.status]}</p>
          <p className="mt-2 text-xs text-gray-500">채널 범위: {formatChannelScope(campaign.channel_scope_json)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => handleRunAction(() => activateCampaign.mutateAsync(campaign.id))}
              disabled={!canActivate}
            >
              {activateButtonLabel}
            </Button>
            <Button
              size="sm"
              intent="neutral"
              onClick={() => handleRunAction(() => suspendCampaign.mutateAsync(campaign.id))}
              disabled={!canSuspend}
            >
              일시 중지
            </Button>
            <Button
              size="sm"
              intent="neutral"
              onClick={() => {
                if (!window.confirm('캠페인을 종료 상태로 전환하시겠습니까? 종료 후에도 재활성화할 수 있습니다.')) {
                  return;
                }
                void handleRunAction(() => closeCampaign.mutateAsync(campaign.id));
              }}
              disabled={!canClose}
            >
              종료
            </Button>
          </div>
        </div>
      </section>

      {missingBaseVariantCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          기본가가 없는 포함 옵션이 {missingBaseVariantCount}개 있습니다. 먼저 기본 캠페인 가격을 등록해야 판매 가능 상태가 됩니다.
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">캠페인 상품/옵션 구성</h2>
            <p className="mt-1 text-sm text-gray-500">
              상품은 접어서 보여주고, 펼친 뒤 옵션별 포함 여부와 할인/특가를 관리합니다.
            </p>
          </div>
          {notIncludedProductRows[0] && (
            <Button size="sm" onClick={() => toggleProductExpanded(notIncludedProductRows[0].product.id)}>
              미포함 상품부터 보기
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">캠페인 포함 상품</h3>
              <Badge intent="success" size="sm">{includedProductRows.length}개</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {includedProductRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                  아직 캠페인에 포함된 상품/옵션이 없습니다.
                </div>
              ) : (
                includedProductRows.map((row) => {
                  const expanded = Boolean(expandedProductIds[row.product.id]);
                  return (
                    <div key={row.product.id} className="rounded-lg border border-white bg-white shadow-sm">
                      <button
                        type="button"
                        className="flex w-full flex-col gap-2 px-4 py-3 text-left lg:flex-row lg:items-center lg:justify-between"
                        onClick={() => toggleProductExpanded(row.product.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{row.product.title}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {row.product.product_kind === 'BUNDLE' ? '번들' : '일반'} · 옵션 {row.variants.length}개 · 포함 {row.includedCount}개 · 할인 {row.overrideCount}개
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-500">{expanded ? '접기' : '펼치기'}</span>
                      </button>
                      {expanded && (
                        <div className="space-y-2 border-t border-gray-100 px-4 py-3">
                          {row.variants.map((variantRow) => {
                            const draft = getDraftForVariant(variantRow.variant.id);
                            const previewAmount = getDraftPreviewAmount(
                              variantRow.baseItem?.unit_amount ?? null,
                              draft,
                            );
                            const isSavingRow = savingVariantId === variantRow.variant.id;
                            return (
                              <div key={variantRow.variant.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-gray-900">
                                        {variantRow.variant.title || '기본 옵션'}
                                      </p>
                                      <Badge
                                        intent={
                                          variantRow.state === 'OVERRIDE'
                                            ? 'warning'
                                            : variantRow.state === 'MISSING_BASE'
                                              ? 'error'
                                              : variantRow.state === 'BASE'
                                                ? 'success'
                                                : 'default'
                                        }
                                        size="sm"
                                      >
                                        {variantRow.state === 'OVERRIDE'
                                          ? '할인/특가'
                                          : variantRow.state === 'MISSING_BASE'
                                            ? '기본가 없음'
                                            : variantRow.state === 'BASE'
                                              ? '기본가 사용'
                                              : '미포함'}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                      기본가 {variantRow.baseItem ? formatCurrency(variantRow.baseItem.unit_amount) : '없음'} · 적용가{' '}
                                      {variantRow.effectiveAmount === null ? '없음' : formatCurrency(variantRow.effectiveAmount)}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select
                                      className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700"
                                      value={draft.mode}
                                      onChange={(event) =>
                                        updateDiscountDraft(variantRow.variant.id, {
                                          mode: event.target.value as DiscountInputMode,
                                        })
                                      }
                                      disabled={!variantRow.baseItem || isAlwaysOnCampaign}
                                    >
                                      <option value="NONE">할인 없음</option>
                                      <option value="PERCENT">% 할인</option>
                                      <option value="FIXED">금액 할인</option>
                                      <option value="DIRECT">직접 가격</option>
                                    </select>
                                    <Input
                                      size="sm"
                                      className="w-24"
                                      placeholder={draft.mode === 'PERCENT' ? '10' : '1000'}
                                      value={draft.value}
                                      onChange={(event) =>
                                        updateDiscountDraft(variantRow.variant.id, {
                                          value: event.target.value,
                                        })
                                      }
                                      disabled={draft.mode === 'NONE' || !variantRow.baseItem || isAlwaysOnCampaign}
                                    />
                                    <span className="min-w-28 text-xs text-gray-500">
                                      예상 {previewAmount === null ? '-' : formatCurrency(previewAmount)}
                                    </span>
                                    {variantRow.campaignItem && !isAlwaysOnCampaign && (
                                      <Button
                                        size="sm"
                                        intent="neutral"
                                        onClick={() => handleUseBasePrice(variantRow)}
                                        loading={isSavingRow}
                                      >
                                        기본가 사용
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => handleIncludeVariant(row.product, variantRow)}
                                      loading={isSavingRow}
                                      disabled={!variantRow.baseItem && !isAlwaysOnCampaign}
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
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-900">캠페인 미포함 상품</h3>
              <Badge intent="info" size="sm">{notIncludedProductRows.length}개</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {notIncludedProductRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-blue-200 bg-white px-4 py-6 text-center text-sm text-blue-700">
                  미포함 옵션이 없습니다.
                </div>
              ) : (
                notIncludedProductRows.map((row) => {
                  const expanded = Boolean(expandedProductIds[row.product.id]);
                  return (
                    <div key={row.product.id} className="rounded-lg border border-white bg-white shadow-sm">
                      <button
                        type="button"
                        className="flex w-full flex-col gap-2 px-4 py-3 text-left lg:flex-row lg:items-center lg:justify-between"
                        onClick={() => toggleProductExpanded(row.product.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{row.product.title}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {row.product.product_kind === 'BUNDLE' ? '번들' : '일반'} · 옵션 {row.variants.length}개 · 미포함 {row.notIncludedCount}개
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-500">{expanded ? '접기' : '펼치기'}</span>
                      </button>
                      {expanded && (
                        <div className="space-y-2 border-t border-gray-100 px-4 py-3">
                          {row.variants
                            .filter((variantRow) => variantRow.state === 'NOT_INCLUDED')
                            .map((variantRow) => {
                              const draft = getDraftForVariant(variantRow.variant.id);
                              const previewAmount = getDraftPreviewAmount(
                                variantRow.baseItem?.unit_amount ?? null,
                                draft,
                              );
                              const isSavingRow = savingVariantId === variantRow.variant.id;
                              return (
                                <div key={variantRow.variant.id} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {variantRow.variant.title || '기본 옵션'}
                                      </p>
                                      <p className="mt-1 text-xs text-gray-600">
                                        기본가 {variantRow.baseItem ? formatCurrency(variantRow.baseItem.unit_amount) : '없음'}
                                      </p>
                                      {!variantRow.baseItem && (
                                        <p className="mt-1 text-xs text-red-700">기본가를 먼저 등록해야 포함할 수 있습니다.</p>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <select
                                        className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700"
                                        value={draft.mode}
                                        onChange={(event) =>
                                          updateDiscountDraft(variantRow.variant.id, {
                                            mode: event.target.value as DiscountInputMode,
                                          })
                                        }
                                        disabled={!variantRow.baseItem}
                                      >
                                        <option value="NONE">할인 없음</option>
                                        <option value="PERCENT">% 할인</option>
                                        <option value="FIXED">금액 할인</option>
                                        <option value="DIRECT">직접 가격</option>
                                      </select>
                                      <Input
                                        size="sm"
                                        className="w-24"
                                        placeholder={draft.mode === 'PERCENT' ? '10' : '1000'}
                                        value={draft.value}
                                        onChange={(event) =>
                                          updateDiscountDraft(variantRow.variant.id, {
                                            value: event.target.value,
                                          })
                                        }
                                        disabled={draft.mode === 'NONE' || !variantRow.baseItem}
                                      />
                                      <span className="min-w-28 text-xs text-gray-500">
                                        예상 {previewAmount === null ? '-' : formatCurrency(previewAmount)}
                                      </span>
                                      <Button
                                        size="sm"
                                        onClick={() => handleIncludeVariant(row.product, variantRow)}
                                        loading={isSavingRow}
                                        disabled={!variantRow.baseItem}
                                      >
                                        캠페인에 포함
                                      </Button>
                                      <Button
                                        size="sm"
                                        intent="neutral"
                                        onClick={() => openPricingForProduct(row.product.id, true)}
                                      >
                                        가격 상세
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        {variantsMapFetching && (
          <p className="mt-3 text-xs text-gray-500">옵션 정보를 최신 상태로 갱신하는 중입니다.</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">캠페인 개요</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-900">설명</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {campaign.description || '등록된 설명이 없습니다.'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">코드 및 최근 수정</p>
            <p className="mt-2 text-sm text-gray-600">코드: {campaign.code}</p>
            <p className="mt-1 text-sm text-gray-600">최근 수정: {new Date(campaign.updated_at).toLocaleString('ko-KR')}</p>
            <p className="mt-1 text-sm text-gray-600">가격표: {campaignScopedPriceLists.length}개</p>
            <p className="mt-1 text-sm text-gray-600">프로모션: {promotions.length}개</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">적용 대상</h2>
            <p className="mt-1 text-sm text-gray-500">
              {isAlwaysOnCampaign
                ? '기본 캠페인은 프로젝트 전체를 기본 대상으로 보며, 필요 시 예외 대상을 제외해 운영합니다.'
                : '포함 대상과 제외 대상을 나눠서 보여줍니다.'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/targets/new`)}
          >
            {isAlwaysOnCampaign ? '예외 대상 관리' : '대상 추가'}
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {groupedTargets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              아직 등록된 대상이 없습니다.
            </div>
          ) : (
            groupedTargets.map(([groupKey, groupTargets]) => {
              if (!groupTargets) {
                return null;
              }
              const isExcluded = groupKey.startsWith('exclude-');
              const targetType = groupTargets[0]?.target_type;
              if (!targetType) {
                return null;
              }
              return (
                <div key={groupKey} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge intent={isExcluded ? 'warning' : 'success'}>
                      {isExcluded ? '제외 대상' : '포함 대상'}
                    </Badge>
                    <Badge intent="default">{CAMPAIGN_TARGET_TYPE_LABELS[targetType]}</Badge>
                    <span className="text-sm text-gray-500">{groupTargets.length}개</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {groupTargets.map((target) => (
                      <div
                        key={target.id}
                        className="flex flex-col gap-3 rounded-xl border border-white bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {resolveTargetLabel({ target, projects, products, bundleDefinitions })}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{target.target_id}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            intent="neutral"
                            size="sm"
                            onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/targets/${target.id}/edit`)}
                          >
                            수정
                          </Button>
                          <Button
                            intent="danger"
                            size="sm"
                            onClick={() => handleDeleteTarget(target.id)}
                            loading={deleteTarget.isPending}
                          >
                            제거
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {!hasPricingData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          아직 캠페인에 포함된 옵션이 없습니다. 미포함 상품을 펼쳐 옵션을 캠페인에 포함해 주세요.
        </div>
      )}
    </div>
  );
}
