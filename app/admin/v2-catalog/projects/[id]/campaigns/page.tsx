'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  useV2CampaignOverview,
  useV2CampaignTargetsMap,
  useV2Campaigns,
  useV2AdminProducts,
  useV2AdminProject,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  formatDateRange,
  getCampaignPeriod,
  getCampaignPeriodIntent,
  getCampaignStatusIntent,
  getPeriodLabel,
} from '@/lib/client/utils/v2-campaign-admin';
import {
  buildCampaignProjectIdSet,
  buildProductsByIdMap,
} from '@/lib/client/utils/v2-campaign-targeting';

export default function V2ProjectCampaignsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const projectId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: project, isLoading: projectLoading, error: projectError } = useV2AdminProject(projectId);
  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useV2Campaigns();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts({
    projectId,
  });

  const campaignIds = useMemo(() => (campaigns || []).map((campaign) => campaign.id), [campaigns]);
  const targetsByCampaignId = useV2CampaignTargetsMap(campaignIds);
  const overviewByCampaignId = useV2CampaignOverview(campaignIds);
  const productsById = useMemo(() => buildProductsByIdMap(products || []), [products]);

  const isLoading = projectLoading || campaignsLoading || productsLoading;
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="프로젝트 캠페인 현황을 불러오는 중입니다." />
      </div>
    );
  }

  if (projectError || campaignsError || productsError || !project || !campaigns || !products) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          프로젝트 캠페인 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/campaigns')}>
          캠페인 메인으로
        </Button>
      </div>
    );
  }

  const relatedCampaigns = campaigns
    .filter((campaign) => {
      const relatedProjectIds = buildCampaignProjectIdSet({
        campaign,
        targets: targetsByCampaignId[campaign.id]?.targets || [],
        productsById,
      });
      return relatedProjectIds.has(project.id);
    })
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));

  const baseCampaign = relatedCampaigns.find((campaign) => campaign.campaign_type === 'ALWAYS_ON') || null;
  const targetedCampaigns = relatedCampaigns.filter((campaign) => campaign.campaign_type !== 'ALWAYS_ON');
  const activeProductCount = products.filter((product) => product.status === 'ACTIVE').length;
  const draftProductCount = products.filter((product) => product.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">프로젝트 캠페인 허브</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            기본 캠페인과 지정 캠페인을 한 곳에서 보고 가격 등록 상태를 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/campaigns')}>
            캠페인 메인
          </Button>
          <Button
            intent="neutral"
            onClick={() => router.push(`/admin/v2-catalog/campaigns/new?type=ALWAYS_ON&projectId=${project.id}`)}
          >
            기본 캠페인 생성
          </Button>
          <Button onClick={() => router.push(`/admin/v2-catalog/campaigns/new?projectId=${project.id}`)}>
            지정 캠페인 생성
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">전체 캠페인</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{relatedCampaigns.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">기본 캠페인</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{baseCampaign ? 1 : 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">ACTIVE 지정 캠페인</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {targetedCampaigns.filter((campaign) => campaign.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">상품 상태</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            ACTIVE {activeProductCount}개 · DRAFT {draftProductCount}개
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">기본 캠페인</h2>
            <p className="mt-1 text-sm text-gray-500">이 프로젝트의 상시(BASE) 가격 운영 캠페인입니다.</p>
          </div>
        </div>

        <div className="mt-4">
          {!baseCampaign ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              기본 캠페인이 아직 없습니다.
            </div>
          ) : (
            <article className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge intent={getCampaignStatusIntent(baseCampaign.status)}>
                  {CAMPAIGN_STATUS_LABELS[baseCampaign.status]}
                </Badge>
                <Badge intent={getCampaignPeriodIntent(getCampaignPeriod(baseCampaign.starts_at, baseCampaign.ends_at))}>
                  {getPeriodLabel(getCampaignPeriod(baseCampaign.starts_at, baseCampaign.ends_at))}
                </Badge>
                <Badge intent="default">{CAMPAIGN_TYPE_LABELS[baseCampaign.campaign_type]}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">{baseCampaign.name}</p>
              <p className="mt-1 text-xs text-gray-500">{formatDateRange(baseCampaign.starts_at, baseCampaign.ends_at)}</p>
              <p className="mt-1 text-xs text-gray-500">
                가격/프로모션 연결: {overviewByCampaignId[baseCampaign.id]?.hasLinkedPricing ? '완료' : '미완료'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${baseCampaign.id}`)}>
                  상세
                </Button>
                <Button size="sm" onClick={() => router.push(`/admin/v2-catalog/campaigns/${baseCampaign.id}/pricing`)}>
                  가격 설정
                </Button>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">지정 캠페인</h2>
        <p className="mt-1 text-sm text-gray-500">
          시즌/팝업/이벤트처럼 기간 운영이 필요한 캠페인입니다.
        </p>

        <div className="mt-4 space-y-3">
          {targetedCampaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              지정 캠페인이 아직 없습니다.
            </div>
          ) : (
            targetedCampaigns.map((campaign) => (
              <article key={campaign.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge intent={getCampaignStatusIntent(campaign.status)}>
                        {CAMPAIGN_STATUS_LABELS[campaign.status]}
                      </Badge>
                      <Badge intent={getCampaignPeriodIntent(getCampaignPeriod(campaign.starts_at, campaign.ends_at))}>
                        {getPeriodLabel(getCampaignPeriod(campaign.starts_at, campaign.ends_at))}
                      </Badge>
                      <Badge intent="default">{CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-gray-900">{campaign.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDateRange(campaign.starts_at, campaign.ends_at)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      가격/프로모션 연결: {overviewByCampaignId[campaign.id]?.hasLinkedPricing ? '완료' : '미완료'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}`)}>
                      상세
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/pricing`)}>
                      가격 설정
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
