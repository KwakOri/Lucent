'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { ProductMediaManager } from '@/src/components/admin/v2-catalog/ProductMediaManager';
import { ProductVariantManager } from '@/src/components/admin/v2-catalog/ProductVariantManager';
import {
  useDeleteV2Product,
  useV2AdminProduct,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  FULFILLMENT_TYPE_LABELS,
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

function resolveFulfillmentSummary(product: {
  product_kind: 'STANDARD' | 'BUNDLE';
  fulfillment_type: 'DIGITAL' | 'PHYSICAL' | null;
}): { title: string; description: string } {
  if (product.product_kind === 'BUNDLE') {
    return {
      title: '번들(구성별 상이)',
      description: '하위 구성에 따라 디지털/실물 제공 방식이 달라질 수 있습니다.',
    };
  }

  if (!product.fulfillment_type) {
    return {
      title: '미설정',
      description: '제공 방식이 설정되지 않았습니다. 상품 정보 수정에서 먼저 선택해 주세요.',
    };
  }

  return {
    title: FULFILLMENT_TYPE_LABELS[product.fulfillment_type],
    description: `이 상품의 옵션은 ${FULFILLMENT_TYPE_LABELS[product.fulfillment_type]} 방식으로 고정됩니다.`,
  };
}

export default function V2CatalogProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const deleteProduct = useDeleteV2Product();
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);

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

  const fulfillmentSummary = product
    ? resolveFulfillmentSummary({
        product_kind: product.product_kind,
        fulfillment_type: product.fulfillment_type,
      })
    : { title: '', description: '' };

  const handleDeleteProduct = async () => {
    if (!product) {
      return;
    }
    if (!window.confirm(`"${product.title}" 상품을 삭제하시겠습니까?`)) {
      return;
    }

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
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
            목록으로
          </Button>
          <Button
            intent="neutral"
            onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/edit`)}
          >
            상품 정보 수정
          </Button>
          <Button
            onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/variants/new`)}
          >
            옵션 추가
          </Button>
          {product.product_kind === 'BUNDLE' && (
            <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/bundles')}>
              번들 구성 관리
            </Button>
          )}
          <Button intent="danger" onClick={handleDeleteProduct} loading={deleteProduct.isPending}>
            상품 삭제
          </Button>
        </div>
      </div>

      {pageErrorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageErrorMessage}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">프로젝트</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{projectName}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">상품 주소</p>
          <p className="mt-2 text-sm font-medium text-gray-900 break-all">/shop/{product.slug}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">최근 수정</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(product.updated_at)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">상품 제공 방식</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">{fulfillmentSummary.title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">{fulfillmentSummary.description}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">상품 기본 정보</h2>
            <p className="mt-1 text-sm text-gray-500">
              현재 상품의 안내 문구와 노출 상태를 한눈에 확인합니다.
            </p>
          </div>
          <Button
            size="sm"
            intent="neutral"
            onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/edit`)}
          >
            수정
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-900">짧은 설명</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {product.short_description || '등록된 한 줄 설명이 없습니다.'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">상세 설명</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {product.description || '등록된 상세 설명이 없습니다.'}
            </p>
          </div>
        </div>
      </section>

      <ProductMediaManager product={product} />

      <ProductVariantManager product={product} />
    </div>
  );
}
