'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import type { V2ProductStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2AdminProducts,
  useV2AdminProject,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

type ProductFilterStatus = 'ALL' | V2ProductStatus;
type ProductSortKey = 'SORT_ASC' | 'UPDATED_DESC' | 'TITLE_ASC';

const PRODUCT_STATUS_VALUES: V2ProductStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];

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

function resolveProductStatusIntent(
  status: V2ProductStatus,
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

export default function V2CatalogProjectProductsPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();

  const projectId = useMemo(() => {
    const raw = params?.projectId;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductFilterStatus>('ALL');
  const [sortKey, setSortKey] = useState<ProductSortKey>('SORT_ASC');

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
            /{project.slug} 프로젝트에 연결된 상품 목록과 상태를 관리합니다.
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
            필요한 상품을 빠르게 찾고 상세 페이지에서 상품/옵션을 관리하세요.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_220px]">
          <Input
            placeholder="상품명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProductFilterStatus)}
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
              상품을 누르면 상세 페이지에서 기본 정보, variants, 미디어를 함께 관리할 수 있습니다.
            </p>
          </div>
          <Badge intent="info">{filteredProducts.length}개 표시</Badge>
        </div>

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
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">상품</th>
                      <th className="px-4 py-3">상태</th>
                      <th className="px-4 py-3">정렬</th>
                      <th className="px-4 py-3">최근 수정</th>
                      <th className="px-4 py-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="transition hover:bg-blue-50/40">
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-gray-900">{product.title}</p>
                          <p className="mt-1 max-w-[360px] truncate text-xs text-gray-500">
                            {product.short_description || '한 줄 설명 없음'}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge intent={resolveKindIntent(product.product_kind)}>
                              {PRODUCT_KIND_LABELS[product.product_kind]}
                            </Badge>
                            <Badge intent={resolveProductStatusIntent(product.status)}>
                              {PRODUCT_STATUS_LABELS[product.status]}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-gray-700">{product.sort_order}</td>
                        <td className="px-4 py-3 align-top text-xs text-gray-500">
                          {formatDateTime(product.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <Button
                            size="sm"
                            intent="neutral"
                            onClick={() => router.push(`/admin/v2-catalog/products/${product.id}`)}
                          >
                            상세
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
