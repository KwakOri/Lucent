'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  adminButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
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
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          대상 수정 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="campaign target"
        title="캠페인 대상 수정"
        description="포함/제외 여부를 바꾸거나 다른 프로젝트/상품으로 교체할 수 있습니다."
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
            상세로 돌아가기
          </Button>
        }
      />

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
