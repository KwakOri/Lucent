'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          옵션 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/products/${productId}`)}>
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">옵션 수정</h1>
          <p className="mt-1 text-sm text-gray-500">
            옵션 정보와 연결된 오디오 파일을 별도 페이지에서 수정합니다. 판매 가격은 캠페인 화면에서 관리합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push(`/admin/v2-catalog/products/${productId}`)}>
            상세로 돌아가기
          </Button>
        </div>
      </div>

      <ProductVariantForm
        mode="edit"
        product={product}
        variant={variant}
        primaryAsset={primaryAsset}
        isAssetsLoading={assetsLoading}
        onCancel={() => router.push(`/admin/v2-catalog/products/${productId}`)}
        onSuccess={() => router.push(`/admin/v2-catalog/products/${productId}`)}
      />
    </div>
  );
}
