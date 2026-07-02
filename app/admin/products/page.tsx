'use client';

import Link from 'next/link';
import { Loading } from '@/components/ui/loading';
import { useProducts } from '@/lib/client/hooks/useProducts';
import { useProjects } from '@/lib/client/hooks/useProjects';
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
  adminPrimaryButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ProductsTable } from '@/src/components/admin/products/ProductsTable';

export default function AdminProductsPage() {
  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    error: productsError,
  } = useProducts({
    page: 1,
    limit: 200,
    isActive: 'all',
  });
  const {
    data: projects,
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useProjects({ isActive: 'all' });

  if (isProductsLoading || isProjectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (productsError || projectsError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">상품 목록을 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  const products = productsResponse?.data || [];

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="legacy"
        title="상품 관리"
        description="레이블 상품을 관리합니다."
        actions={
          <Link
            href="/admin/products/new"
            className={adminPrimaryButtonClass}
          >
            + 상품 등록
          </Link>
        }
      />

      <ProductsTable products={products} projects={projects || []} />
    </div>
  );
}
