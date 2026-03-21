'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { CampaignOverviewList } from '@/src/components/admin/v2-catalog/CampaignOverviewList';
import { useV2CampaignOverview, useV2Campaigns } from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  type CampaignFilterStatus,
  type CampaignPeriodFilter,
  type CampaignSortKey,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_TYPES,
  getCampaignPeriod,
} from '@/lib/client/utils/v2-campaign-admin';

const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

type CampaignManagementTab = 'BASE' | 'TARGETED';

export default function V2CatalogCampaignsPage() {
  const router = useRouter();
  const { data: campaigns, isLoading, error } = useV2Campaigns();

  const [managementTab, setManagementTab] = useState<CampaignManagementTab>('BASE');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignFilterStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState<CampaignPeriodFilter>('ALL');
  const [sortKey, setSortKey] = useState<CampaignSortKey>('UPDATED_DESC');

  useEffect(() => {
    setTypeFilter('ALL');
  }, [managementTab]);

  const filteredCampaigns = useMemo(() => {
    const items = campaigns || [];
    const search = keyword.trim().toLowerCase();

    return items
      .filter((campaign) => {
        if (managementTab === 'BASE' && campaign.campaign_type !== 'ALWAYS_ON') {
          return false;
        }
        if (managementTab === 'TARGETED' && campaign.campaign_type === 'ALWAYS_ON') {
          return false;
        }
        if (statusFilter !== 'ALL' && campaign.status !== statusFilter) {
          return false;
        }
        if (managementTab === 'TARGETED' && typeFilter !== 'ALL' && campaign.campaign_type !== typeFilter) {
          return false;
        }
        const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);
        if (periodFilter !== 'ALL' && period !== periodFilter) {
          return false;
        }
        if (!search) {
          return true;
        }
        return `${campaign.name} ${campaign.code} ${campaign.description || ''}`
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => {
        if (sortKey === 'NAME_ASC') {
          return left.name.localeCompare(right.name, 'ko');
        }
        if (sortKey === 'START_ASC') {
          return (left.starts_at || '9999-12-31T23:59:59.999Z').localeCompare(
            right.starts_at || '9999-12-31T23:59:59.999Z',
          );
        }
        if (sortKey === 'END_ASC') {
          return (left.ends_at || '9999-12-31T23:59:59.999Z').localeCompare(
            right.ends_at || '9999-12-31T23:59:59.999Z',
          );
        }
        return right.updated_at.localeCompare(left.updated_at);
      });
  }, [campaigns, keyword, managementTab, periodFilter, sortKey, statusFilter, typeFilter]);

  const overviewByCampaignId = useV2CampaignOverview(filteredCampaigns.map((campaign) => campaign.id));

  const summary = useMemo(() => {
    const source = filteredCampaigns;
    return {
      total: source.length,
      active: source.filter((campaign) => campaign.status === 'ACTIVE').length,
      upcoming: source.filter((campaign) => getCampaignPeriod(campaign.starts_at, campaign.ends_at) === 'UPCOMING').length,
      incomplete: source.filter((campaign) => {
        const overview = overviewByCampaignId[campaign.id];
        if (!overview || overview.isLoading) {
          return false;
        }
        return !overview.hasLinkedPricing;
      }).length,
    };
  }, [filteredCampaigns, overviewByCampaignId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="캠페인 목록을 불러오는 중입니다." />
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
          <p className="mt-1 text-sm text-gray-500">
            판매 기간과 적용 대상을 정한 뒤, 캠페인 상세에서 옵션별 할인 가격을 설정합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button onClick={() => router.push('/admin/v2-catalog/campaigns/new')}>새 캠페인 만들기</Button>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setManagementTab('BASE')}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
              managementTab === 'BASE'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            기본 캠페인
          </button>
          <button
            type="button"
            onClick={() => setManagementTab('TARGETED')}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
              managementTab === 'TARGETED'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            지정 캠페인
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">캠페인 수</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="mt-1 text-xs text-gray-500">현재 필터 기준 캠페인 수</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">운영 중</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.active}</p>
          <p className="mt-1 text-xs text-gray-500">ACTIVE 상태인 캠페인</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">예정</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.upcoming}</p>
          <p className="mt-1 text-xs text-gray-500">시작 시점이 아직 오지 않은 캠페인</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">미완성</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.incomplete}</p>
          <p className="mt-1 text-xs text-gray-500">가격/프로모션이 아직 연결되지 않은 캠페인</p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_220px_220px_220px]">
          <Input
            placeholder="캠페인명, 코드, 설명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CampaignFilterStatus)} className={SELECT_CLASS}>
            <option value="ALL">모든 상태</option>
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CAMPAIGN_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {managementTab === 'TARGETED' ? (
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={SELECT_CLASS}>
              <option value="ALL">모든 유형</option>
              {CAMPAIGN_TYPES.filter((type) => type !== 'ALWAYS_ON').map((type) => (
                <option key={type} value={type}>
                  {CAMPAIGN_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          ) : (
            <div className={`${SELECT_CLASS} flex items-center text-gray-500`}>유형: 상시 운영 고정</div>
          )}
          <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as CampaignPeriodFilter)} className={SELECT_CLASS}>
            <option value="ALL">모든 기간</option>
            <option value="LIVE">진행 중</option>
            <option value="UPCOMING">예정</option>
            <option value="ENDED">종료</option>
            <option value="NO_PERIOD">상시</option>
          </select>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as CampaignSortKey)} className={SELECT_CLASS}>
            <option value="UPDATED_DESC">최근 수정순</option>
            <option value="START_ASC">시작일 빠른순</option>
            <option value="END_ASC">종료일 빠른순</option>
            <option value="NAME_ASC">이름순</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {managementTab === 'BASE' ? '기본 캠페인 개요' : '지정 캠페인 개요'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              상태, 기간, 대상 수, 가격 연결 여부처럼 운영자가 바로 판단해야 하는 정보만 먼저 보여줍니다.
            </p>
          </div>
          <Badge intent="info" size="md">필터 결과 {filteredCampaigns.length}개</Badge>
        </div>

        <div className="mt-4">
          <CampaignOverviewList
            campaigns={filteredCampaigns}
            overviewByCampaignId={overviewByCampaignId}
            onOpen={(campaignId) => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}
            onEdit={(campaignId) => router.push(`/admin/v2-catalog/campaigns/${campaignId}/edit`)}
          />
        </div>
      </section>
    </div>
  );
}
