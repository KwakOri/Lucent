'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/src/components/toast';
import {
  useV2CampaignOverview,
  useV2Campaigns,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import type { V2Campaign } from '@/lib/client/api/v2-catalog-admin.api';
import {
  type CampaignSortKey,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  formatDateRange,
  formatDateTime,
  getCampaignPeriod,
  getCampaignPeriodIntent,
  getCampaignStatusIntent,
} from '@/lib/client/utils/v2-campaign-admin';

const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

type CampaignTimelineFilter = 'ALL' | 'UPCOMING' | 'LIVE' | 'ENDED';

const CAMPAIGN_TIMELINE_LABELS: Record<CampaignTimelineFilter, string> = {
  ALL: '전체',
  UPCOMING: '예정',
  LIVE: '진행 중',
  ENDED: '완료',
};

const CAMPAIGN_TIMELINE_OPTIONS: CampaignTimelineFilter[] = [
  'LIVE',
  'UPCOMING',
  'ENDED',
  'ALL',
];

const CAMPAIGN_SORT_OPTIONS: Array<{ value: CampaignSortKey; label: string }> = [
  { value: 'END_ASC', label: '종료 임박순' },
  { value: 'START_ASC', label: '시작 빠른순' },
  { value: 'UPDATED_DESC', label: '최근 수정순' },
  { value: 'NAME_ASC', label: '이름순' },
];

function getCampaignTimeline(campaign: V2Campaign): Exclude<CampaignTimelineFilter, 'ALL'> {
  if (campaign.status === 'CLOSED' || campaign.status === 'ARCHIVED') {
    return 'ENDED';
  }

  const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);
  if (period === 'NO_PERIOD') {
    return 'LIVE';
  }
  return period;
}

function getCampaignTimelineIntent(
  timeline: Exclude<CampaignTimelineFilter, 'ALL'>,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (timeline === 'LIVE') {
    return 'success';
  }
  if (timeline === 'UPCOMING') {
    return 'warning';
  }
  return 'info';
}

function getSortValue(value: string | null, fallback: string): string {
  return value || fallback;
}

function sortCampaigns(left: V2Campaign, right: V2Campaign, sortKey: CampaignSortKey) {
  if (sortKey === 'NAME_ASC') {
    return left.name.localeCompare(right.name, 'ko');
  }

  if (sortKey === 'START_ASC') {
    const result = getSortValue(left.starts_at, '9999-12-31T23:59:59.999Z').localeCompare(
      getSortValue(right.starts_at, '9999-12-31T23:59:59.999Z'),
    );
    return result || right.updated_at.localeCompare(left.updated_at);
  }

  if (sortKey === 'END_ASC') {
    const result = getSortValue(left.ends_at, '9999-12-31T23:59:59.999Z').localeCompare(
      getSortValue(right.ends_at, '9999-12-31T23:59:59.999Z'),
    );
    return result || right.updated_at.localeCompare(left.updated_at);
  }

  return right.updated_at.localeCompare(left.updated_at);
}

export default function V2CatalogCampaignsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: campaigns, isLoading, error } = useV2Campaigns();

  const [keyword, setKeyword] = useState('');
  const [timelineFilter, setTimelineFilter] =
    useState<CampaignTimelineFilter>('LIVE');
  const [sortKey, setSortKey] = useState<CampaignSortKey>('END_ASC');

  const campaignIds = useMemo(
    () => (campaigns || []).map((campaign) => campaign.id),
    [campaigns],
  );
  const overviewByCampaignId = useV2CampaignOverview(campaignIds);

  const timelineCounts = useMemo(() => {
    return (campaigns || []).reduce<Record<CampaignTimelineFilter, number>>(
      (accumulator, campaign) => {
        const timeline = getCampaignTimeline(campaign);
        accumulator[timeline] += 1;
        accumulator.ALL += 1;
        return accumulator;
      },
      {
        ALL: 0,
        UPCOMING: 0,
        LIVE: 0,
        ENDED: 0,
      },
    );
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return (campaigns || [])
      .filter((campaign) => {
        const timeline = getCampaignTimeline(campaign);
        if (timelineFilter !== 'ALL' && timeline !== timelineFilter) {
          return false;
        }

        if (!search) {
          return true;
        }

        return `${campaign.name} ${campaign.code} ${campaign.description || ''}`
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => sortCampaigns(left, right, sortKey));
  }, [campaigns, keyword, sortKey, timelineFilter]);

  async function handleCopyCampaignLink(campaignId: string, campaignName: string) {
    const campaignPath = `/shop?campaign_id=${encodeURIComponent(campaignId)}`;
    const absoluteLink =
      typeof window !== 'undefined'
        ? `${window.location.origin}${campaignPath}`
        : campaignPath;

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      showToast('클립보드 복사를 지원하지 않는 환경입니다.', { type: 'warning' });
      return;
    }

    try {
      await navigator.clipboard.writeText(absoluteLink);
      showToast(`${campaignName} 링크를 복사했습니다.`, { type: 'success' });
    } catch {
      showToast('링크 복사에 실패했습니다. 다시 시도해 주세요.', { type: 'error' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="캠페인 목록을 준비하는 중입니다." />
      </div>
    );
  }

  if (error || !campaigns) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        캠페인 정보를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 캠페인 관리</h1>
          <p className="mt-1 text-sm text-gray-500">캠페인 목록</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
          <Button onClick={() => router.push('/admin/v2-catalog/campaigns/new')}>
            새 캠페인 만들기
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <Input
            placeholder="캠페인명, 코드, 설명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as CampaignSortKey)}
            className={SELECT_CLASS}
            aria-label="정렬 기준"
          >
            {CAMPAIGN_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {CAMPAIGN_TIMELINE_OPTIONS.map((timeline) => {
            const isSelected = timelineFilter === timeline;
            return (
              <button
                key={timeline}
                type="button"
                onClick={() => setTimelineFilter(timeline)}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block text-sm font-medium">
                  {CAMPAIGN_TIMELINE_LABELS[timeline]}
                </span>
                <span className="mt-1 block text-xl font-bold">
                  {timelineCounts[timeline]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {CAMPAIGN_TIMELINE_LABELS[timelineFilter]} 캠페인
            </h2>
            <Badge intent="info" size="md">
              {filteredCampaigns.length}개
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  캠페인
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  캠페인 상태
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  운영 상태
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  기간
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  연결
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  최근 수정
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    조건에 맞는 캠페인이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const timeline = getCampaignTimeline(campaign);
                  const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);
                  const overview = overviewByCampaignId[campaign.id];
                  const overviewText = !overview || overview.isLoading
                    ? '집계 중'
                    : `대상 ${overview.targetCount}개 · 가격 ${overview.priceListCount}개 · 프로모션 ${overview.promotionCount}개`;

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="min-w-[260px] px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge intent="default">
                            {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                          </Badge>
                          {period === 'NO_PERIOD' ? (
                            <Badge intent={getCampaignPeriodIntent(period)}>상시</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 font-medium text-gray-900">{campaign.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{campaign.code}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge intent={getCampaignTimelineIntent(timeline)}>
                          {CAMPAIGN_TIMELINE_LABELS[timeline]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge intent={getCampaignStatusIntent(campaign.status)}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </Badge>
                      </td>
                      <td className="min-w-[220px] px-4 py-4 text-sm text-gray-600">
                        {formatDateRange(campaign.starts_at, campaign.ends_at)}
                      </td>
                      <td className="min-w-[220px] px-4 py-4 text-sm text-gray-600">
                        {overviewText}
                      </td>
                      <td className="min-w-[150px] px-4 py-4 text-xs text-gray-500">
                        {formatDateTime(campaign.updated_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            intent="neutral"
                            onClick={() => void handleCopyCampaignLink(campaign.id, campaign.name)}
                          >
                            링크 복사
                          </Button>
                          <Button
                            size="sm"
                            intent="neutral"
                            onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/edit`)}
                          >
                            수정
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}`)}
                          >
                            상세
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
