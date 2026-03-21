'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { V2Campaign } from '@/lib/client/api/v2-catalog-admin.api';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  formatDateRange,
  getCampaignPeriod,
  getCampaignPeriodIntent,
  getCampaignStatusIntent,
  getPeriodLabel,
} from '@/lib/client/utils/v2-campaign-admin';

type CampaignOverviewListProps = {
  campaigns: V2Campaign[];
  overviewByCampaignId: Record<
    string,
    {
      targetCount: number;
      excludedTargetCount: number;
      priceListCount: number;
      promotionCount: number;
      hasLinkedPricing: boolean;
      isLoading: boolean;
    }
  >;
  onOpen: (campaignId: string) => void;
  onEdit: (campaignId: string) => void;
};

export function CampaignOverviewList({
  campaigns,
  overviewByCampaignId,
  onOpen,
  onEdit,
}: CampaignOverviewListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
        조건에 맞는 캠페인이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => {
        const overview = overviewByCampaignId[campaign.id];
        const isOverviewLoading = !overview || overview.isLoading;
        const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);

        return (
          <article
            key={campaign.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge intent={getCampaignStatusIntent(campaign.status)}>
                    {CAMPAIGN_STATUS_LABELS[campaign.status]}
                  </Badge>
                  <Badge intent={getCampaignPeriodIntent(period)}>{getPeriodLabel(period)}</Badge>
                  <Badge intent="default">{CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</Badge>
                </div>

                <h3 className="mt-3 text-lg font-semibold text-gray-900">{campaign.name}</h3>
                <p className="mt-2 text-sm text-gray-600">{formatDateRange(campaign.starts_at, campaign.ends_at)}</p>
                <p className="mt-2 text-sm text-gray-500">
                  {campaign.description?.trim() || '캠페인 설명이 아직 등록되지 않았습니다.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button intent="neutral" size="sm" onClick={() => onEdit(campaign.id)}>
                  수정
                </Button>
                <Button size="sm" onClick={() => onOpen(campaign.id)}>
                  상세 보기
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">적용 대상</p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {isOverviewLoading ? '집계 중' : `${overview.targetCount}개 대상`}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {isOverviewLoading ? '연결 대상을 계산하는 중입니다.' : `제외 대상 ${overview.excludedTargetCount}개`}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">가격 연결</p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {isOverviewLoading ? '집계 중' : `가격표 ${overview.priceListCount}개`}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {isOverviewLoading ? '프로모션 연결을 계산하는 중입니다.' : `프로모션 ${overview.promotionCount}개`}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">운영 판단</p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {isOverviewLoading
                    ? '연결 현황을 집계하고 있습니다.'
                    : overview.hasLinkedPricing
                    ? '가격 또는 프로모션이 연결되어 있습니다.'
                    : '아직 가격/프로모션이 연결되지 않았습니다.'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  캠페인 상세에서 가격을 설정하면 유형에 따라 BASE/OVERRIDE로 운영 기준에 반영됩니다.
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
