'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type { V2ProjectStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  CAMPAIGN_STATUS_LABELS,
  getCampaignPeriod,
  getCampaignStatusIntent,
} from '@/lib/client/utils/v2-campaign-admin';
import {
  buildCampaignProjectIdSet,
  buildProductsByIdMap,
} from '@/lib/client/utils/v2-campaign-targeting';
import {
  useArchiveV2Project,
  usePublishV2Project,
  useRestoreV2Project,
  useUnpublishV2Project,
  useV2AdminProducts,
  useV2AdminProjects,
  useV2CampaignTargetsMap,
  useV2Campaigns,
} from '@/lib/client/hooks/useV2CatalogAdmin';

type ProjectFilterStatus = 'ALL' | Exclude<V2ProjectStatus, 'ARCHIVED'>;
type ProjectListTab = 'ACTIVE_CAMPAIGNS' | 'ALL';

const STATUS_VALUES: Array<Exclude<V2ProjectStatus, 'ARCHIVED'>> = ['DRAFT', 'ACTIVE'];
const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function resolveStatusIntent(status: V2ProjectStatus) {
  if (status === 'ACTIVE') {
    return 'success' as const;
  }
  if (status === 'DRAFT') {
    return 'warning' as const;
  }
  return 'default' as const;
}

export default function V2CatalogProjectsPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectFilterStatus>('ALL');
  const [keyword, setKeyword] = useState('');
  const [isArchiveView, setIsArchiveView] = useState(false);
  const [listTab, setListTab] = useState<ProjectListTab>('ACTIVE_CAMPAIGNS');

  const { data: projects, isLoading, error } = useV2AdminProjects(
    isArchiveView ? { status: 'ARCHIVED' } : {},
  );
  const {
    data: campaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useV2Campaigns();
  const {
    data: baseCampaigns,
    isLoading: baseCampaignsLoading,
    error: baseCampaignsError,
  } = useV2Campaigns({ campaignType: 'ALWAYS_ON' });
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useV2AdminProducts();
  const publishProject = usePublishV2Project();
  const unpublishProject = useUnpublishV2Project();
  const archiveProject = useArchiveV2Project();
  const restoreProject = useRestoreV2Project();

  const campaignIds = useMemo(
    () => (campaigns || []).map((campaign) => campaign.id),
    [campaigns],
  );
  const targetsByCampaignId = useV2CampaignTargetsMap(campaignIds);
  const campaignTargetsLoading = campaignIds.some(
    (campaignId) => targetsByCampaignId[campaignId]?.isLoading,
  );
  const productsById = useMemo(() => buildProductsByIdMap(products || []), [products]);

  const activeCampaignProjectIds = useMemo(() => {
    const projectIds = new Set<string>();

    (campaigns || []).forEach((campaign) => {
      if (campaign.status !== 'ACTIVE') {
        return;
      }

      const period = getCampaignPeriod(campaign.starts_at, campaign.ends_at);
      if (period !== 'LIVE' && period !== 'NO_PERIOD') {
        return;
      }

      const linkedProjectIds = buildCampaignProjectIdSet({
        campaign,
        targets: targetsByCampaignId[campaign.id]?.targets || [],
        productsById,
      });

      linkedProjectIds.forEach((projectId) => projectIds.add(projectId));
    });

    return projectIds;
  }, [campaigns, productsById, targetsByCampaignId]);

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const runAction = async (task: () => Promise<void>) => {
    clearNotice();
    try {
      await task();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
  };

  const filteredProjects = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return (projects || [])
      .filter((project) => {
        if (!isArchiveView && project.status === 'ARCHIVED') {
          return false;
        }
        if (!isArchiveView && listTab === 'ACTIVE_CAMPAIGNS' && !activeCampaignProjectIds.has(project.id)) {
          return false;
        }
        if (!isArchiveView && statusFilter !== 'ALL' && project.status !== statusFilter) {
          return false;
        }
        if (!search) {
          return true;
        }
        const haystack = project.name.toLowerCase();
        return haystack.includes(search);
      })
      .sort((left, right) => left.sort_order - right.sort_order);
  }, [activeCampaignProjectIds, isArchiveView, keyword, listTab, projects, statusFilter]);

  const listTabCounts = useMemo(() => {
    const visibleProjects = (projects || []).filter((project) => project.status !== 'ARCHIVED');
    return {
      activeCampaigns: visibleProjects.filter((project) => activeCampaignProjectIds.has(project.id)).length,
      all: visibleProjects.length,
    };
  }, [activeCampaignProjectIds, projects]);

  const baseCampaignByProjectId = useMemo(() => {
    const campaignMap = new Map<string, NonNullable<typeof baseCampaigns>[number]>();
    const sortedBaseCampaigns = [...(baseCampaigns || [])].sort((left, right) => {
      if (left.status === 'ACTIVE' && right.status !== 'ACTIVE') {
        return -1;
      }
      if (left.status !== 'ACTIVE' && right.status === 'ACTIVE') {
        return 1;
      }
      return right.updated_at.localeCompare(left.updated_at);
    });

    sortedBaseCampaigns.forEach((campaign) => {
      if (campaign.project_id && !campaignMap.has(campaign.project_id)) {
        campaignMap.set(campaign.project_id, campaign);
      }
    });

    return campaignMap;
  }, [baseCampaigns]);

  const handlePublish = async (projectId: string) => {
    await runAction(async () => {
      await publishProject.mutateAsync(projectId);
      setMessage('프로젝트를 활성화했습니다.');
    });
  };

  const handleUnpublish = async (projectId: string) => {
    await runAction(async () => {
      await unpublishProject.mutateAsync(projectId);
      setMessage('프로젝트를 DRAFT로 전환했습니다.');
    });
  };

  const handleArchive = async (projectId: string, projectName: string) => {
    if (!window.confirm(`"${projectName}" 프로젝트를 보관하시겠습니까? 보관하면 일반 목록에서 숨겨지고 비활성화됩니다.`)) {
      return;
    }
    await runAction(async () => {
      await archiveProject.mutateAsync(projectId);
      setMessage('프로젝트를 보관했습니다.');
    });
  };

  const handleRestore = async (projectId: string, projectName: string) => {
    if (!window.confirm(`"${projectName}" 프로젝트를 보관함에서 복귀시키겠습니까? 복귀 후에는 DRAFT 상태가 됩니다.`)) {
      return;
    }
    await runAction(async () => {
      await restoreProject.mutateAsync(projectId);
      setMessage('프로젝트를 보관함에서 복귀시켰습니다.');
    });
  };

  if (
    isLoading ||
    campaignsLoading ||
    campaignTargetsLoading ||
    baseCampaignsLoading ||
    productsLoading
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 프로젝트를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || campaignsError || baseCampaignsError || productsError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        프로젝트 목록을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isArchiveView ? 'v2 프로젝트 보관함' : 'v2 프로젝트 관리'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isArchiveView
              ? '보관된 프로젝트를 확인하고 필요한 항목을 DRAFT 상태로 복귀시킵니다.'
              : '프로젝트 목록과 공개 상태를 운영합니다.'}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0">
          <Badge intent="info" size="md">
            {isArchiveView ? '보관' : '총'} {projects?.length || 0}개
          </Badge>
          {!isArchiveView && (
            <Button onClick={() => router.push('/admin/v2-catalog/projects/new')}>
              새 프로젝트
            </Button>
          )}
          <Button
            intent="neutral"
            onClick={() => {
              clearNotice();
              setIsArchiveView((current) => !current);
              setListTab('ACTIVE_CAMPAIGNS');
            }}
          >
            {isArchiveView ? (
              <>
                <RotateCcw className="h-4 w-4" />
                프로젝트 목록
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                보관함
              </>
            )}
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        {!isArchiveView && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {[
              {
                label: '운영중 캠페인',
                value: 'ACTIVE_CAMPAIGNS' as const,
                count: listTabCounts.activeCampaigns,
              },
              {
                label: '전체',
                value: 'ALL' as const,
                count: listTabCounts.all,
              },
            ].map((tab) => {
              const isSelected = listTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setListTab(tab.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-medium">{tab.label}</span>
                  <span className="mt-1 block text-xl font-bold">{tab.count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="프로젝트명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="max-w-xs"
          />
          {!isArchiveView && (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ProjectFilterStatus)}
              className={SELECT_CLASS}
            >
              <option value="ALL">전체 상태</option>
              {STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  프로젝트
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  기본 캠페인
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    {isArchiveView ? '보관된 프로젝트가 없습니다.' : '조회 결과가 없습니다.'}
                  </td>
                </tr>
              )}
              {filteredProjects.map((project) => {
                const baseCampaign = baseCampaignByProjectId.get(project.id);

                return (
                  <tr key={project.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge intent={resolveStatusIntent(project.status)}>{project.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {baseCampaign ? (
                        <Badge intent={getCampaignStatusIntent(baseCampaign.status)}>
                          포함 · {CAMPAIGN_STATUS_LABELS[baseCampaign.status]}
                        </Badge>
                      ) : (
                        <Badge intent="warning">미포함</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          intent="neutral"
                          size="sm"
                          onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}/edit`)}
                        >
                          수정
                        </Button>
                        {project.status === 'ARCHIVED' ? (
                          <Button
                            size="sm"
                            onClick={() => handleRestore(project.id, project.name)}
                            loading={restoreProject.isPending}
                          >
                            <RotateCcw className="h-4 w-4" />
                            복귀
                          </Button>
                        ) : (
                          <>
                            {project.status !== 'ACTIVE' ? (
                              <Button
                                size="sm"
                                onClick={() => handlePublish(project.id)}
                                loading={publishProject.isPending}
                              >
                                활성화
                              </Button>
                            ) : (
                              <Button
                                intent="secondary"
                                size="sm"
                                onClick={() => handleUnpublish(project.id)}
                                loading={unpublishProject.isPending}
                              >
                                비활성화
                              </Button>
                            )}
                            <Button
                              intent="neutral"
                              size="sm"
                              onClick={() => handleArchive(project.id, project.name)}
                              loading={archiveProject.isPending}
                            >
                              <Archive className="h-4 w-4" />
                              보관
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
