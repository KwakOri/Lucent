'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { ProductBasicsForm } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import { ProductVariantManager } from '@/src/components/admin/v2-catalog/ProductVariantManager';
import type { ProductBasicsFormValues } from '@/src/components/admin/v2-catalog/ProductBasicsForm';
import {
  useDeleteV2Product,
  useUpdateV2Product,
  useV2AdminProduct,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

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

function resolveProductStatusIntent(
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  if (status === 'INACTIVE') {
    return 'info';
  }
  return 'default';
}

function resolveKindIntent(
  kind: 'STANDARD' | 'BUNDLE',
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (kind === 'BUNDLE') {
    return 'info';
  }
  return 'default';
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function V2CatalogProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const updateProduct = useUpdateV2Product();
  const deleteProduct = useDeleteV2Product();

  const [message, setMessage] = useState<string | null>(null);
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

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

  const projectName = useMemo(() => {
    if (!product || !projects) {
      return '';
    }
    return (
      projects.find((project) => project.id === product.project_id)?.name || product.project_id
    );
  }, [product, projects]);

  const handleUpdateProduct = async (values: ProductBasicsFormValues) => {
    if (!productId) {
      return;
    }

    setMessage(null);
    setPageErrorMessage(null);
    setFormErrorMessage(null);

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

      setMessage('상품 정보를 저장했습니다.');
    } catch (updateError) {
      setFormErrorMessage(getErrorMessage(updateError));
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) {
      return;
    }
    if (!window.confirm(`"${product.title}" 상품을 삭제하시겠습니까?`)) {
      return;
    }

    setMessage(null);
    setPageErrorMessage(null);

    try {
      await deleteProduct.mutateAsync(product.id);
      router.push('/admin/v2-catalog/products');
    } catch (deleteError) {
      setPageErrorMessage(getErrorMessage(deleteError));
    }
  };

  if (isLoading || projectsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge intent={resolveKindIntent(product.product_kind)}>
              {PRODUCT_KIND_LABELS[product.product_kind]}
            </Badge>
            <Badge intent={resolveProductStatusIntent(product.status)}>
              {PRODUCT_STATUS_LABELS[product.status]}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{product.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {projectName} · /shop/{product.slug}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            intent="neutral"
            onClick={() => router.push('/admin/v2-catalog/products')}
          >
            목록으로
          </Button>
          {product.product_kind === 'BUNDLE' && (
            <Button
              intent="neutral"
              onClick={() => router.push('/admin/v2-catalog/bundles')}
            >
              번들 구성 관리
            </Button>
          )}
          <Button
            intent="danger"
            onClick={handleDeleteProduct}
            loading={deleteProduct.isPending}
          >
            상품 삭제
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {pageErrorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageErrorMessage}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            프로젝트
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">{projectName}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            최근 수정
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {formatDateTime(product.updated_at)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            한 줄 설명
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {product.short_description || '등록된 설명이 없습니다.'}
          </p>
        </div>
      </section>

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
        submitLabel="상품 정보 저장"
        errorMessage={formErrorMessage}
        onCancel={() => router.push('/admin/v2-catalog/products')}
        onSubmit={handleUpdateProduct}
      />

      <ProductVariantManager product={product} />
    </div>
  );
}
