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
import {
  AdminPageHeader,
  AdminStatCard,
  AdminSurface,
  adminButtonClass,
  adminPrimaryButtonClass,
  adminTableBodyClass,
  adminTableContainerClass,
  adminTableHeadCellClass,
  adminTableHeadClass,
} from '@/src/components/admin/AdminDesignSystem';
import type {
  V2ProductStatus,
  V2ProjectStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  formatDateTime,
  getCampaignPeriod,
  getCampaignPeriodIntent,
  getCampaignStatusIntent,
  getPeriodLabel,
} from '@/lib/client/utils/v2-campaign-admin';
import {
  buildCampaignProjectIdSet,
  buildProductsByIdMap,
  resolveIncludedCampaignProducts,
} from '@/lib/client/utils/v2-campaign-targeting';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';
import {
  useV2AdminProject,
  useV2AdminProjectProductList,
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
  const campaignTargetsLoading = campaignIds.some(
    (campaignId) => targetsByCampaignId[campaignId]?.isLoading,
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
    campaignTargetsLoading;

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
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="project detail"
        title={project.name}
        description={project.description || '등록된 프로젝트 설명이 없습니다.'}
        actions={
          <>
          <Button
            intent="neutral"
            className={adminButtonClass}
            onClick={() => router.push('/admin/v2-catalog/projects')}
          >
            <ArrowLeft className="h-4 w-4" />
            프로젝트 목록
          </Button>
          <Button
            intent="neutral"
            className={adminButtonClass}
            onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            프로젝트 편집
          </Button>
          <Button
            intent="neutral"
            className={adminButtonClass}
            aria-label="프로젝트 설정"
            onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}/settings`)}
          >
            <Settings className="h-4 w-4" />
            설정
          </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 px-1">
        <Badge intent={getProjectStatusIntent(project.status)} size="md">
          {project.status}
        </Badge>
        <Badge intent="default" size="md" className="bg-[#f5f3e8] text-[#1a1a2e]/65">
          /{project.slug}
        </Badge>
      </div>

      {project.cover_media_asset?.public_url ? (
        <div className="overflow-hidden rounded-[22px] border border-[#e7e3d3] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.cover_media_asset.public_url}
            alt={`${project.name} 커버`}
            className="h-56 w-full object-cover"
          />
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="운영중 캠페인" value={operatingCampaignCount} />
        <AdminStatCard label="전체 캠페인" value={relatedCampaigns.length} />
        <AdminStatCard label="상품" value={productSummary.total} />
        <AdminStatCard
          label="최근 수정"
          value={<span className="text-base">{formatDateTime(project.updated_at)}</span>}
        />
      </section>

      <AdminSurface padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-[#a35200]" />
              <h2 className="text-lg font-black text-[#1a1a2e]">캠페인</h2>
            </div>
            <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
              기본 캠페인과 프로젝트에 연결된 판매 정책입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="neutral"
              className={adminButtonClass}
              onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}/campaigns`)}
            >
              <ExternalLink className="h-4 w-4" />
              캠페인 관리
            </Button>
            {!baseCampaign && (
              <Button
                intent="neutral"
                className={adminButtonClass}
                onClick={() =>
                  router.push(
                    `/admin/v2-catalog/campaigns/new?type=ALWAYS_ON&projectId=${project.id}`,
                  )
                }
              >
                기본 캠페인 생성
              </Button>
            )}
            <Button
              className={adminPrimaryButtonClass}
              onClick={() => router.push(`/admin/v2-catalog/campaigns/new?projectId=${project.id}`)}
            >
              <Plus className="h-4 w-4" />
              캠페인 생성
            </Button>
          </div>
        </div>

        <div className={`mt-5 ${adminTableContainerClass}`}>
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
            <table className="min-w-full">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className={adminTableHeadCellClass}>
                    캠페인
                  </th>
                  <th className={adminTableHeadCellClass}>
                    상태
                  </th>
                  <th className={`${adminTableHeadCellClass} text-right`}>
                    포함 상품
                  </th>
                  <th className={adminTableHeadCellClass}>
                    기간
                  </th>
                  <th className={`${adminTableHeadCellClass} text-right`}>
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className={adminTableBodyClass}>
                {relatedCampaigns.map((campaign) => {
                  const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);
                  const includedProductCount = resolveIncludedCampaignProducts({
                    campaignType: campaign.campaign_type,
                    campaignProjectId: campaign.project_id,
                    targets: targetsByCampaignId[campaign.id]?.targets || [],
                    products,
                  }).length;
                  return (
                    <tr key={campaign.id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-[#1a1a2e]">{campaign.name}</p>
                        <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">
                          {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge intent={getCampaignStatusIntent(campaign.status)}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-black text-[#1a1a2e]">
                          {includedProductCount.toLocaleString('ko-KR')}개
                        </p>
                        <p className="mt-1 text-xs font-medium text-[#1a1a2e]/40">
                          포함됨
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[#1a1a2e]/60">
                        <div className="flex items-center gap-3">
                          <Badge intent={getCampaignPeriodIntent(period)} className="shrink-0">
                            {getPeriodLabel(period)}
                          </Badge>
                          <div className="space-y-1 text-xs text-[#1a1a2e]/45">
                            <p className="flex items-center gap-2">
                              <span className="w-7 shrink-0 font-black text-[#1a1a2e]/35">시작</span>
                              <span>{campaign.starts_at ? formatDateTime(campaign.starts_at) : '즉시 운영'}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="w-7 shrink-0 font-black text-[#1a1a2e]/35">종료</span>
                              <span>{campaign.ends_at ? formatDateTime(campaign.ends_at) : '없음'}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            intent="neutral"
                            className="!rounded-[10px] !border-0 !bg-[#f5f3e8] !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]"
                            onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}`)}
                          >
                            상세
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
      </AdminSurface>

      <AdminSurface padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#a35200]" />
              <h2 className="text-lg font-black text-[#1a1a2e]">상품</h2>
            </div>
            <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
              프로젝트에 소속된 상품과 판매 상태입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="neutral"
              className={adminButtonClass}
              onClick={() => router.push(`/admin/v2-catalog/products/projects/${project.id}`)}
            >
              <ExternalLink className="h-4 w-4" />
              상품 관리
            </Button>
            <Button
              className={adminPrimaryButtonClass}
              onClick={() => router.push(`/admin/v2-catalog/products/new?projectId=${project.id}`)}
            >
              <Plus className="h-4 w-4" />
              상품 추가
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-y border-[#eee7d6] py-4 md:grid-cols-5">
          {[
            ['전체', productSummary.total],
            ['판매 중', productSummary.active],
            ['임시 저장', productSummary.draft],
            ['숨김', productSummary.inactive],
            ['보관됨', productSummary.archived],
          ].map(([label, count]) => (
            <div key={label}>
              <p className="text-xs font-black uppercase tracking-wide text-[#1a1a2e]/40">{label}</p>
              <p className="mt-1 text-xl font-black text-[#1a1a2e]">{count}</p>
            </div>
          ))}
        </div>

        <div className={`mt-5 ${adminTableContainerClass}`}>
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
            <table className="min-w-full">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className={adminTableHeadCellClass}>
                    상품
                  </th>
                  <th className={adminTableHeadCellClass}>
                    유형
                  </th>
                  <th className={adminTableHeadCellClass}>
                    상태
                  </th>
                  <th className={adminTableHeadCellClass}>
                    최근 수정
                  </th>
                  <th className={`${adminTableHeadCellClass} text-right`}>
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className={adminTableBodyClass}>
                {recentProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-black text-[#1a1a2e]">{product.title}</p>
                      <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">/{product.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#1a1a2e]/65">
                      {PRODUCT_KIND_LABELS[product.product_kind]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge intent={getProductStatusIntent(product.status)}>
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[#1a1a2e]/60">
                      {formatDateTime(product.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          intent="neutral"
                          className="!rounded-[10px] !border-0 !bg-[#f5f3e8] !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]"
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
      </AdminSurface>
    </div>
  );
}
