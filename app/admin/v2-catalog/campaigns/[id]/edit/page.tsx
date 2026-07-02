'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useAdminFeedback } from '@/src/components/admin/AdminFeedback';
import {
  AdminPageHeader,
  adminButtonClass,
  adminDangerIconButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
import { CampaignForm } from '@/src/components/admin/v2-catalog/CampaignForm';
import {
  useDeleteV2Campaign,
  useV2BundleDefinitions,
  useV2Campaign,
  useV2Campaigns,
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

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

export default function V2CatalogCampaignEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { confirm, notify } = useAdminFeedback();
  const deleteCampaign = useDeleteV2Campaign();
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);

  const campaignId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useV2Campaign(campaignId);
  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useV2Campaigns();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useV2AdminProjects();
  const { data: products, isLoading: productsLoading, error: productsError } = useV2AdminProducts();
  const { data: bundleDefinitions, isLoading: bundlesLoading, error: bundlesError } = useV2BundleDefinitions();

  const handleDeleteCampaign = async () => {
    if (!campaign) {
      return;
    }

    const confirmed = await confirm({
      title: '캠페인 삭제',
      message: `"${campaign.name}" 캠페인을 삭제하시겠습니까?`,
      description:
        '캠페인과 연결된 대상, 전용 가격표, 프로모션, 쿠폰이 함께 목록과 상점 노출에서 제외됩니다.',
      confirmText: '삭제',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setPageErrorMessage(null);

    try {
      await deleteCampaign.mutateAsync(campaign.id);
      notify('캠페인을 삭제했습니다.', { type: 'success' });
      router.push('/admin/v2-catalog/campaigns');
    } catch (deleteError) {
      setPageErrorMessage(getErrorMessage(deleteError));
    }
  };

  if (campaignLoading || campaignsLoading || projectsLoading || productsLoading || bundlesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="캠페인 수정 화면을 준비하는 중입니다." />
      </div>
    );
  }

  if (
    campaignError ||
    campaignsError ||
    projectsError ||
    productsError ||
    bundlesError ||
    !campaign ||
    !campaigns ||
    !projects ||
    !products ||
    !bundleDefinitions
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          캠페인 수정 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push('/admin/v2-catalog/campaigns')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="campaign form"
        title="캠페인 수정"
        description="이름, 설명, 기간을 손보고 적용 대상은 상세 페이지에서 이어서 관리합니다."
        actions={
          <>
            <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}>
              상세로 돌아가기
            </Button>
            <Button
              intent="danger"
              className={adminDangerIconButtonClass}
              onClick={handleDeleteCampaign}
              loading={deleteCampaign.isPending}
              aria-label="캠페인 삭제"
              title="캠페인 삭제"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </Button>
          </>
        }
      />

      {pageErrorMessage ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {pageErrorMessage}
        </div>
      ) : null}

      <CampaignForm
        mode="edit"
        campaign={campaign}
        campaigns={campaigns}
        projects={projects}
        products={products}
        bundleDefinitions={bundleDefinitions}
        onCancel={() => router.push(`/admin/v2-catalog/campaigns/${campaignId}`)}
        onSuccess={(nextCampaignId) => router.push(`/admin/v2-catalog/campaigns/${nextCampaignId}`)}
      />
    </div>
  );
}
