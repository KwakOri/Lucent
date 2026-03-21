'use client';

import { Loading } from '@/components/ui/loading';
import { useProjects } from '@/lib/client/hooks/useProjects';
import { ProductForm } from '@/src/components/admin/products/ProductForm';

export default function NewProductPage() {
  const { data: projects, isLoading, error } = useProjects({
    isActive: 'all',
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">프로젝트 목록을 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">상품 등록</h1>
        <p className="mt-1 text-sm text-gray-500">새로운 상품을 등록합니다</p>
      </div>

      <ProductForm projects={projects || []} />
    </div>
  );
}
