'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  adminButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ProductBasicsForm } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import { ProductVariantManager } from '@/src/components/admin/v2-catalog/ProductVariantManager';
import type { ProductBasicsFormValues } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import {
  useCreateV2CampaignTarget,
  useDeleteV2CampaignTarget,
  useUpdateV2Product,
  useV2AdminProduct,
  useV2AdminProjects,
  useV2Campaigns,
  useV2CampaignTargetsMap,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  buildDefaultCampaignOptions,
  findDefaultCampaignOption,
} from '@/lib/client/utils/v2-product-campaign-inclusion';

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

export default function V2CatalogProductEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const updateProduct = useUpdateV2Product();
  const createCampaignTarget = useCreateV2CampaignTarget();
  const deleteCampaignTarget = useDeleteV2CampaignTarget();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const productId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();
  const { data: product, isLoading, error } = useV2AdminProduct(productId);
  const {
    data: alwaysOnCampaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useV2Campaigns({ campaignType: 'ALWAYS_ON' });
  const alwaysOnCampaignIds = useMemo(
    () => (alwaysOnCampaigns || []).map((campaign) => campaign.id),
    [alwaysOnCampaigns],
  );
  const campaignTargetsByCampaignId = useV2CampaignTargetsMap(alwaysOnCampaignIds);
  const campaignTargetsLoading = Object.values(campaignTargetsByCampaignId).some(
    (entry) => entry.isLoading,
  );
  const defaultCampaignOptions = useMemo(
    () =>
      buildDefaultCampaignOptions({
        campaigns: alwaysOnCampaigns || [],
        targetsByCampaignId: campaignTargetsByCampaignId,
        productId,
      }),
    [alwaysOnCampaigns, campaignTargetsByCampaignId, productId],
  );
  const currentCampaignOption = product
    ? findDefaultCampaignOption(defaultCampaignOptions, product.project_id)
    : null;

  const syncDefaultCampaignInclusion = async (
    values: ProductBasicsFormValues,
  ) => {
    const productExcludeTargets = Object.values(campaignTargetsByCampaignId)
      .flatMap((entry) => entry.targets)
      .filter(
        (target) =>
          target.is_excluded &&
          target.target_type === 'PRODUCT' &&
          target.target_id === productId,
      );
    const targetCampaignOption = findDefaultCampaignOption(
      defaultCampaignOptions,
      values.project_id,
    );

    if (values.default_campaign_inclusion === 'EXCLUDED') {
      await Promise.all(
        productExcludeTargets
          .filter((target) => target.id !== targetCampaignOption?.excludedProductTargetId)
          .map((target) =>
            deleteCampaignTarget.mutateAsync(target.id),
          ),
      );

      if (targetCampaignOption && !targetCampaignOption.excludedProductTargetId) {
        await createCampaignTarget.mutateAsync({
          campaignId: targetCampaignOption.campaignId,
          data: {
            target_type: 'PRODUCT',
            target_id: productId,
            is_excluded: true,
            source_type: 'PRODUCT_EDIT_FORM',
            source_id: productId,
            metadata: {
              source: 'v2-product-edit-form',
              reason: 'operator_excluded_from_default_campaign',
            },
          },
        });
      }
      return;
    }

    await Promise.all(
      productExcludeTargets.map((target) =>
        deleteCampaignTarget.mutateAsync(target.id),
      ),
    );
  };

  const handleUpdateProduct = async (values: ProductBasicsFormValues) => {
    if (!productId) {
      return;
    }

    setErrorMessage(null);

    try {
      await updateProduct.mutateAsync({
        id: productId,
        data: {
          project_id: values.project_id,
          title: values.title,
          slug: values.slug,
          product_kind: values.product_kind,
          fulfillment_type: values.fulfillment_type,
          short_description: values.short_description,
          description: values.description,
          status: values.status,
        },
      });
      await syncDefaultCampaignInclusion(values);

      router.push(`/admin/v2-catalog/products/${productId}`);
    } catch (updateError) {
      setErrorMessage(getErrorMessage(updateError));
    }
  };

  if (isLoading || projectsLoading || campaignsLoading || campaignTargetsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || projectsError || campaignsError || !product || !projects || !alwaysOnCampaigns) {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          상품 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push('/admin/v2-catalog/products')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="product form"
        title="상품 정보 수정"
        description="기본 정보는 별도 페이지에서 차분히 수정하고, 저장 후 상세 화면으로 돌아갑니다."
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/products/${productId}`)}>
            상세로 돌아가기
          </Button>
        }
      />

      <ProductBasicsForm
        mode="edit"
        projects={projects}
        initialValues={{
          project_id: product.project_id,
          product_kind: product.product_kind,
          fulfillment_type: product.fulfillment_type,
          title: product.title,
          slug: product.slug,
          short_description: product.short_description,
          description: product.description,
          status: product.status,
          default_campaign_inclusion: currentCampaignOption?.excludedProductTargetId
            ? 'EXCLUDED'
            : 'INCLUDED',
        }}
        isSubmitting={
          updateProduct.isPending ||
          createCampaignTarget.isPending ||
          deleteCampaignTarget.isPending
        }
        showCampaignInclusionSettings
        campaignOptions={defaultCampaignOptions}
        submitLabel="상품 정보 저장"
        errorMessage={errorMessage}
        onCancel={() => router.push(`/admin/v2-catalog/products/${productId}`)}
        onSubmit={handleUpdateProduct}
      />

      <ProductVariantManager product={product} />
    </div>
  );
}
