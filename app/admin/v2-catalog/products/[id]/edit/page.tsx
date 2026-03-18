'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { ProductBasicsForm } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import type { ProductBasicsFormValues } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import {
  useUpdateV2Product,
  useV2AdminProduct,
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

export default function V2CatalogProductEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const updateProduct = useUpdateV2Product();
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
          short_description: values.short_description,
          description: values.description,
          status: values.status,
        },
      });

      router.push(`/admin/v2-catalog/products?product=${productId}`);
    } catch (updateError) {
      setErrorMessage(getErrorMessage(updateError));
    }
  };

  if (isLoading || projectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || projectsError || !product || !projects) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          상품 정보를 불러오지 못했습니다.
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
          <h1 className="text-2xl font-bold text-gray-900">상품 정보 수정</h1>
          <p className="mt-1 text-sm text-gray-500">
            {product.title}의 기본 정보와 판매 상태를 정리합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
            목록으로
          </Button>
        </div>
      </div>

      <ProductBasicsForm
        mode="edit"
        projects={projects}
        initialValues={{
          project_id: product.project_id,
          product_kind: product.product_kind,
          title: product.title,
          slug: product.slug,
          short_description: product.short_description,
          description: product.description,
          status: product.status,
        }}
        isSubmitting={updateProduct.isPending}
        submitLabel="변경 내용 저장"
        errorMessage={errorMessage}
        onCancel={() => router.push(`/admin/v2-catalog/products?product=${productId}`)}
        onSubmit={handleUpdateProduct}
      />
    </div>
  );
}
