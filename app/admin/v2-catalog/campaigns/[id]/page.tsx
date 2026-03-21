'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  useActivateV2Campaign,
  useCloseV2Campaign,
  useDeleteV2CampaignTarget,
  useSuspendV2Campaign,
  useV2BundleDefinitions,
  useV2Campaign,
  useV2CampaignTargets,
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
  getPeriodLabel,
  resolveTargetLabel,
  summarizeTargetGroups,
} from '@/lib/client/utils/v2-campaign-admin';

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
  const { data: priceLists, isLoading: priceListsLoading } = useV2PriceLists({ campaignId });
  const { data: promotions, isLoading: promotionsLoading } = useV2Promotions({ campaignId });
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useV2AdminProjects();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: bundleDefinitions, isLoading: bundlesLoading, error: bundlesError } = useV2BundleDefinitions();

  const activateCampaign = useActivateV2Campaign();
  const suspendCampaign = useSuspendV2Campaign();
  const closeCampaign = useCloseV2Campaign();
  const deleteTarget = useDeleteV2CampaignTarget();

  const isLoading =
    campaignLoading ||
    targetsLoading ||
    priceListsLoading ||
    promotionsLoading ||
    projectsLoading ||
    productsLoading ||
    bundlesLoading;

  const linkedTargetSummary = useMemo(() => summarizeTargetGroups(targets || []), [targets]);
  const period = useMemo(() => (campaign ? getCampaignPeriod(campaign.starts_at, campaign.ends_at) : 'NO_PERIOD'), [campaign]);

  const groupedTargets = useMemo(() => {
    const map = new Map<string, typeof targets>();
    (targets || []).forEach((target) => {
      const key = target.is_excluded ? `exclude-${target.target_type}` : `include-${target.target_type}`;
      map.set(key, [...(map.get(key) || []), target]);
    });
    return Array.from(map.entries());
  }, [targets]);

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
    projectsError ||
    productsError ||
    bundlesError ||
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge intent={getCampaignStatusIntent(campaign.status)}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </Badge>
            <Badge intent={getCampaignPeriodIntent(period)}>{getPeriodLabel(period)}</Badge>
            <Badge intent="default">{CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{formatDateRange(campaign.starts_at, campaign.ends_at)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/campaigns')}>
            목록으로
          </Button>
          <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/edit`)}>
            캠페인 수정
          </Button>
          <Button onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/targets/new`)}>
            대상 추가
          </Button>
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
          <p className="text-sm font-medium text-gray-500">적용 대상</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">{linkedTargetSummary}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">할인 설정</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{priceLists.length}</p>
          <p className="mt-1 text-xs text-gray-500">프로모션 {promotions.length}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">채널 범위</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">{formatChannelScope(campaign.channel_scope_json)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">운영 액션</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => handleRunAction(() => activateCampaign.mutateAsync(campaign.id))}>
              활성화
            </Button>
            <Button size="sm" intent="neutral" onClick={() => handleRunAction(() => suspendCampaign.mutateAsync(campaign.id))}>
              일시 중지
            </Button>
            <Button size="sm" intent="neutral" onClick={() => handleRunAction(() => closeCampaign.mutateAsync(campaign.id))}>
              종료
            </Button>
          </div>
        </div>
      </section>

      {!priceLists.length && !promotions.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          아직 가격표나 프로모션이 연결되지 않았습니다. 대상을 고른 뒤 &quot;가격 설정&quot;에서 옵션별 가격을 연결해 주세요.
        </div>
      )}

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
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">적용 대상</h2>
            <p className="mt-1 text-sm text-gray-500">포함 대상과 제외 대상을 나눠서 보여줍니다.</p>
          </div>
          <Button size="sm" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/targets/new`)}>
            대상 추가
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
                      <div key={target.id} className="flex flex-col gap-3 rounded-xl border border-white bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {resolveTargetLabel({ target, projects, products, bundleDefinitions })}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{target.target_id}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button intent="neutral" size="sm" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/targets/${target.id}/edit`)}>
                            수정
                          </Button>
                          <Button intent="danger" size="sm" onClick={() => handleDeleteTarget(target.id)} loading={deleteTarget.isPending}>
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

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">연결된 가격표</h2>
              <p className="mt-1 text-sm text-gray-500">
                이 캠페인에서 사용하는 가격표를 관리합니다. 가격 미설정 옵션은 가격 설정 화면에서 바로 입력할 수 있습니다.
              </p>
            </div>
            <Button
              size="sm"
              intent="neutral"
              onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/pricing`)}
            >
              가격 설정
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {priceLists.length === 0 ? (
              <p className="text-sm text-gray-500">연결된 가격표가 없습니다.</p>
            ) : (
              priceLists.map((priceList) => (
                <div key={priceList.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{priceList.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{priceList.status} · {formatDateRange(priceList.starts_at, priceList.ends_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">연결된 프로모션</h2>
          <div className="mt-4 space-y-2">
            {promotions.length === 0 ? (
              <p className="text-sm text-gray-500">연결된 프로모션이 없습니다.</p>
            ) : (
              promotions.map((promotion) => (
                <div key={promotion.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{promotion.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{promotion.status} · {formatDateRange(promotion.starts_at, promotion.ends_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
