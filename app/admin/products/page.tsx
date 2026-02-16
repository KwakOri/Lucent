'use client';

import Link from 'next/link';
import { Loading } from '@/components/ui/loading';
import { useProducts } from '@/lib/client/hooks/useProducts';
import { useProjects } from '@/lib/client/hooks/useProjects';
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
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            레이블 상품을 관리합니다
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            + 상품 등록
          </Link>
        </div>
      </div>

      <ProductsTable products={products} projects={projects || []} />
    </div>
  );
}
