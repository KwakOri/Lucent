'use client';

import { useMemo, useState } from 'react';
import { CheckSquare, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import { ProjectProductsBulkTable } from '@/src/components/admin/v2-catalog/ProjectProductsBulkTable';
import type { V2ProductStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useBulkUpdateV2ProductStatus,
  useV2AdminProducts,
  useV2AdminProject,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { PRODUCT_STATUS_LABELS } from '@/lib/client/utils/v2-product-admin-form';

type ProductFilterStatus = 'ALL' | V2ProductStatus;
type ProductSortKey = 'CREATED_DESC' | 'SORT_ASC' | 'UPDATED_DESC' | 'TITLE_ASC';
type BulkFeedback = {
  intent: 'success' | 'error' | 'info';
  message: string;
};

const PRODUCT_STATUS_VALUES: V2ProductStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const PRODUCT_STATUS_TRANSITIONS: Record<V2ProductStatus, V2ProductStatus[]> = {
  DRAFT: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
  ACTIVE: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
  INACTIVE: ['INACTIVE', 'ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ARCHIVED'],
};

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
  return '상품 상태 변경 중 오류가 발생했습니다.';
}

function canTransitionProductStatus(
  currentStatus: V2ProductStatus,
  nextStatus: V2ProductStatus,
) {
  return PRODUCT_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export default function V2CatalogProjectProductsPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const bulkUpdateProductStatus = useBulkUpdateV2ProductStatus();

  const projectId = useMemo(() => {
    const raw = params?.projectId;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductFilterStatus>('ALL');
  const [sortKey, setSortKey] = useState<ProductSortKey>('CREATED_DESC');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<V2ProductStatus>('ACTIVE');
  const [bulkFeedback, setBulkFeedback] = useState<BulkFeedback | null>(null);

  const { data: project, isLoading: projectLoading, error: projectError } = useV2AdminProject(projectId);
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useV2AdminProducts({ projectId });

  const filteredProducts = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    const filtered = (products || []).filter((product) => {
      if (statusFilter !== 'ALL' && product.status !== statusFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = `${product.title} ${product.slug}`.toLowerCase();
      return haystack.includes(search);
    });

    return filtered.sort((left, right) => {
      if (sortKey === 'CREATED_DESC') {
        const createdDiff = right.created_at.localeCompare(left.created_at);
        if (createdDiff !== 0) {
          return createdDiff;
        }
        return right.id.localeCompare(left.id);
      }
      if (sortKey === 'SORT_ASC') {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        return left.title.localeCompare(right.title, 'ko');
      }
      if (sortKey === 'TITLE_ASC') {
        return left.title.localeCompare(right.title, 'ko');
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [keyword, products, sortKey, statusFilter]);

  const summary = useMemo(() => {
    const source = products || [];
    return {
      total: source.length,
      active: source.filter((product) => product.status === 'ACTIVE').length,
      draft: source.filter((product) => product.status === 'DRAFT').length,
      inactive: source.filter((product) => product.status === 'INACTIVE').length,
      archived: source.filter((product) => product.status === 'ARCHIVED').length,
    };
  }, [products]);

  const selectedProductIdsInView = useMemo(() => {
    const visibleProductIdSet = new Set(filteredProducts.map((product) => product.id));
    return selectedProductIds.filter((productId) =>
      visibleProductIdSet.has(productId),
    );
  }, [filteredProducts, selectedProductIds]);
  const selectedProductIdSet = useMemo(
    () => new Set(selectedProductIdsInView),
    [selectedProductIdsInView],
  );
  const selectedProducts = useMemo(
    () => filteredProducts.filter((product) => selectedProductIdSet.has(product.id)),
    [filteredProducts, selectedProductIdSet],
  );
  const productsToBulkUpdate = useMemo(
    () =>
      selectedProducts.filter(
        (product) =>
          product.status !== bulkStatus &&
          canTransitionProductStatus(product.status, bulkStatus),
      ),
    [bulkStatus, selectedProducts],
  );
  const blockedBulkProducts = useMemo(
    () =>
      selectedProducts.filter(
        (product) =>
          product.status !== bulkStatus &&
          !canTransitionProductStatus(product.status, bulkStatus),
      ),
    [bulkStatus, selectedProducts],
  );
  const selectedUnchangedCount =
    selectedProducts.length - productsToBulkUpdate.length - blockedBulkProducts.length;
  const allProductsSelected =
    filteredProducts.length > 0 && selectedProductIdsInView.length === filteredProducts.length;
  const hasPartialSelection = selectedProductIdsInView.length > 0 && !allProductsSelected;

  const handleToggleProduct = (productId: string, checked: boolean) => {
    setBulkFeedback(null);
    setSelectedProductIds((previous) => {
      if (checked) {
        return previous.includes(productId) ? previous : [...previous, productId];
      }
      return previous.filter((selectedProductId) => selectedProductId !== productId);
    });
  };

  const handleToggleAllProducts = (checked: boolean) => {
    setBulkFeedback(null);
    setSelectedProductIds(checked ? filteredProducts.map((product) => product.id) : []);
  };

  const handleBulkStatusChange = async () => {
    if (selectedProducts.length === 0) {
      setBulkFeedback({ intent: 'info', message: '상태를 변경할 상품을 먼저 선택해 주세요.' });
      return;
    }

    if (productsToBulkUpdate.length === 0) {
      const reason =
        blockedBulkProducts.length > 0
          ? `${PRODUCT_STATUS_LABELS[bulkStatus]}으로 변경할 수 없는 상품이 포함되어 있습니다.`
          : `선택한 상품이 이미 ${PRODUCT_STATUS_LABELS[bulkStatus]} 상태입니다.`;
      setBulkFeedback({ intent: 'info', message: reason });
      return;
    }

    try {
      const updatedProducts = await bulkUpdateProductStatus.mutateAsync({
        productIds: productsToBulkUpdate.map((product) => product.id),
        status: bulkStatus,
      });
      const skippedCount = selectedProducts.length - updatedProducts.length;
      setSelectedProductIds([]);
      setBulkFeedback({
        intent: 'success',
        message: `${updatedProducts.length}개 상품을 ${PRODUCT_STATUS_LABELS[bulkStatus]} 상태로 변경했습니다.${
          skippedCount > 0 ? ` ${skippedCount}개는 현재 상태 또는 전이 제한으로 제외됐습니다.` : ''
        }`,
      });
    } catch (bulkError) {
      setBulkFeedback({ intent: 'error', message: getErrorMessage(bulkError) });
    }
  };

  if (projectLoading || productsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="프로젝트 상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectError || productsError || !project || !products) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          프로젝트 상품 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
          프로젝트 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">프로젝트 상품 관리</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            /{project.slug} 프로젝트 상품을 리스트에서 바로 미리 보고 빠르게 수정합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
            프로젝트 목록
          </Button>
          <Button onClick={() => router.push(`/admin/v2-catalog/products/new?projectId=${project.id}`)}>
            이 프로젝트에 새 상품
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">전체</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">ACTIVE</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">DRAFT</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.draft}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">INACTIVE</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.inactive}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">ARCHIVED</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.archived}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">상품 찾기</h2>
          <p className="text-sm text-gray-500">
            검색/필터로 대상을 줄인 뒤 상품 상태와 옵션 구성을 빠르게 확인합니다.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_220px]">
          <Input
            placeholder="상품명 검색"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setSelectedProductIds([]);
              setBulkFeedback(null);
            }}
          />
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as ProductFilterStatus);
              setSelectedProductIds([]);
              setBulkFeedback(null);
            }}
            options={[
              { value: 'ALL', label: '전체 상태' },
              ...PRODUCT_STATUS_VALUES.map((status) => ({
                value: status,
                label: PRODUCT_STATUS_LABELS[status],
              })),
            ]}
          />
          <Select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as ProductSortKey)}
            options={[
              { value: 'CREATED_DESC', label: '최근 생성순' },
              { value: 'SORT_ASC', label: '정렬 순서' },
              { value: 'UPDATED_DESC', label: '최근 수정순' },
              { value: 'TITLE_ASC', label: '이름순' },
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">상품 목록</h2>
            <p className="mt-1 text-sm text-gray-500">
              대략적인 상품 정보를 확인하고 편집 아이콘으로 상세 화면에 들어갑니다.
            </p>
          </div>
          <Badge intent="info">{filteredProducts.length}개 표시</Badge>
        </div>

        {selectedProducts.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                상품 {selectedProducts.length}개 선택됨
              </p>
              <p className="mt-1 text-xs text-blue-700">
                변경 대상 {productsToBulkUpdate.length}개
                {selectedUnchangedCount > 0 ? ` · 같은 상태 ${selectedUnchangedCount}개 제외` : ''}
                {blockedBulkProducts.length > 0
                  ? ` · 전이 불가 ${blockedBulkProducts.length}개 제외`
                  : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                size="sm"
                value={bulkStatus}
                disabled={bulkUpdateProductStatus.isPending}
                onChange={(event) => {
                  setBulkStatus(event.target.value as V2ProductStatus);
                  setBulkFeedback(null);
                }}
                className="min-w-[160px]"
                options={PRODUCT_STATUS_VALUES.map((status) => ({
                  value: status,
                  label: PRODUCT_STATUS_LABELS[status],
                }))}
              />
              <Button
                size="sm"
                loading={bulkUpdateProductStatus.isPending}
                onClick={handleBulkStatusChange}
              >
                <CheckSquare className="h-4 w-4" aria-hidden />
                상태 변경
              </Button>
              <Button
                size="sm"
                intent="neutral"
                disabled={bulkUpdateProductStatus.isPending}
                onClick={() => {
                  setSelectedProductIds([]);
                  setBulkFeedback(null);
                }}
              >
                <X className="h-4 w-4" aria-hidden />
                선택 해제
              </Button>
            </div>
          </div>
        )}

        {bulkFeedback && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              bulkFeedback.intent === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : bulkFeedback.intent === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            {bulkFeedback.message}
          </div>
        )}

        <div className="mt-5">
          {filteredProducts.length === 0 ? (
            <EmptyState
              title="조건에 맞는 상품이 없어요"
              description="검색어나 필터를 바꾸거나 새 상품을 만들어 주세요."
              action={
                <Button onClick={() => router.push(`/admin/v2-catalog/products/new?projectId=${project.id}`)}>
                  새 상품 만들기
                </Button>
              }
            />
          ) : (
            <ProjectProductsBulkTable
              products={filteredProducts}
              selectedProductIds={selectedProductIdsInView}
              allProductsSelected={allProductsSelected}
              hasPartialSelection={hasPartialSelection}
              isSelectionDisabled={bulkUpdateProductStatus.isPending}
              onToggleProduct={handleToggleProduct}
              onToggleAllProducts={handleToggleAllProducts}
              onOpenDetail={(productId) => router.push(`/admin/v2-catalog/products/${productId}`)}
            />
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => router.push(`/admin/v2-catalog/products/new?projectId=${project.id}`)}>
            상품 추가
          </Button>
        </div>
      </section>
    </div>
  );
}
