'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import type { V2PriceList, V2PriceListItem } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useActivateV2Campaign,
  useCloseV2Campaign,
  useDeleteV2CampaignTarget,
  useSuspendV2Campaign,
  useV2BundleDefinitions,
  useV2Campaign,
  useV2CampaignTargets,
  useV2PriceListItems,
  useV2PriceLists,
  useV2Promotions,
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';
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

function pickLatestPriceList(lists: V2PriceList[]): V2PriceList | null {
  if (lists.length === 0) {
    return null;
  }
  const sorted = [...lists].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return sorted[0] || null;
}

type ProductPricingRow = {
  productId: string;
  title: string;
  productKind: 'STANDARD' | 'BUNDLE';
  sourceLabel: string;
  minAmount: number | null;
  maxAmount: number | null;
  configured: boolean;
  reason: string;
};

export default function V2CatalogCampaignDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const deleteTarget = useDeleteV2CampaignTarget();

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
    basePriceItemsLoading;

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
      targets: targets || [],
      products: products || [],
    });
  }, [campaign, products, targets]);

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

  const productPricingRows = useMemo<ProductPricingRow[]>(() => {
    return eligibleProducts.map((product) => {
      const campaignItemsForProduct = campaignPriceItemsByProductId.get(product.id) || [];
      const baseItemsForProduct = basePriceItemsByProductId.get(product.id) || [];
      const configured = isAlwaysOnCampaign
        ? campaignItemsForProduct.length > 0
        : campaignItemsForProduct.length > 0 || baseItemsForProduct.length > 0;

      const effectiveItems =
        campaignItemsForProduct.length > 0 ? campaignItemsForProduct : baseItemsForProduct;
      const priceAmounts = effectiveItems
        .map((item) => item.unit_amount)
        .filter((amount) => Number.isFinite(amount));
      const minAmount = priceAmounts.length > 0 ? Math.min(...priceAmounts) : null;
      const maxAmount = priceAmounts.length > 0 ? Math.max(...priceAmounts) : null;

      let sourceLabel = '미설정';
      if (campaignItemsForProduct.length > 0) {
        sourceLabel = isAlwaysOnCampaign ? 'BASE(상시)' : 'OVERRIDE(캠페인)';
      } else if (baseItemsForProduct.length > 0) {
        sourceLabel = 'BASE';
      }

      return {
        productId: product.id,
        title: product.title,
        productKind: product.product_kind,
        sourceLabel,
        minAmount,
        maxAmount,
        configured,
        reason: isAlwaysOnCampaign
          ? '기본 캠페인 가격이 아직 없습니다.'
          : 'BASE 또는 캠페인 가격이 아직 없습니다.',
      };
    });
  }, [
    basePriceItemsByProductId,
    campaignPriceItemsByProductId,
    eligibleProducts,
    isAlwaysOnCampaign,
  ]);

  const configuredProductRows = useMemo(
    () => productPricingRows.filter((row) => row.configured),
    [productPricingRows],
  );
  const unconfiguredProductRows = useMemo(
    () => productPricingRows.filter((row) => !row.configured),
    [productPricingRows],
  );

  const handleRunAction = async (task: () => Promise<unknown>) => {
    setErrorMessage(null);
    try {
      await task();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
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

  const hasPricingData = configuredProductRows.length > 0;
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">대상 상품</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{eligibleProducts.length}</p>
          <p className="mt-1 text-xs text-gray-500">{linkedTargetSummary}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">가격 등록 완료</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{configuredProductRows.length}</p>
          <p className="mt-1 text-xs text-gray-500">상점 노출 가능한 상품</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">가격 미등록</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{unconfiguredProductRows.length}</p>
          <p className="mt-1 text-xs text-gray-500">우선 등록이 필요한 상품</p>
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

      {unconfiguredProductRows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          가격 미등록 상품이 {unconfiguredProductRows.length}개 있습니다. 미등록 상품부터 우선 입력하면 상점 노출 누락을 줄일 수 있습니다.
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">가격 등록 현황</h2>
            <p className="mt-1 text-sm text-gray-500">
              캠페인에서 가격이 적용된 상품과 아직 가격이 없는 상품을 나눠 보여줍니다.
            </p>
          </div>
          {unconfiguredProductRows[0] && (
            <Button size="sm" onClick={() => openPricingForProduct(unconfiguredProductRows[0].productId, true)}>
              미등록 상품부터 입력
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">등록 완료 상품</h3>
              <Badge intent="success" size="sm">{configuredProductRows.length}개</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {configuredProductRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                  아직 등록 완료된 상품이 없습니다.
                </div>
              ) : (
                configuredProductRows.map((row) => (
                  <div
                    key={row.productId}
                    className="flex flex-col gap-2 rounded-lg border border-white bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{row.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {row.productKind === 'BUNDLE' ? '번들' : '일반'} · {row.sourceLabel} ·{' '}
                        {row.minAmount === null
                          ? '가격 정보 없음'
                          : row.minAmount === row.maxAmount
                            ? formatCurrency(row.minAmount)
                            : `${formatCurrency(row.minAmount)} ~ ${formatCurrency(row.maxAmount || row.minAmount)}`}
                      </p>
                    </div>
                    <Button size="sm" intent="neutral" onClick={() => openPricingForProduct(row.productId)}>
                      가격 수정
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-900">가격 미등록 상품</h3>
              <Badge intent="error" size="sm">{unconfiguredProductRows.length}개</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {unconfiguredProductRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-red-200 bg-white px-4 py-6 text-center text-sm text-red-700">
                  모든 대상 상품의 가격이 등록되어 있습니다.
                </div>
              ) : (
                unconfiguredProductRows.map((row) => (
                  <div
                    key={row.productId}
                    className="flex flex-col gap-2 rounded-lg border border-white bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{row.title}</p>
                      <p className="mt-1 text-xs text-red-700">{row.reason}</p>
                    </div>
                    <Button size="sm" onClick={() => openPricingForProduct(row.productId, true)}>
                      가격 등록
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
          아직 가격이 연결되지 않은 상태입니다. 가격 설정에서 상품별 가격을 먼저 등록해 주세요.
        </div>
      )}
    </div>
  );
}
