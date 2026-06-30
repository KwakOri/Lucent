'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  adminButtonClass,
  adminDangerIconButtonClass,
  adminPrimaryButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ProductBundleManager } from '@/src/components/admin/v2-catalog/ProductBundleManager';
import { ProductBasicsForm } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import type { ProductBasicsFormValues } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import { ProductMediaManager } from '@/src/components/admin/v2-catalog/ProductMediaManager';
import { ProductVariantDeliverySettings } from '@/src/components/admin/v2-catalog/ProductVariantManager';
import { useAdminFeedback } from '@/src/components/admin/AdminFeedback';
import {
  useCreateV2CampaignTarget,
  useCreateV2PriceList,
  useCreateV2PriceListItem,
  useDeleteV2CampaignTarget,
  useDeleteV2Product,
  usePublishV2PriceList,
  useUpdateV2PriceListItem,
  useUpdateV2Product,
  useUpdateV2Variant,
  useV2AdminProduct,
  useV2AdminProjects,
  useV2AdminVariants,
  useV2Campaigns,
  useV2CampaignTargetsMap,
  useV2PriceListItems,
  useV2PriceLists,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import type {
  V2PriceList,
  V2PriceListItem,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  buildDefaultCampaignOptions,
  findDefaultCampaignOption,
} from '@/lib/client/utils/v2-product-campaign-inclusion';
import { DEFAULT_VARIANT_STATUS } from '@/lib/client/utils/v2-product-admin-form';
import { parseOptionalPriceInput } from '@/lib/client/utils/v2-price-input';

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

function pickDefaultVariant(variants: V2Variant[]): V2Variant | null {
  return (
    variants.find((variant) => variant.title.trim().toLowerCase() === 'default') ||
    variants[0] ||
    null
  );
}

function pickLatestBasePriceList(priceLists: V2PriceList[]): V2PriceList | null {
  return (
    priceLists
      .filter((priceList) => priceList.scope_type === 'BASE')
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0] || null
  );
}

function pickBestActivePriceItem(items: V2PriceListItem[]): V2PriceListItem | null {
  const activeItems = items.filter((item) => item.status === 'ACTIVE');
  return (
    activeItems.sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ||
    null
  );
}

function findDefaultVariantBasePrice(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string | null;
}): V2PriceListItem | null {
  if (!params.variantId) {
    return null;
  }

  return pickBestActivePriceItem(
    params.items.filter(
      (item) =>
        item.product_id === params.productId &&
        item.variant_id === params.variantId,
    ),
  );
}

function findResolvedDefaultBasePrice(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string | null;
}): V2PriceListItem | null {
  const exact = findDefaultVariantBasePrice(params);
  if (exact) {
    return exact;
  }

  return pickBestActivePriceItem(
    params.items.filter(
      (item) => item.product_id === params.productId && item.variant_id === null,
    ),
  );
}

export default function V2CatalogProductDetailPage() {
  const router = useRouter();
  const { confirm } = useAdminFeedback();
  const params = useParams<{ id: string }>();
  const deleteProduct = useDeleteV2Product();
  const updateProduct = useUpdateV2Product();
  const updateVariant = useUpdateV2Variant();
  const createPriceList = useCreateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const updatePriceListItem = useUpdateV2PriceListItem();
  const createCampaignTarget = useCreateV2CampaignTarget();
  const deleteCampaignTarget = useDeleteV2CampaignTarget();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdvancedSavePending, setIsAdvancedSavePending] = useState(false);
  const bundleSaveHandlerRef = useRef<(() => Promise<boolean>) | null>(null);
  const variantSaveHandlerRef = useRef<(() => Promise<boolean>) | null>(null);

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
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(productId);
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
  const defaultVariant = useMemo(
    () => pickDefaultVariant(variants || []),
    [variants],
  );
  const activeBasePriceList = useMemo(
    () => pickLatestBasePriceList(basePriceLists || []),
    [basePriceLists],
  );
  const {
    data: basePriceItems,
    isLoading: basePriceItemsLoading,
    error: basePriceItemsError,
  } = useV2PriceListItems(activeBasePriceList?.id || null);
  const defaultBasePriceItem = useMemo(
    () =>
      findDefaultVariantBasePrice({
        items: basePriceItems || [],
        productId,
        variantId: defaultVariant?.id || null,
      }),
    [basePriceItems, defaultVariant?.id, productId],
  );
  const resolvedDefaultBasePriceItem = useMemo(
    () =>
      findResolvedDefaultBasePrice({
        items: basePriceItems || [],
        productId,
        variantId: defaultVariant?.id || null,
      }),
    [basePriceItems, defaultVariant?.id, productId],
  );

  const listPath = product
    ? `/admin/v2-catalog/products/projects/${product.project_id}`
    : '/admin/v2-catalog/products';

  const ensureBasePriceList = async (): Promise<V2PriceList> => {
    if (activeBasePriceList) {
      return activeBasePriceList;
    }

    if (!product) {
      throw new Error('상품 정보를 확인하지 못했습니다.');
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
        source: 'v2-product-detail-form',
        product_id: product.id,
        project_id: product.project_id,
      },
      skipInvalidate: true,
    });

    return created.data;
  };

  const upsertDefaultBasePrice = async (params: {
    variantId: string;
    unitAmount: number;
  }) => {
    if (!product) {
      return;
    }

    const priceList = await ensureBasePriceList();
    if (defaultBasePriceItem) {
      await updatePriceListItem.mutateAsync({
        itemId: defaultBasePriceItem.id,
        data: {
          product_id: product.id,
          variant_id: params.variantId,
          unit_amount: params.unitAmount,
          compare_at_amount: null,
          status: 'ACTIVE',
        },
      });
    } else {
      await createPriceListItem.mutateAsync({
        priceListId: priceList.id,
        data: {
          product_id: product.id,
          variant_id: params.variantId,
          unit_amount: params.unitAmount,
          compare_at_amount: null,
          status: 'ACTIVE',
          metadata: {
            source: 'v2-product-detail-form',
            pricing_mode: 'BASE',
          },
        },
      });
    }

    if (priceList.status !== 'PUBLISHED') {
      await publishPriceList.mutateAsync({
        id: priceList.id,
      });
    }
  };

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
              source: 'v2-product-detail-form',
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

  const registerBundleSaveHandler = useCallback(
    (handler: (() => Promise<boolean>) | null) => {
      bundleSaveHandlerRef.current = handler;
    },
    [],
  );

  const registerVariantSaveHandler = useCallback(
    (handler: (() => Promise<boolean>) | null) => {
      variantSaveHandlerRef.current = handler;
    },
    [],
  );

  const saveAdvancedManagers = async (): Promise<boolean> => {
    if (variantSaveHandlerRef.current) {
      const saved = await variantSaveHandlerRef.current();
      if (!saved) {
        return false;
      }
    }

    if (product?.product_kind === 'BUNDLE' && bundleSaveHandlerRef.current) {
      const saved = await bundleSaveHandlerRef.current();
      if (!saved) {
        return false;
      }
    }

    return true;
  };

  const handleUpdateProduct = async (values: ProductBasicsFormValues) => {
    if (!productId) {
      return;
    }

    setErrorMessage(null);

    try {
      const defaultVariantStatus =
        values.default_variant_status || defaultVariant?.status || DEFAULT_VARIANT_STATUS;
      const defaultBasePrice = parseOptionalPriceInput(
        values.default_variant_base_price || '',
        '기본 판매가',
      );
      if (defaultVariant && defaultVariantStatus === 'ACTIVE' && defaultBasePrice === null) {
        throw new Error('판매 중 옵션은 기본 판매가를 입력해야 합니다.');
      }

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

      if (defaultVariant) {
        const nextFulfillmentType =
          values.fulfillment_type || defaultVariant.fulfillment_type;
        await updateVariant.mutateAsync({
          variantId: defaultVariant.id,
          data: {
            status: defaultVariantStatus,
            fulfillment_type: nextFulfillmentType,
            requires_shipping: nextFulfillmentType === 'PHYSICAL',
          },
        });

        if (defaultBasePrice !== null) {
          await upsertDefaultBasePrice({
            variantId: defaultVariant.id,
            unitAmount: defaultBasePrice,
          });
        }
      }

      await syncDefaultCampaignInclusion(values);

      const advancedSaved = await saveAdvancedManagers();
      if (!advancedSaved) {
        return;
      }

      router.push(listPath);
    } catch (updateError) {
      setErrorMessage(getErrorMessage(updateError));
    }
  };

  const handleSaveAdvancedOptions = async () => {
    setIsAdvancedSavePending(true);
    setErrorMessage(null);

    try {
      await saveAdvancedManagers();
    } catch (saveError) {
      setErrorMessage(getErrorMessage(saveError));
    } finally {
      setIsAdvancedSavePending(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) {
      return;
    }
    const confirmed = await confirm({
      title: '상품 삭제',
      message: `"${product.title}" 상품을 삭제하시겠습니까?`,
      description: '상품과 연결된 운영 데이터에 영향이 있을 수 있습니다.',
      confirmText: '삭제',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);

    try {
      await deleteProduct.mutateAsync(product.id);
      router.push(listPath);
    } catch (deleteError) {
      setErrorMessage(getErrorMessage(deleteError));
    }
  };

  if (
    isLoading ||
    projectsLoading ||
    variantsLoading ||
    basePriceListsLoading ||
    basePriceItemsLoading ||
    campaignsLoading ||
    campaignTargetsLoading
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (
    error ||
    projectsError ||
    variantsError ||
    basePriceListsError ||
    basePriceItemsError ||
    campaignsError ||
    !product ||
    !projects ||
    !alwaysOnCampaigns
  ) {
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

  const variantCount = variants?.length || 0;
  const isPhysicalProduct =
    product.product_kind === 'STANDARD' && product.fulfillment_type === 'PHYSICAL';
  const advancedTitle = product.product_kind === 'BUNDLE'
    ? '번들 구성'
    : isPhysicalProduct
      ? '재고/배송 설정'
      : '디지털 파일';
  const advancedDescription = product.product_kind === 'BUNDLE'
    ? '번들 구성은 아래 번들 구성 관리에서 조정합니다.'
    : isPhysicalProduct
      ? '실물 배송 상품의 무게와 재고 수량을 관리합니다.'
      : '디지털 상품의 다운로드 파일 또는 링크를 연결합니다.';
  const isFormSubmitting =
    updateProduct.isPending ||
    updateVariant.isPending ||
    createPriceList.isPending ||
    publishPriceList.isPending ||
    createPriceListItem.isPending ||
    updatePriceListItem.isPending ||
    createCampaignTarget.isPending ||
    deleteCampaignTarget.isPending ||
    isAdvancedSavePending;

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="product form"
        title="상품 정보 수정"
        description="상세 화면에서 생성 폼과 같은 구조로 기본 정보, 이미지, 기본 옵션을 수정합니다."
        actions={
          <>
            <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(listPath)}>
              목록으로
            </Button>
            <Button
              intent="danger"
              className={adminDangerIconButtonClass}
              onClick={handleDeleteProduct}
              loading={deleteProduct.isPending}
              aria-label="상품 삭제"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </Button>
          </>
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
          default_variant_status: defaultVariant?.status || DEFAULT_VARIANT_STATUS,
          default_variant_base_price: resolvedDefaultBasePriceItem
            ? String(resolvedDefaultBasePriceItem.unit_amount)
            : null,
          default_campaign_inclusion: currentCampaignOption?.excludedProductTargetId
            ? 'EXCLUDED'
            : 'INCLUDED',
        }}
        isSubmitting={isFormSubmitting}
        showDefaultOptionSettings
        showCampaignInclusionSettings
        campaignOptions={defaultCampaignOptions}
        mediaContent={<ProductMediaManager product={product} embedded layout="stacked" />}
        advancedTitle={advancedTitle}
        advancedDescription={advancedDescription}
        advancedContent={
          product.product_kind === 'STANDARD' ? (
            <ProductVariantDeliverySettings
              product={product}
              variant={defaultVariant}
              variantCount={variantCount}
              registerSaveHandler={registerVariantSaveHandler}
            />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-black text-[#6f6a5e]">
                <div className="rounded-[10px] bg-white px-3 py-2">
                  옵션 {variantCount}개
                </div>
                <div className="rounded-[10px] bg-white px-3 py-2">
                  번들 상품
                </div>
              </div>
              <div className="rounded-[12px] border border-[#e7e3d3] bg-white px-4 py-3">
                <p className="text-xs font-black text-[#1a1a2e]">번들 구성 관리</p>
                <p className="mt-1 text-xs font-medium leading-5 text-[#1a1a2e]/55">
                  구성 상품과 수량 정책은 아래 번들 구성 관리 영역에서 저장합니다.
                </p>
              </div>
            </div>
          )
        }
        submitLabel="저장하고 목록으로"
        errorMessage={errorMessage}
        onCancel={() => router.push(listPath)}
        onSubmit={handleUpdateProduct}
      />

      {product.product_kind === 'BUNDLE' && (
        <details className="group scroll-mt-24 rounded-[20px] border border-[#e7e3d3] bg-white p-5 shadow-none sm:p-6">
          <summary className="flex cursor-pointer list-none flex-col gap-3 outline-none marker:hidden lg:flex-row lg:items-center lg:justify-between [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="text-lg font-black text-[#1a1a2e]">번들 구성 관리</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#1a1a2e]/55">
                구성 상품과 수량 정책을 관리합니다.
              </p>
            </div>
            <span className="inline-flex h-10 items-center rounded-[12px] bg-[#f5f3e8] px-4 text-sm font-black text-[#1a1a2e] group-open:bg-[#1a1a2e] group-open:text-white">
              열기/접기
            </span>
          </summary>

          <div className="mt-5 space-y-5">
            <ProductBundleManager
              bundleProduct={product}
              registerSaveHandler={registerBundleSaveHandler}
            />

            <div className="flex justify-end">
              <Button
                className={adminPrimaryButtonClass}
                loading={isAdvancedSavePending}
                onClick={handleSaveAdvancedOptions}
              >
                번들 구성 저장
              </Button>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
