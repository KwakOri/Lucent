'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { ProductBasicsForm } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import type { ProductBasicsFormValues } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import { useCreateV2Product, useV2AdminProjects } from '@/lib/client/hooks/useV2CatalogAdmin';

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
  const createProduct = useCreateV2Product();
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

  const handleCreateProduct = async (values: ProductBasicsFormValues) => {
    setErrorMessage(null);

    try {
      const response = await createProduct.mutateAsync({
        project_id: values.project_id,
        title: values.title,
        slug: values.slug,
        product_kind: values.product_kind,
        status: 'DRAFT',
        short_description: values.short_description,
        description: values.description,
      });

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
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
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
            기본 정보만 저장하면 옵션 설정으로 바로 이어갈 수 있습니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
            목록으로
          </Button>
        </div>
      </div>

      <ProductBasicsForm
        mode="create"
        projects={activeProjects}
        initialValues={{
          project_id: '',
          product_kind: 'STANDARD',
          title: '',
          slug: '',
          short_description: null,
          description: null,
        }}
        isSubmitting={createProduct.isPending}
        submitLabel="기본 정보 저장"
        errorMessage={errorMessage}
        onCancel={() => router.push('/admin/v2-catalog/products')}
        onSubmit={handleCreateProduct}
      />
    </div>
  );
}
