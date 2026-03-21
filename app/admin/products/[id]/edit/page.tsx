'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Loading } from '@/components/ui/loading';
import { ProductsAPI } from '@/lib/client/api/products.api';
import { useProjects } from '@/lib/client/hooks/useProjects';
import { ProductForm } from '@/src/components/admin/products/ProductForm';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const {
    data: product,
    isLoading: isProductLoading,
    error: productError,
  } = useQuery({
    queryKey: ['products', 'admin', params.id],
    queryFn: async () => {
      const response = await ProductsAPI.getProduct(params.id, {
        includePrivate: true,
      });
      return response.data;
    },
  });
  const {
    data: projects,
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useProjects({ isActive: 'all' });

  if (isProductLoading || isProjectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (productError || projectsError || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">상품 정보를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">상품 수정</h1>
        <p className="mt-1 text-sm text-gray-500">
          {product.name} 정보를 수정합니다
        </p>
      </div>

      <ProductForm projects={projects || []} product={product} />
    </div>
  );
}
