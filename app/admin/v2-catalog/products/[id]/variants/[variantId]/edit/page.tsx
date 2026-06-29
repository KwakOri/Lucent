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
import {
  useV2AdminProduct,
  useV2AdminVariantAssets,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';

function getPrimaryAsset<T extends { asset_role: string }>(assets: T[] | undefined): T | null {
  if (!assets || assets.length === 0) {
    return null;
  }

  return assets.find((asset) => asset.asset_role === 'PRIMARY') || assets[0] || null;
}

export default function V2CatalogProductVariantEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string; variantId: string }>();

  const productId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const variantId = useMemo(() => {
    const raw = params?.variantId;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: product, isLoading: productLoading, error: productError } = useV2AdminProduct(productId);
  const {
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(productId);

  const variant = useMemo(
    () => (variants || []).find((item) => item.id === variantId) || null,
    [variantId, variants],
  );

  const {
    data: assets,
    isLoading: assetsLoading,
  } = useV2AdminVariantAssets(variant?.id || null);

  const primaryAsset = useMemo(() => getPrimaryAsset(assets), [assets]);

  if (productLoading || variantsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="옵션 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (productError || variantsError || !product || !variant) {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          옵션 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/products/${productId}`)}>
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="product option"
        title="옵션 수정"
        description="옵션 정보와 기본 판매가를 수정합니다. 캠페인 할인/특가는 캠페인 화면에서 관리합니다."
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/products/${productId}`)}>
            상세로 돌아가기
          </Button>
        }
      />

      <ProductVariantForm
        mode="edit"
        product={product}
        variant={variant}
        variantCount={variants?.length || 0}
        primaryAsset={primaryAsset}
        isAssetsLoading={assetsLoading}
        onCancel={() => router.push(`/admin/v2-catalog/products/${productId}`)}
        onSuccess={() => router.push(`/admin/v2-catalog/products/${productId}`)}
      />
    </div>
  );
}
