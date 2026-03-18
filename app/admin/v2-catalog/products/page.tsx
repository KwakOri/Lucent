'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import type { V2ProductStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

type ProductFilterStatus = 'ALL' | V2ProductStatus;
type ProductFilterProject = 'ALL' | string;
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

export default function V2CatalogProductsPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductFilterStatus>('ALL');
  const [projectFilter, setProjectFilter] = useState<ProductFilterProject>('ALL');
  const [sortKey, setSortKey] = useState<ProductSortKey>('SORT_ASC');

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useV2AdminProducts();

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (projects || []).forEach((project) => {
      map.set(project.id, project.name);
    });
    return map;
  }, [projects]);

  const filteredProducts = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    const filtered = (products || []).filter((product) => {
      if (statusFilter !== 'ALL' && product.status !== statusFilter) {
        return false;
      }
      if (projectFilter !== 'ALL' && product.project_id !== projectFilter) {
        return false;
      }
      if (!search) {
        return true;
      }

      const projectName = projectNameMap.get(product.project_id) || '';
      const haystack = `${product.title} ${product.slug} ${projectName}`.toLowerCase();
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
  }, [keyword, products, projectFilter, projectNameMap, sortKey, statusFilter]);

  if (projectsLoading || productsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="v2 상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectsError || productsError || !projects || !products) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        상품 운영 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 상품 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            목록에서 상품을 고른 뒤 상세 페이지에서 상품 정보와 판매 옵션을 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent="info" size="md">
            전체 {products.length}개
          </Badge>
          <Button onClick={() => router.push('/admin/v2-catalog/products/new')}>
            새 상품 만들기
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">상품 찾기</h2>
          <p className="text-sm text-gray-500">
            필요한 상품을 빠르게 찾고 상세 관리 화면으로 이동하세요.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_220px_220px]">
          <Input
            placeholder="상품명 또는 프로젝트명 검색"
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
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value as ProductFilterProject)}
            options={[
              { value: 'ALL', label: '전체 프로젝트' },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
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
              상품을 누르면 상세 페이지에서 정보와 variants를 함께 관리할 수 있습니다.
            </p>
          </div>
          <Badge intent="info">{filteredProducts.length}개 표시</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {filteredProducts.length === 0 ? (
            <EmptyState
              title="조건에 맞는 상품이 없어요"
              description="검색어나 필터를 바꾸거나 새 상품을 만들어 주세요."
              action={
                <Button onClick={() => router.push('/admin/v2-catalog/products/new')}>
                  새 상품 만들기
                </Button>
              }
            />
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => router.push(`/admin/v2-catalog/products/${product.id}`)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge intent={resolveKindIntent(product.product_kind)}>
                        {PRODUCT_KIND_LABELS[product.product_kind]}
                      </Badge>
                      <Badge intent={resolveProductStatusIntent(product.status)}>
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </Badge>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-gray-900">
                      {product.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {projectNameMap.get(product.project_id) || product.project_id}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {product.short_description || '등록된 한 줄 설명이 없습니다.'}
                    </p>
                    <p className="mt-3 text-xs text-gray-500">
                      /shop/{product.slug} · {formatDateTime(product.updated_at)} 수정
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center">
                    <span className="text-sm font-medium text-primary-700">상세 관리</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
