'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  adminButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
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
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          상품 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push('/admin/v2-catalog/products')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="product option"
        title="옵션 추가"
        description="옵션 정보와 기본 판매가를 등록합니다. 캠페인 할인/특가는 캠페인 화면에서 관리합니다."
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/products/${productId}`)}>
            상세로 돌아가기
          </Button>
        }
      />

      <ProductVariantForm
        mode="create"
        product={product}
        onCancel={() => router.push(`/admin/v2-catalog/products/${productId}`)}
        onSuccess={() => router.push(`/admin/v2-catalog/products/${productId}`)}
      />
    </div>
  );
}
