'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import {
  AdminPageHeader,
  AdminSurface,
  adminButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
  adminTableBodyClass,
  adminTableContainerClass,
  adminTableHeadCellClass,
  adminTableHeadClass,
} from '@/src/components/admin/AdminDesignSystem';
import type { V2ProjectStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2AdminProducts,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

type ProjectFilterStatus = 'ALL' | V2ProjectStatus;
type ProjectSortKey = 'SORT_ASC' | 'PRODUCT_DESC' | 'UPDATED_DESC' | 'NAME_ASC';

type ProjectSummaryRow = {
  id: string;
  name: string;
  slug: string;
  status: V2ProjectStatus;
  sortOrder: number;
  totalCount: number;
  standardCount: number;
  bundleCount: number;
  activeCount: number;
  draftCount: number;
  inactiveCount: number;
  archivedCount: number;
  latestUpdatedAt: string | null;
};

const PROJECT_STATUS_VALUES: V2ProjectStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

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

function resolveProjectStatusIntent(
  status: V2ProjectStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  return 'default';
}

function buildSummaryRows(
  projects: NonNullable<ReturnType<typeof useV2AdminProjects>['data']>,
  products: NonNullable<ReturnType<typeof useV2AdminProducts>['data']>,
  keyword: string,
  statusFilter: ProjectFilterStatus,
  sortKey: ProjectSortKey,
): ProjectSummaryRow[] {
  const loweredKeyword = keyword.trim().toLowerCase();
  const productsByProjectId = new Map<string, typeof products>();

  products.forEach((product) => {
    const current = productsByProjectId.get(product.project_id) || [];
    current.push(product);
    productsByProjectId.set(product.project_id, current);
  });

  const rows = projects
    .filter((project) => {
      if (statusFilter !== 'ALL' && project.status !== statusFilter) {
        return false;
      }
      if (!loweredKeyword) {
        return true;
      }
      return `${project.name} ${project.slug}`.toLowerCase().includes(loweredKeyword);
    })
    .map<ProjectSummaryRow>((project) => {
      const scopedProducts = productsByProjectId.get(project.id) || [];

      const summary = scopedProducts.reduce(
        (accumulator, product) => {
          if (product.product_kind === 'STANDARD') {
            accumulator.standardCount += 1;
          } else {
            accumulator.bundleCount += 1;
          }

          if (product.status === 'ACTIVE') {
            accumulator.activeCount += 1;
          }
          if (product.status === 'DRAFT') {
            accumulator.draftCount += 1;
          }
          if (product.status === 'INACTIVE') {
            accumulator.inactiveCount += 1;
          }
          if (product.status === 'ARCHIVED') {
            accumulator.archivedCount += 1;
          }

          if (!accumulator.latestUpdatedAt || accumulator.latestUpdatedAt < product.updated_at) {
            accumulator.latestUpdatedAt = product.updated_at;
          }

          return accumulator;
        },
        {
          standardCount: 0,
          bundleCount: 0,
          activeCount: 0,
          draftCount: 0,
          inactiveCount: 0,
          archivedCount: 0,
          latestUpdatedAt: null as string | null,
        },
      );

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        sortOrder: project.sort_order,
        totalCount: scopedProducts.length,
        standardCount: summary.standardCount,
        bundleCount: summary.bundleCount,
        activeCount: summary.activeCount,
        draftCount: summary.draftCount,
        inactiveCount: summary.inactiveCount,
        archivedCount: summary.archivedCount,
        latestUpdatedAt: summary.latestUpdatedAt,
      };
    });

  return rows.sort((left, right) => {
    if (sortKey === 'SORT_ASC') {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.name.localeCompare(right.name, 'ko');
    }

    if (sortKey === 'PRODUCT_DESC') {
      if (left.totalCount !== right.totalCount) {
        return right.totalCount - left.totalCount;
      }
      return left.name.localeCompare(right.name, 'ko');
    }

    if (sortKey === 'NAME_ASC') {
      return left.name.localeCompare(right.name, 'ko');
    }

    if (left.latestUpdatedAt !== right.latestUpdatedAt) {
      return (right.latestUpdatedAt || '').localeCompare(left.latestUpdatedAt || '');
    }

    return left.name.localeCompare(right.name, 'ko');
  });
}

export default function V2CatalogProductsPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectFilterStatus>('ALL');
  const [sortKey, setSortKey] = useState<ProjectSortKey>('SORT_ASC');

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

  const summaryRows = useMemo(() => {
    if (!projects || !products) {
      return [];
    }

    return buildSummaryRows(projects, products, keyword, statusFilter, sortKey);
  }, [keyword, products, projects, sortKey, statusFilter]);

  if (projectsLoading || productsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="v2 상품 운영 데이터를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectsError || productsError || !projects || !products) {
    return (
      <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
        상품 운영 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="product catalog"
        title="v2 상품 관리"
        description="메인에서는 프로젝트별 상품 운영 현황을 확인하고, 프로젝트 단위 관리 화면으로 이동합니다."
        actions={
          <>
          <Badge intent="info" size="md">
            프로젝트 {projects.length}개
          </Badge>
          <Badge intent="info" size="md">
            상품 {products.length}개
          </Badge>
          <Button
            className={adminPrimaryButtonClass}
            onClick={() => router.push('/admin/v2-catalog/products/new')}
          >
            새 상품 만들기
          </Button>
          </>
        }
      />

      <AdminSurface padding="md">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-[#1a1a2e]">프로젝트 찾기</h2>
          <p className="text-sm font-medium text-[#1a1a2e]/55">
            프로젝트별 상품 수와 상태를 먼저 확인한 뒤 세부 관리 화면으로 들어갈 수 있습니다.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px_220px]">
          <Input
            placeholder="프로젝트명 또는 slug 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className={adminInputClass}
          />
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProjectFilterStatus)}
            options={[
              { value: 'ALL', label: '전체 프로젝트 상태' },
              ...PROJECT_STATUS_VALUES.map((status) => ({
                value: status,
                label: status,
              })),
            ]}
            className={adminSelectClass}
          />
          <Select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as ProjectSortKey)}
            options={[
              { value: 'SORT_ASC', label: '프로젝트 정렬순' },
              { value: 'PRODUCT_DESC', label: '상품 많은순' },
              { value: 'UPDATED_DESC', label: '최근 수정순' },
              { value: 'NAME_ASC', label: '이름순' },
            ]}
            className={adminSelectClass}
          />
        </div>
      </AdminSurface>

      <AdminSurface padding="md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#1a1a2e]">프로젝트별 상품 요약</h2>
            <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
              프로젝트를 선택하면 해당 프로젝트의 상품/옵션을 관리하는 화면으로 이동합니다.
            </p>
          </div>
          <Badge intent="info">{summaryRows.length}개 표시</Badge>
        </div>

        <div className="mt-5">
          {summaryRows.length === 0 ? (
            <EmptyState
              title="조건에 맞는 프로젝트가 없어요"
              description="검색어나 필터를 바꿔서 다시 확인해 주세요."
            />
          ) : (
            <div className={adminTableContainerClass}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className={adminTableHeadClass}>
                    <tr>
                      <th className={adminTableHeadCellClass}>프로젝트</th>
                      <th className={adminTableHeadCellClass}>상품 요약</th>
                      <th className={adminTableHeadCellClass}>상태 요약</th>
                      <th className={adminTableHeadCellClass}>최근 수정</th>
                      <th className={`${adminTableHeadCellClass} text-right`}>작업</th>
                    </tr>
                  </thead>
                  <tbody className={adminTableBodyClass}>
                    {summaryRows.map((row) => (
                      <tr key={row.id} className="transition hover:bg-[#faf9f3]">
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-[#1a1a2e]">{row.name}</p>
                            <Badge intent={resolveProjectStatusIntent(row.status)}>{row.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">/{row.slug}</p>
                        </td>
                        <td className="px-4 py-3 align-top text-xs font-medium text-[#1a1a2e]/60">
                          <p className="text-sm font-black text-[#1a1a2e]">총 {row.totalCount}개</p>
                          <p className="mt-1">
                            STANDARD {row.standardCount}개 · BUNDLE {row.bundleCount}개
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-xs font-medium text-[#1a1a2e]/60">
                          <p>ACTIVE {row.activeCount}개</p>
                          <p className="mt-1">DRAFT {row.draftCount}개</p>
                          <p className="mt-1">INACTIVE {row.inactiveCount}개 · ARCHIVED {row.archivedCount}개</p>
                        </td>
                        <td className="px-4 py-3 align-top text-xs font-medium text-[#1a1a2e]/45">
                          {formatDateTime(row.latestUpdatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <Button
                            size="sm"
                            intent="neutral"
                            className={adminButtonClass}
                            onClick={() => router.push(`/admin/v2-catalog/products/projects/${row.id}`)}
                          >
                            상품 관리
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
      </AdminSurface>
    </div>
  );
}
