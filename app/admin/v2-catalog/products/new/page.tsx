'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  adminButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
import { useAdminFeedback } from '@/src/components/admin/AdminFeedback';
import { ProductBasicsForm } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import type { ProductBasicsFormValues } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import {
  useCreateV2Product,
  useCreateV2CampaignTarget,
  useCreateV2PriceList,
  useCreateV2PriceListItem,
  useCreateV2Variant,
  useCreateV2ProductMedia,
  usePublishV2PriceList,
  useUploadV2MediaAssetFile,
  useV2AdminProjects,
  useV2Campaigns,
  useV2CampaignTargetsMap,
  useV2PriceLists,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import type {
  V2PriceList,
  V2Product,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  DEFAULT_VARIANT_STATUS,
  buildVariantSku,
} from '@/lib/client/utils/v2-product-admin-form';
import { parseOptionalPriceInput } from '@/lib/client/utils/v2-price-input';
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

export default function V2CatalogProductCreatePage() {
  const router = useRouter();
  const { notify } = useAdminFeedback();
  const searchParams = useSearchParams();
  const createProduct = useCreateV2Product();
  const createVariant = useCreateV2Variant();
  const createPriceList = useCreateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const createCampaignTarget = useCreateV2CampaignTarget();
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const createProductMedia = useCreateV2ProductMedia();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();
  const {
    data: basePriceLists,
    isLoading: basePriceListsLoading,
    error: basePriceListsError,
  } = useV2PriceLists({
    campaignId: '',
    scopeType: 'BASE',
  });
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

  const activeProjects = useMemo(
    () => (projects || []).filter((project) => project.status !== 'ARCHIVED'),
    [projects],
  );
  const prefilledProjectId = useMemo(
    () => searchParams.get('projectId') || '',
    [searchParams],
  );
  const listPath = prefilledProjectId
    ? `/admin/v2-catalog/products/projects/${prefilledProjectId}`
    : '/admin/v2-catalog/products';
  const initialProjectId = useMemo(() => {
    if (!prefilledProjectId) {
      return '';
    }
    return activeProjects.some((project) => project.id === prefilledProjectId)
      ? prefilledProjectId
      : '';
  }, [activeProjects, prefilledProjectId]);
  const defaultCampaignOptions = useMemo(
    () =>
      buildDefaultCampaignOptions({
        campaigns: alwaysOnCampaigns || [],
        targetsByCampaignId: campaignTargetsByCampaignId,
      }),
    [alwaysOnCampaigns, campaignTargetsByCampaignId],
  );

  const pickLatestBasePriceList = () =>
    (basePriceLists || [])
      .filter((priceList) => priceList.scope_type === 'BASE')
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0] || null;

  const ensureBasePriceList = async (): Promise<V2PriceList> => {
    const current = pickLatestBasePriceList();
    if (current) {
      return current;
    }

    const created = await createPriceList.mutateAsync({
      campaign_id: null,
      name: '상품 옵션 기준가',
      scope_type: 'BASE',
      status: 'DRAFT',
      currency_code: 'KRW',
      starts_at: null,
      ends_at: null,
      metadata: {
        source: 'v2-product-create-form',
      },
      skipInvalidate: true,
    });

    return created.data;
  };

  const createBasePrice = async (params: {
    product: V2Product;
    variantId: string;
    unitAmount: number;
  }) => {
    const priceList = await ensureBasePriceList();

    await createPriceListItem.mutateAsync({
      priceListId: priceList.id,
      data: {
        product_id: params.product.id,
        variant_id: params.variantId,
        unit_amount: params.unitAmount,
        compare_at_amount: null,
        status: 'ACTIVE',
        metadata: {
          source: 'v2-product-create-form',
          pricing_mode: 'BASE',
        },
      },
    });

    if (priceList.status !== 'PUBLISHED') {
      await publishPriceList.mutateAsync({
        id: priceList.id,
      });
    }
  };

  const syncDefaultCampaignInclusion = async (params: {
    productId: string;
    projectId: string;
    inclusion: ProductBasicsFormValues['default_campaign_inclusion'];
  }) => {
    if (params.inclusion !== 'EXCLUDED') {
      return;
    }

    const campaignOption = findDefaultCampaignOption(
      defaultCampaignOptions,
      params.projectId,
    );
    if (!campaignOption) {
      return;
    }

    await createCampaignTarget.mutateAsync({
      campaignId: campaignOption.campaignId,
      data: {
        target_type: 'PRODUCT',
        target_id: params.productId,
        is_excluded: true,
        source_type: 'PRODUCT_CREATE_FORM',
        source_id: params.productId,
        metadata: {
          source: 'v2-product-create-form',
          reason: 'operator_excluded_from_default_campaign',
        },
      },
    });
  };

  const uploadProductImages = async (params: {
    productId: string;
    productTitle: string;
    coverImageFile?: File | null;
    detailImageFiles?: File[];
  }) => {
    if (params.coverImageFile) {
      const uploaded = await uploadMediaAssetFile.mutateAsync({
        data: {
          file: params.coverImageFile,
          asset_kind: 'IMAGE',
          status: 'ACTIVE',
          metadata: {
            source: 'v2-product-create-cover-upload',
          },
        },
      });

      await createProductMedia.mutateAsync({
        productId: params.productId,
        data: {
          media_asset_id: uploaded.data.id,
          media_role: 'PRIMARY',
          is_primary: true,
          sort_order: 0,
          status: 'ACTIVE',
          alt_text: `${params.productTitle} 대표 이미지`,
        },
      });
    }

    const detailImageFiles = params.detailImageFiles || [];
    for (let index = 0; index < detailImageFiles.length; index += 1) {
      const file = detailImageFiles[index];
      const uploaded = await uploadMediaAssetFile.mutateAsync({
        data: {
          file,
          asset_kind: 'IMAGE',
          status: 'ACTIVE',
          metadata: {
            source: 'v2-product-create-detail-upload',
          },
        },
      });

      await createProductMedia.mutateAsync({
        productId: params.productId,
        data: {
          media_asset_id: uploaded.data.id,
          media_role: 'DETAIL',
          is_primary: false,
          sort_order: (index + 1) * 10,
          status: 'ACTIVE',
          alt_text: `${params.productTitle} 상세 이미지 ${index + 1}`,
        },
      });
    }
  };

  const handleCreateProduct = async (values: ProductBasicsFormValues) => {
    setErrorMessage(null);

    try {
      const defaultVariantStatus =
        values.default_variant_status || DEFAULT_VARIANT_STATUS;
      const defaultBasePrice = parseOptionalPriceInput(
        values.default_variant_base_price || '',
        '기본 판매가',
      );
      if (defaultVariantStatus === 'ACTIVE' && defaultBasePrice === null) {
        throw new Error('판매 중 옵션은 기본 판매가를 입력해야 합니다.');
      }

      const response = await createProduct.mutateAsync({
        project_id: values.project_id,
        title: values.title,
        slug: values.slug,
        product_kind: values.product_kind,
        fulfillment_type: values.fulfillment_type,
        status: values.status || 'DRAFT',
        short_description: values.short_description,
        description: values.description,
      });

      const createdProduct = response.data;
      const defaultFulfillmentType = values.fulfillment_type || 'DIGITAL';
      let createdVariantId: string | null = null;

      try {
        const createdVariant = await createVariant.mutateAsync({
          productId: createdProduct.id,
          data: {
            title: 'default',
            sku: buildVariantSku({
              productSlug: createdProduct.slug,
              variantTitle: 'default',
              fulfillmentType: defaultFulfillmentType,
            }),
            fulfillment_type: defaultFulfillmentType,
            status: defaultVariantStatus,
            requires_shipping: defaultFulfillmentType === 'PHYSICAL',
            track_inventory: false,
            option_summary_json: {
              option: 'default',
            },
          },
        });
        createdVariantId = createdVariant.data.id;
      } catch (defaultVariantError) {
        notify(
          `상품은 생성되었지만 기본 옵션 자동 생성에 실패했습니다. 상세 화면에서 옵션을 추가해 주세요. ${getErrorMessage(defaultVariantError)}`,
          { type: 'warning', duration: 10000 },
        );
        router.push(`/admin/v2-catalog/products/${createdProduct.id}`);
        return;
      }

      try {
        if (defaultBasePrice !== null && createdVariantId) {
          await createBasePrice({
            product: createdProduct,
            variantId: createdVariantId,
            unitAmount: defaultBasePrice,
          });
        }
        await syncDefaultCampaignInclusion({
          productId: createdProduct.id,
          projectId: values.project_id,
          inclusion: values.default_campaign_inclusion,
        });
        await uploadProductImages({
          productId: createdProduct.id,
          productTitle: createdProduct.title,
          coverImageFile: values.cover_image_file,
          detailImageFiles: values.detail_image_files,
        });
      } catch (postCreateError) {
        notify(
          `상품과 기본 옵션은 생성되었지만 가격, 캠페인 또는 이미지 설정 일부를 반영하지 못했습니다. 상세 화면에서 확인해 주세요. ${getErrorMessage(postCreateError)}`,
          { type: 'warning', duration: 10000 },
        );
        router.push(`/admin/v2-catalog/products/${createdProduct.id}`);
        return;
      }

      router.push(`/admin/v2-catalog/products/${response.data.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  if (
    projectsLoading ||
    basePriceListsLoading ||
    campaignsLoading ||
    campaignTargetsLoading
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="프로젝트 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (
    projectsError ||
    basePriceListsError ||
    campaignsError ||
    !projects ||
    !basePriceLists ||
    !alwaysOnCampaigns
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          상품 생성에 필요한 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(listPath)}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="product form"
        title="새 상품 만들기"
        description="저장 시 기본 옵션(default) 1개를 자동 생성하고, 필요하면 옵션을 추가해 확장할 수 있습니다."
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(listPath)}>
            목록으로
          </Button>
        }
      />

      <ProductBasicsForm
        mode="create"
        projects={activeProjects}
        initialValues={{
          project_id: initialProjectId,
          product_kind: 'STANDARD',
          fulfillment_type: 'DIGITAL',
          title: '',
          slug: '',
          short_description: null,
          description: null,
          status: 'DRAFT',
        }}
        isSubmitting={
          createProduct.isPending ||
          createVariant.isPending ||
          uploadMediaAssetFile.isPending ||
          createProductMedia.isPending
        }
        showDefaultOptionSettings
        showCampaignInclusionSettings
        campaignOptions={defaultCampaignOptions}
        submitLabel="기본 정보 저장"
        errorMessage={errorMessage}
        onCancel={() => router.push(listPath)}
        onSubmit={handleCreateProduct}
      />
    </div>
  );
}
