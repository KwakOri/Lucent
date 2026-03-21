'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { CampaignOverviewList } from '@/src/components/admin/v2-catalog/CampaignOverviewList';
import { useToast } from '@/src/components/toast';
import {
  useV2CampaignOverview,
  useV2CampaignTargetsMap,
  useV2Campaigns,
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';
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
import {
  buildCampaignProjectIdSet,
  buildProductsByIdMap,
} from '@/lib/client/utils/v2-campaign-targeting';

const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

type CampaignManagementTab = 'BASE' | 'TARGETED';
type ViewMode = 'PROJECT' | 'CAMPAIGN';

type ProjectCampaignRow = {
  projectId: string;
  name: string;
  slug: string;
  status: string;
  baseCampaignId: string | null;
  baseCampaignStatus: string | null;
  activeCampaignCount: number;
  activeTargetedCount: number;
  linkedPricingCampaignCount: number;
  latestUpdatedAt: string | null;
};

export default function V2CatalogCampaignsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useV2Campaigns();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useV2AdminProjects();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();

  const [viewMode, setViewMode] = useState<ViewMode>('PROJECT');
  const [managementTab, setManagementTab] = useState<CampaignManagementTab>('BASE');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignFilterStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState<CampaignPeriodFilter>('ALL');
  const [sortKey, setSortKey] = useState<CampaignSortKey>('UPDATED_DESC');

  const isLoading = campaignsLoading || projectsLoading || productsLoading;
  const hasError = campaignsError || projectsError || productsError || !campaigns || !projects || !products;

  const campaignIds = useMemo(() => (campaigns || []).map((campaign) => campaign.id), [campaigns]);
  const overviewByCampaignId = useV2CampaignOverview(campaignIds);
  const targetsByCampaignId = useV2CampaignTargetsMap(campaignIds);
  const productsById = useMemo(() => buildProductsByIdMap(products || []), [products]);

  const campaignProjectIdsByCampaignId = useMemo(() => {
    return (campaigns || []).reduce<Record<string, Set<string>>>((accumulator, campaign) => {
      const targetSet = buildCampaignProjectIdSet({
        campaign,
        targets: targetsByCampaignId[campaign.id]?.targets || [],
        productsById,
      });
      accumulator[campaign.id] = targetSet;
      return accumulator;
    }, {});
  }, [campaigns, productsById, targetsByCampaignId]);

  const projectRows = useMemo<ProjectCampaignRow[]>(() => {
    const rows = (projects || []).map((project) => {
      const linkedCampaigns = (campaigns || []).filter((campaign) =>
        campaignProjectIdsByCampaignId[campaign.id]?.has(project.id),
      );
      const activeCampaignCount = linkedCampaigns.filter((campaign) => campaign.status === 'ACTIVE').length;
      const activeTargetedCount = linkedCampaigns.filter(
        (campaign) =>
          campaign.status === 'ACTIVE' &&
          campaign.campaign_type !== 'ALWAYS_ON' &&
          getCampaignPeriod(campaign.starts_at, campaign.ends_at) === 'LIVE',
      ).length;
      const linkedPricingCampaignCount = linkedCampaigns.filter(
        (campaign) => overviewByCampaignId[campaign.id]?.hasLinkedPricing,
      ).length;
      const baseCampaign = [...linkedCampaigns]
        .filter((campaign) => campaign.campaign_type === 'ALWAYS_ON')
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0];
      const latestUpdatedAt =
        [...linkedCampaigns]
          .map((campaign) => campaign.updated_at)
          .sort((left, right) => right.localeCompare(left))[0] || null;

      return {
        projectId: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        baseCampaignId: baseCampaign?.id || null,
        baseCampaignStatus: baseCampaign?.status || null,
        activeCampaignCount,
        activeTargetedCount,
        linkedPricingCampaignCount,
        latestUpdatedAt,
      };
    });

    const loweredKeyword = keyword.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (!loweredKeyword) {
        return true;
      }
      return `${row.name} ${row.slug}`.toLowerCase().includes(loweredKeyword);
    });

    return filtered.sort((left, right) => {
      if (left.activeTargetedCount !== right.activeTargetedCount) {
        return right.activeTargetedCount - left.activeTargetedCount;
      }
      if (left.activeCampaignCount !== right.activeCampaignCount) {
        return right.activeCampaignCount - left.activeCampaignCount;
      }
      return left.name.localeCompare(right.name, 'ko');
    });
  }, [
    campaignProjectIdsByCampaignId,
    campaigns,
    keyword,
    overviewByCampaignId,
    projects,
  ]);

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
        <Loading size="lg" text="캠페인 화면을 준비하는 중입니다." />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        캠페인 정보를 불러오지 못했습니다.
      </div>
    );
  }

  const projectSummary = {
    total: projectRows.length,
    withBaseCampaign: projectRows.filter((row) => row.baseCampaignId).length,
    activeTargeted: projectRows.reduce((sum, row) => sum + row.activeTargetedCount, 0),
    linkedPricingCampaigns: projectRows.reduce((sum, row) => sum + row.linkedPricingCampaignCount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 캠페인 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            프로젝트 중심으로 운영 상태를 확인하고, 필요할 때 캠페인 필터 뷰로 내려가 상세 조정합니다.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
          <Button onClick={() => router.push('/admin/v2-catalog/campaigns/new')}>새 캠페인 만들기</Button>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setViewMode('PROJECT')}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
              viewMode === 'PROJECT'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            프로젝트 뷰
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CAMPAIGN')}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
              viewMode === 'CAMPAIGN'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            캠페인 뷰
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_220px_220px]">
          <Input
            placeholder={viewMode === 'PROJECT' ? '프로젝트명/슬러그 검색' : '캠페인명, 코드, 설명 검색'}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          {viewMode === 'CAMPAIGN' ? (
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CampaignFilterStatus)} className={SELECT_CLASS}>
              <option value="ALL">모든 상태</option>
              {CAMPAIGN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CAMPAIGN_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          ) : (
            <div className={`${SELECT_CLASS} flex items-center text-gray-500`}>프로젝트 총 {projectRows.length}개</div>
          )}
          {viewMode === 'CAMPAIGN' ? (
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as CampaignPeriodFilter)} className={SELECT_CLASS}>
              <option value="ALL">모든 기간</option>
              <option value="LIVE">진행 중</option>
              <option value="UPCOMING">예정</option>
              <option value="ENDED">종료</option>
              <option value="NO_PERIOD">상시</option>
            </select>
          ) : (
            <div className={`${SELECT_CLASS} flex items-center text-gray-500`}>
              기본 캠페인 보유 {projectSummary.withBaseCampaign}개
            </div>
          )}
          {viewMode === 'CAMPAIGN' ? (
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as CampaignSortKey)} className={SELECT_CLASS}>
              <option value="UPDATED_DESC">최근 수정순</option>
              <option value="START_ASC">시작일 빠른순</option>
              <option value="END_ASC">종료일 빠른순</option>
              <option value="NAME_ASC">이름순</option>
            </select>
          ) : (
            <div className={`${SELECT_CLASS} flex items-center text-gray-500`}>
              진행중 지정 캠페인 {projectSummary.activeTargeted}개
            </div>
          )}
        </div>
      </section>

      {viewMode === 'PROJECT' ? (
        <section className="space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-500">프로젝트</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{projectSummary.total}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-500">기본 캠페인 보유</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{projectSummary.withBaseCampaign}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-500">진행중 지정 캠페인</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{projectSummary.activeTargeted}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-500">가격 연결 캠페인</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{projectSummary.linkedPricingCampaigns}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">프로젝트</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">기본 캠페인</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">진행중 캠페인</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">가격 연결</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">최근 수정</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {projectRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                        조건에 맞는 프로젝트가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    projectRows.map((row) => (
                      <tr key={row.projectId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{row.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{row.slug}</p>
                        </td>
                        <td className="px-4 py-3">
                          {row.baseCampaignId ? (
                            <Badge intent={row.baseCampaignStatus === 'ACTIVE' ? 'success' : 'default'}>
                              {row.baseCampaignStatus === 'ACTIVE' ? '운영 중' : row.baseCampaignStatus || '등록됨'}
                            </Badge>
                          ) : (
                            <Badge intent="warning">미설정</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{row.activeTargetedCount}개</p>
                          <p className="mt-1 text-xs text-gray-500">ACTIVE 전체 {row.activeCampaignCount}개</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.linkedPricingCampaignCount}개</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {row.latestUpdatedAt
                            ? new Date(row.latestUpdatedAt).toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              intent="neutral"
                              onClick={() => {
                                if (row.baseCampaignId) {
                                  router.push(`/admin/v2-catalog/campaigns/${row.baseCampaignId}`);
                                  return;
                                }
                                router.push(`/admin/v2-catalog/campaigns/new?type=ALWAYS_ON&projectId=${row.projectId}`);
                              }}
                            >
                              {row.baseCampaignId ? '기본 캠페인' : '기본 캠페인 생성'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => router.push(`/admin/v2-catalog/projects/${row.projectId}/campaigns`)}
                            >
                              프로젝트 보기
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : (
        <section className="space-y-6">
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
                  유형/상태/기간 필터로 캠페인을 빠르게 찾아 세부 운영 화면으로 이동할 수 있습니다.
                </p>
              </div>
              <Badge intent="info" size="md">필터 결과 {filteredCampaigns.length}개</Badge>
            </div>

            <div className="mt-4">
              <CampaignOverviewList
                campaigns={filteredCampaigns}
                overviewByCampaignId={overviewByCampaignId}
                onOpen={(id) => router.push(`/admin/v2-catalog/campaigns/${id}`)}
                onEdit={(id) => router.push(`/admin/v2-catalog/campaigns/${id}/edit`)}
                onCopyLink={(campaign) =>
                  void handleCopyCampaignLink(campaign.id, campaign.name)
                }
              />
            </div>
          </section>
        </section>
      )}
    </div>
  );
}
