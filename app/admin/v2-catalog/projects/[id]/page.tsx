'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Megaphone,
  Package,
  Pencil,
  Plus,
  Settings,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import type {
  V2ProductStatus,
  V2ProjectStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  formatDateRange,
  formatDateTime,
  getCampaignPeriod,
  getCampaignPeriodIntent,
  getCampaignStatusIntent,
  getPeriodLabel,
} from '@/lib/client/utils/v2-campaign-admin';
import {
  buildCampaignProjectIdSet,
  buildProductsByIdMap,
} from '@/lib/client/utils/v2-campaign-targeting';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';
import {
  useV2AdminProject,
  useV2AdminProjectProductList,
  useV2CampaignOverview,
  useV2CampaignTargetsMap,
  useV2Campaigns,
} from '@/lib/client/hooks/useV2CatalogAdmin';

function getProjectStatusIntent(status: V2ProjectStatus) {
  if (status === 'ACTIVE') {
    return 'success' as const;
  }
  if (status === 'DRAFT') {
    return 'warning' as const;
  }
  return 'error' as const;
}

function getProductStatusIntent(status: V2ProductStatus) {
  if (status === 'ACTIVE') {
    return 'success' as const;
  }
  if (status === 'DRAFT') {
    return 'warning' as const;
  }
  if (status === 'ARCHIVED') {
    return 'error' as const;
  }
  return 'default' as const;
}

export default function V2CatalogProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const projectId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: project, isLoading: projectLoading, error: projectError } =
    useV2AdminProject(projectId);
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useV2AdminProjectProductList({ projectId });
  const {
    data: campaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useV2Campaigns();

  const campaignIds = useMemo(
    () => (campaigns || []).map((campaign) => campaign.id),
    [campaigns],
  );
  const targetsByCampaignId = useV2CampaignTargetsMap(campaignIds);
  const overviewByCampaignId = useV2CampaignOverview(campaignIds);
  const campaignTargetsLoading = campaignIds.some(
    (campaignId) => targetsByCampaignId[campaignId]?.isLoading,
  );
  const campaignOverviewLoading = campaignIds.some(
    (campaignId) => overviewByCampaignId[campaignId]?.isLoading,
  );
  const productsById = useMemo(() => buildProductsByIdMap(products || []), [products]);

  const relatedCampaigns = useMemo(() => {
    if (!project) {
      return [];
    }

    return (campaigns || [])
      .filter((campaign) => {
        const relatedProjectIds = buildCampaignProjectIdSet({
          campaign,
          targets: targetsByCampaignId[campaign.id]?.targets || [],
          productsById,
        });
        return relatedProjectIds.has(project.id);
      })
      .sort((left, right) => {
        if (left.campaign_type === 'ALWAYS_ON' && right.campaign_type !== 'ALWAYS_ON') {
          return -1;
        }
        if (left.campaign_type !== 'ALWAYS_ON' && right.campaign_type === 'ALWAYS_ON') {
          return 1;
        }
        return right.updated_at.localeCompare(left.updated_at);
      });
  }, [campaigns, productsById, project, targetsByCampaignId]);

  const baseCampaign =
    relatedCampaigns.find((campaign) => campaign.campaign_type === 'ALWAYS_ON') || null;

  const productSummary = useMemo(() => {
    const source = products || [];
    return {
      total: source.length,
      active: source.filter((product) => product.status === 'ACTIVE').length,
      draft: source.filter((product) => product.status === 'DRAFT').length,
      inactive: source.filter((product) => product.status === 'INACTIVE').length,
      archived: source.filter((product) => product.status === 'ARCHIVED').length,
    };
  }, [products]);

  const recentProducts = useMemo(() => {
    return [...(products || [])]
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, 5);
  }, [products]);

  const operatingCampaignCount = relatedCampaigns.filter((campaign) => {
    if (campaign.status !== 'ACTIVE') {
      return false;
    }
    const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);
    return period === 'LIVE' || period === 'NO_PERIOD';
  }).length;

  const isLoading =
    projectLoading ||
    productsLoading ||
    campaignsLoading ||
    campaignTargetsLoading ||
    campaignOverviewLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="프로젝트 상세 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectError || productsError || campaignsError || !project || !products || !campaigns) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          프로젝트 상세 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/projects')}>
          <ArrowLeft className="h-4 w-4" />
          프로젝트 목록
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button intent="ghost" size="sm" onClick={() => router.push('/admin/v2-catalog/projects')}>
            <ArrowLeft className="h-4 w-4" />
            프로젝트 목록
          </Button>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge intent={getProjectStatusIntent(project.status)} size="md">
              {project.status}
            </Badge>
            <Badge intent="default" size="md">
              /{project.slug}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            {project.description || '등록된 프로젝트 설명이 없습니다.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            intent="neutral"
            onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            프로젝트 편집
          </Button>
          <Button
            intent="neutral"
            aria-label="프로젝트 설정"
            onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}/settings`)}
          >
            <Settings className="h-4 w-4" />
            설정
          </Button>
        </div>
      </div>

      {project.cover_media_asset?.public_url ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.cover_media_asset.public_url}
            alt={`${project.name} 커버`}
            className="h-56 w-full object-cover"
          />
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">운영중 캠페인</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{operatingCampaignCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">전체 캠페인</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{relatedCampaigns.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">상품</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{productSummary.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">최근 수정</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {formatDateTime(project.updated_at)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">캠페인</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              기본 캠페인과 프로젝트에 연결된 판매 정책입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="neutral"
              onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}/campaigns`)}
            >
              <ExternalLink className="h-4 w-4" />
              캠페인 관리
            </Button>
            {!baseCampaign && (
              <Button
                intent="neutral"
                onClick={() =>
                  router.push(
                    `/admin/v2-catalog/campaigns/new?type=ALWAYS_ON&projectId=${project.id}`,
                  )
                }
              >
                기본 캠페인 생성
              </Button>
            )}
            <Button onClick={() => router.push(`/admin/v2-catalog/campaigns/new?projectId=${project.id}`)}>
              <Plus className="h-4 w-4" />
              캠페인 생성
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
          {relatedCampaigns.length === 0 ? (
            <EmptyState
              title="연결된 캠페인이 없습니다."
              description="프로젝트 상세에서 캠페인을 생성하면 이 영역에 표시됩니다."
              action={
                <Button onClick={() => router.push(`/admin/v2-catalog/campaigns/new?projectId=${project.id}`)}>
                  캠페인 생성
                </Button>
              }
            />
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    캠페인
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    기간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    상품
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {relatedCampaigns.map((campaign) => {
                  const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);
                  const overview = overviewByCampaignId[campaign.id];
                  return (
                    <tr key={campaign.id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{campaign.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge intent={getCampaignStatusIntent(campaign.status)}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <Badge intent={getCampaignPeriodIntent(period)}>
                          {getPeriodLabel(period)}
                        </Badge>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDateRange(campaign.starts_at, campaign.ends_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {overview?.targetCount || 0}개
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            intent="neutral"
                            onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}`)}
                          >
                            상세
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/v2-catalog/campaigns/${campaign.id}/pricing`)
                            }
                          >
                            가격
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">상품</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              프로젝트에 소속된 상품과 판매 상태입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="neutral"
              onClick={() => router.push(`/admin/v2-catalog/products/projects/${project.id}`)}
            >
              <ExternalLink className="h-4 w-4" />
              상품 관리
            </Button>
            <Button onClick={() => router.push(`/admin/v2-catalog/products/new?projectId=${project.id}`)}>
              <Plus className="h-4 w-4" />
              상품 추가
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-y border-gray-100 py-4 md:grid-cols-5">
          {[
            ['전체', productSummary.total],
            ['판매 중', productSummary.active],
            ['임시 저장', productSummary.draft],
            ['숨김', productSummary.inactive],
            ['보관됨', productSummary.archived],
          ].map(([label, count]) => (
            <div key={label}>
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
          {recentProducts.length === 0 ? (
            <EmptyState
              title="등록된 상품이 없습니다."
              description="프로젝트 상세에서 상품을 추가하면 이 영역에 표시됩니다."
              action={
                <Button onClick={() => router.push(`/admin/v2-catalog/products/new?projectId=${project.id}`)}>
                  상품 추가
                </Button>
              }
            />
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    상품
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    유형
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    최근 수정
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recentProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                      <p className="mt-1 text-xs text-gray-500">/{product.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {PRODUCT_KIND_LABELS[product.product_kind]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge intent={getProductStatusIntent(product.status)}>
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDateTime(product.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          intent="neutral"
                          onClick={() => router.push(`/admin/v2-catalog/products/${product.id}`)}
                        >
                          상세
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
