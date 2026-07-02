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
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

export default function V2CatalogCampaignTargetCreatePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const campaignId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useV2Campaign(campaignId);
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useV2AdminProjects();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: bundleDefinitions, isLoading: bundlesLoading, error: bundlesError } = useV2BundleDefinitions();

  if (campaignLoading || projectsLoading || productsLoading || bundlesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="대상 추가 화면을 준비하는 중입니다." />
      </div>
    );
  }

  if (campaignError || projectsError || productsError || bundlesError || !campaign || !projects || !products || !bundleDefinitions) {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          대상 추가에 필요한 데이터를 불러오지 못했습니다.
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
        title="캠페인 대상 추가"
        description={`${campaign.name}에 포함하거나 제외할 프로젝트/상품/옵션을 선택합니다.`}
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
            상세로 돌아가기
          </Button>
        }
      />

      <CampaignTargetForm
        mode="create"
        campaign={campaign}
        projects={projects}
        products={products}
        bundleDefinitions={bundleDefinitions}
        onCancel={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}
        onSuccess={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}
      />
    </div>
  );
}
