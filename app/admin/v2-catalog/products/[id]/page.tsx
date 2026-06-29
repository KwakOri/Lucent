'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { ProductBundleManager } from '@/src/components/admin/v2-catalog/ProductBundleManager';
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

const adminSurfaceClass =
  'rounded-[20px] border border-[#e7e3d3] bg-white shadow-none';
const mutedTextClass = 'text-[#1a1a2e]/55';
const toolbarButtonClass =
  '!h-11 !rounded-[12px] !border-0 !bg-[#f5f3e8] !px-4 !text-sm !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]';
const primaryToolbarButtonClass =
  '!h-11 !rounded-[12px] !bg-[#1a1a2e] !px-4 !text-sm !font-bold !text-white hover:!bg-[#272743]';

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

function getProductStatusBadgeClass(status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'): string {
  if (status === 'ACTIVE') {
    return 'border-[#c8f1c9] bg-[#eafaea] text-[#297c3b]';
  }
  if (status === 'DRAFT') {
    return 'border-[#ffddbf] bg-[#fff4d5] text-[#a35200]';
  }
  if (status === 'ARCHIVED') {
    return 'border-[#f3d6d6] bg-[#fff0f0] text-[#ca2a30]';
  }
  return 'border-[#eee7d6] bg-[#f5f3e8] text-[#6f6a5e]';
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
  const [isBottomSavePending, setIsBottomSavePending] = useState(false);
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
  const listPath = product
    ? `/admin/v2-catalog/products/projects/${product.project_id}`
    : '/admin/v2-catalog/products';

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
      router.push(listPath);
    } catch (deleteError) {
      setPageErrorMessage(getErrorMessage(deleteError));
    }
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

  const handleSaveAndBack = async () => {
    setIsBottomSavePending(true);
    try {
      if (variantSaveHandlerRef.current) {
        const saved = await variantSaveHandlerRef.current();
        if (!saved) {
          return;
        }
      }

      if (product?.product_kind === 'BUNDLE' && bundleSaveHandlerRef.current) {
        const saved = await bundleSaveHandlerRef.current();
        if (!saved) {
          return;
        }
      }

      router.push(listPath);
    } finally {
      setIsBottomSavePending(false);
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
    <div className="space-y-5 text-[#1a1a2e]">
      <div className="flex flex-col gap-3 rounded-[22px] border border-[#e7e3d3] bg-white px-4 py-3 shadow-none lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#f5f3e8] text-[#1a1a2e] transition hover:bg-[#ece8d9]"
            aria-label="이전 페이지로 이동"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-sm font-bold">
            <span className="hidden text-[#1a1a2e]/45 sm:inline">상품 관리</span>
            <ChevronRight className="hidden h-4 w-4 text-[#9b9788] sm:block" aria-hidden />
            <span className="truncate text-[#1a1a2e]">상품 상세</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            intent="neutral"
            className={toolbarButtonClass}
            onClick={() => router.push(listPath)}
          >
            목록으로
          </Button>
          <Button
            className={primaryToolbarButtonClass}
            onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/edit`)}
          >
            상품 정보 수정
          </Button>
          <Button
            intent="danger"
            className="!h-11 !w-11 !rounded-[14px] !border !border-[#f3d6d6] !bg-white !px-0 !text-[#ca2a30] hover:!bg-[#fff0f0]"
            onClick={handleDeleteProduct}
            loading={deleteProduct.isPending}
            aria-label="상품 삭제"
          >
            <Trash2 className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>

      <section className="px-1 py-2">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge
              intent={resolveKindIntent(product.product_kind)}
              className="rounded-[8px] border border-[#cde0f3] bg-[#eaf3fc] px-3 py-1 text-xs font-bold text-[#4a88b9]"
            >
              {PRODUCT_KIND_LABELS[product.product_kind]}
            </Badge>
            <Badge
              intent={resolveProductStatusIntent(product.status)}
              className={`rounded-[8px] border px-3 py-1 text-xs font-bold ${getProductStatusBadgeClass(product.status)}`}
            >
              {PRODUCT_STATUS_LABELS[product.status]}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[#1a1a2e] sm:text-4xl">
            {product.title}
          </h1>
          <p className={`mt-2 text-sm font-semibold ${mutedTextClass}`}>
            {projectName} · /shop/{product.slug}
          </p>
        </div>
      </section>

      {pageErrorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageErrorMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="min-h-[118px] rounded-[16px] border border-[#e7e3d3] bg-white px-5 py-5 shadow-none">
          <p className={`text-xs font-bold ${mutedTextClass}`}>프로젝트</p>
          <p className="mt-3 text-base font-black text-[#1a1a2e]">{projectName}</p>
        </div>
        <div className="min-h-[118px] rounded-[16px] border border-[#e7e3d3] bg-white px-5 py-5 shadow-none">
          <p className={`text-xs font-bold ${mutedTextClass}`}>상품 주소</p>
          <p className="mt-3 break-all text-base font-black text-[#1a1a2e]">/shop/{product.slug}</p>
        </div>
        <div className="min-h-[118px] rounded-[16px] border border-[#e7e3d3] bg-white px-5 py-5 shadow-none">
          <p className={`text-xs font-bold ${mutedTextClass}`}>최근 수정</p>
          <p className="mt-3 text-base font-black text-[#1a1a2e]">{formatDateTime(product.updated_at)}</p>
        </div>
        <div className="min-h-[118px] rounded-[16px] border border-[#e7e3d3] bg-white px-5 py-5 shadow-none">
          <p className={`text-xs font-bold ${mutedTextClass}`}>상품 제공 방식</p>
          <p className="mt-3 text-base font-black text-[#1a1a2e]">{fulfillmentSummary.title}</p>
          <p className={`mt-2 text-xs leading-5 ${mutedTextClass}`}>{fulfillmentSummary.description}</p>
        </div>
      </section>

      <section className={`${adminSurfaceClass} p-5 sm:p-6`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#1a1a2e]">상품 기본 정보</h2>
            <p className={`mt-2 text-sm font-medium ${mutedTextClass}`}>
              안내 문구와 노출 상태를 한눈에 확인합니다.
            </p>
          </div>
          <Button
            size="sm"
            intent="neutral"
            className="!h-9 !rounded-[12px] !border-0 !bg-[#f5f3e8] !px-4 !text-sm !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]"
            onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/edit`)}
          >
            수정
          </Button>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-2">
          <div>
            <p className={`text-sm font-bold ${mutedTextClass}`}>짧은 설명</p>
            <p className="mt-3 text-sm font-medium leading-7 text-[#1a1a2e]">
              {product.short_description || '등록된 한 줄 설명이 없습니다.'}
            </p>
          </div>
          <div>
            <p className={`text-sm font-bold ${mutedTextClass}`}>상세 설명</p>
            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-[#1a1a2e]">
              {product.description || '등록된 상세 설명이 없습니다.'}
            </p>
          </div>
        </div>
      </section>

      {product.product_kind === 'BUNDLE' && (
        <ProductBundleManager
          bundleProduct={product}
          registerSaveHandler={registerBundleSaveHandler}
        />
      )}

      <ProductMediaManager product={product} />

      <ProductVariantManager
        product={product}
        registerSaveHandler={registerVariantSaveHandler}
      />

      <div className="flex justify-end gap-3 px-1 pb-3 pt-1">
        <Button
          intent="neutral"
          className={toolbarButtonClass}
          onClick={() => router.push(listPath)}
        >
          목록으로
        </Button>
        <Button
          loading={isBottomSavePending}
          className="!h-12 !rounded-[13px] !bg-[#1a1a2e] !px-6 !text-sm !font-bold !text-white hover:!bg-[#272743]"
          onClick={handleSaveAndBack}
        >
          저장하고 목록으로
        </Button>
      </div>
    </div>
  );
}
