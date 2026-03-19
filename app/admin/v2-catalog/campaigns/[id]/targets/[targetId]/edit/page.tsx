'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { CampaignTargetForm } from '@/src/components/admin/v2-catalog/CampaignTargetForm';
import {
  useV2BundleDefinitions,
  useV2Campaign,
  useV2CampaignTargets,
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

export default function V2CatalogCampaignTargetEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string; targetId: string }>();

  const campaignId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const targetId = useMemo(() => {
    const raw = params?.targetId;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useV2Campaign(campaignId);
  const { data: targets, isLoading: targetsLoading, error: targetsError } = useV2CampaignTargets(campaignId);
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useV2AdminProjects();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: bundleDefinitions, isLoading: bundlesLoading, error: bundlesError } = useV2BundleDefinitions();

  const target = useMemo(() => {
    return (targets || []).find((item) => item.id === targetId) || null;
  }, [targetId, targets]);

  if (campaignLoading || targetsLoading || projectsLoading || productsLoading || bundlesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="대상 수정 화면을 준비하는 중입니다." />
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
    !target
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          대상 수정 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">캠페인 대상 수정</h1>
          <p className="mt-1 text-sm text-gray-500">
            포함/제외 여부를 바꾸거나 다른 프로젝트/상품으로 교체할 수 있습니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
            상세로 돌아가기
          </Button>
        </div>
      </div>

      <CampaignTargetForm
        mode="edit"
        campaign={campaign}
        target={target}
        projects={projects}
        products={products}
        bundleDefinitions={bundleDefinitions}
        onCancel={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}
        onSuccess={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}
      />
    </div>
  );
}
