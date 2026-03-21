'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { CampaignForm } from '@/src/components/admin/v2-catalog/CampaignForm';
import type { V2CampaignType } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2BundleDefinitions,
  useV2Campaigns,
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const CAMPAIGN_TYPES: V2CampaignType[] = ['POPUP', 'EVENT', 'SALE', 'DROP', 'ALWAYS_ON'];

export default function V2CatalogCampaignCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useV2Campaigns();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useV2AdminProjects();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: bundleDefinitions, isLoading: bundlesLoading, error: bundlesError } = useV2BundleDefinitions();

  const prefilledCampaignType = useMemo<V2CampaignType | undefined>(() => {
    const type = searchParams.get('type');
    if (!type || !CAMPAIGN_TYPES.includes(type as V2CampaignType)) {
      return undefined;
    }
    return type as V2CampaignType;
  }, [searchParams]);

  const prefilledProjectId = useMemo(() => searchParams.get('projectId') || '', [searchParams]);
  const prefilledProject = useMemo(() => {
    if (!projects || !prefilledProjectId) {
      return null;
    }
    return projects.find((project) => project.id === prefilledProjectId) || null;
  }, [prefilledProjectId, projects]);

  const prefilledTargets = useMemo(
    () =>
      prefilledProject
        ? [
            {
              targetType: 'PROJECT' as const,
              targetId: prefilledProject.id,
              label: prefilledProject.name,
            },
          ]
        : [],
    [prefilledProject],
  );

  const shouldLockAlwaysOnPreset = prefilledCampaignType === 'ALWAYS_ON' && prefilledTargets.length === 1;

  if (campaignsLoading || projectsLoading || productsLoading || bundlesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="캠페인 생성 화면을 준비하는 중입니다." />
      </div>
    );
  }

  if (
    campaignsError ||
    projectsError ||
    productsError ||
    bundlesError ||
    !campaigns ||
    !projects ||
    !products ||
    !bundleDefinitions
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          캠페인 생성에 필요한 데이터를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/campaigns')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 캠페인 만들기</h1>
          <p className="mt-1 text-sm text-gray-500">
            대상과 기간을 먼저 정해서 판매 운영의 뼈대를 만들고, 저장 후 상세에서 할인 가격을 설정합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/campaigns')}>
            목록으로
          </Button>
        </div>
      </div>

      <CampaignForm
        mode="create"
        campaigns={campaigns}
        projects={projects}
        products={products}
        bundleDefinitions={bundleDefinitions}
        initialCampaignType={prefilledCampaignType}
        initialTargets={prefilledTargets}
        initialTargetType={prefilledTargets.length > 0 ? 'PROJECT' : undefined}
        targetPickerMode={shouldLockAlwaysOnPreset ? 'single' : 'multiple'}
        lockCampaignType={shouldLockAlwaysOnPreset}
        lockTargetType={shouldLockAlwaysOnPreset}
        allowAdvancedTargets={!shouldLockAlwaysOnPreset}
        onCancel={() => router.push('/admin/v2-catalog/campaigns')}
        onSuccess={(campaignId) => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}
      />
    </div>
  );
}
