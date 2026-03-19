'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { ProductVariantForm } from '@/src/components/admin/v2-catalog/ProductVariantForm';
import { useV2AdminProduct } from '@/lib/client/hooks/useV2CatalogAdmin';

export default function V2CatalogProductVariantCreatePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const productId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: product, isLoading, error } = useV2AdminProduct(productId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || !product) {
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
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">옵션 추가</h1>
          <p className="mt-1 text-sm text-gray-500">
            옵션 정보, BASE 가격, 오디오 파일을 한 번에 등록한 뒤 상세 화면으로 돌아갑니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/products/${productId}`)}>
            상세로 돌아가기
          </Button>
        </div>
      </div>

      <ProductVariantForm
        mode="create"
        product={product}
        onCancel={() => router.push(`/admin/v2-catalog/products/${productId}`)}
        onSuccess={() => router.push(`/admin/v2-catalog/products/${productId}`)}
      />
    </div>
  );
}
