'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { ProductBasicsForm } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import type { ProductBasicsFormValues } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import {
  useCreateV2Product,
  useCreateV2Variant,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { buildVariantSku } from '@/lib/client/utils/v2-product-admin-form';

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
  const searchParams = useSearchParams();
  const createProduct = useCreateV2Product();
  const createVariant = useCreateV2Variant();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();

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

  const handleCreateProduct = async (values: ProductBasicsFormValues) => {
    setErrorMessage(null);

    try {
      const response = await createProduct.mutateAsync({
        project_id: values.project_id,
        title: values.title,
        slug: values.slug,
        product_kind: values.product_kind,
        fulfillment_type: values.fulfillment_type,
        status: 'DRAFT',
        short_description: values.short_description,
        description: values.description,
      });

      const createdProduct = response.data;
      const defaultFulfillmentType = values.fulfillment_type || 'DIGITAL';

      try {
        await createVariant.mutateAsync({
          productId: createdProduct.id,
          data: {
            title: 'default',
            sku: buildVariantSku({
              productSlug: createdProduct.slug,
              variantTitle: 'default',
              fulfillmentType: defaultFulfillmentType,
            }),
            fulfillment_type: defaultFulfillmentType,
            status: 'DRAFT',
            requires_shipping: defaultFulfillmentType === 'PHYSICAL',
            track_inventory: false,
            option_summary_json: {
              option: 'default',
            },
          },
        });
      } catch (defaultVariantError) {
        window.alert(
          `상품은 생성되었지만 기본 옵션 자동 생성에 실패했습니다. 상세 화면에서 옵션을 추가해 주세요.\n\n${getErrorMessage(defaultVariantError)}`,
        );
        router.push(`/admin/v2-catalog/products/${createdProduct.id}`);
        return;
      }

      router.push(`/admin/v2-catalog/products/${response.data.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  if (projectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="프로젝트 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectsError || !projects) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          프로젝트 목록을 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push(listPath)}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 상품 만들기</h1>
          <p className="mt-1 text-sm text-gray-500">
            저장 시 기본 옵션(`default`) 1개를 자동 생성하고, 필요하면 옵션을 추가해 확장할 수 있습니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push(listPath)}>
            목록으로
          </Button>
        </div>
      </div>

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
        }}
        isSubmitting={createProduct.isPending || createVariant.isPending}
        submitLabel="기본 정보 저장"
        errorMessage={errorMessage}
        onCancel={() => router.push(listPath)}
        onSubmit={handleCreateProduct}
      />
    </div>
  );
}
