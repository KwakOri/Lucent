'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type {
  V2DigitalAsset,
  V2FulfillmentType,
  V2Product,
  V2Variant,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useDeleteV2Variant,
  useV2PriceListItems,
  useV2PriceLists,
  useV2AdminVariantAssets,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { FULFILLMENT_TYPE_LABELS, VARIANT_STATUS_LABELS } from '@/lib/client/utils/v2-product-admin-form';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

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

function formatBytes(value: number | null | undefined): string {
  if (!value || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function resolveVariantStatusIntent(
  status: V2VariantStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'INACTIVE') {
    return 'info';
  }
  return 'default';
}

function resolveFulfillmentIntent(
  type: V2FulfillmentType,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (type === 'DIGITAL') {
    return 'success';
  }
  return 'info';
}

function formatOptionSummary(optionSummary: Record<string, unknown> | null): string[] {
  if (!optionSummary) {
    return [];
  }

  return Object.entries(optionSummary)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? `${key}: ${value.join(', ')}` : null;
      }
      if (value == null || value === '') {
        return null;
      }
      return `${key}: ${String(value)}`;
    })
    .filter((value): value is string => Boolean(value));
}

function formatVariantDetails(variant: V2Variant): string[] {
  if (variant.fulfillment_type === 'PHYSICAL') {
    return [
      variant.track_inventory ? '재고를 추적합니다.' : '재고 추적 없이 판매합니다.',
      variant.weight_grams != null ? `무게 ${variant.weight_grams}g` : '무게 미설정',
      '배송이 필요한 옵션입니다.',
    ];
  }

  return ['배송 없이 제공되는 디지털 옵션입니다.'];
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function getPrimaryDigitalAsset(assets: V2DigitalAsset[] | undefined): V2DigitalAsset | null {
  if (!assets || assets.length === 0) {
    return null;
  }

  return assets.find((asset) => asset.asset_role === 'PRIMARY') || assets[0] || null;
}

type VariantAudioSummaryProps = {
  variantId: string;
};

function VariantAudioSummary({ variantId }: VariantAudioSummaryProps) {
  const { data, isLoading, error } = useV2AdminVariantAssets(variantId);
  const primaryAsset = getPrimaryDigitalAsset(data);

  if (isLoading) {
    return <p className="text-xs text-gray-500">오디오 연결 정보를 확인하는 중입니다.</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600">오디오 연결 정보를 불러오지 못했습니다.</p>;
  }

  if (!primaryAsset) {
    return <p className="text-xs text-amber-700">연결된 기본 오디오가 없습니다.</p>;
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs text-blue-900">
      <p className="font-medium">오디오 연결됨</p>
      <p className="mt-1">{primaryAsset.file_name}</p>
      <p className="mt-1 text-blue-900/70">
        {formatBytes(primaryAsset.file_size)} · 상태 {primaryAsset.status}
      </p>
    </div>
  );
}

type ProductVariantManagerProps = {
  product: V2Product;
};

export function ProductVariantManager({ product }: ProductVariantManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(product.id);
  const { data: basePriceLists = [] } = useV2PriceLists({
    scopeType: 'BASE',
    status: 'PUBLISHED',
    campaignId: '',
  });
  const activeBasePriceList = useMemo(
    () =>
      [...basePriceLists].sort((left, right) =>
        right.updated_at.localeCompare(left.updated_at),
      )[0] || null,
    [basePriceLists],
  );
  const { data: basePriceItems = [], isLoading: basePriceItemsLoading } = useV2PriceListItems(
    activeBasePriceList?.id || null,
  );
  const deleteVariant = useDeleteV2Variant();

  const basePriceByVariantId = useMemo(() => {
    const map = new Map<string, number>();
    basePriceItems.forEach((item) => {
      if (
        item.status === 'ACTIVE' &&
        item.product_id === product.id &&
        item.variant_id &&
        !map.has(item.variant_id)
      ) {
        map.set(item.variant_id, item.unit_amount);
      }
    });
    return map;
  }, [basePriceItems, product.id]);

  const handleDeleteVariant = async (variantId: string, variantTitle: string) => {
    if (!window.confirm(`"${variantTitle}" 옵션을 삭제하시겠습니까?`)) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);

    try {
      await deleteVariant.mutateAsync(variantId);
      setMessage('옵션을 삭제했습니다.');
    } catch (deleteError) {
      setErrorMessage(getErrorMessage(deleteError));
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">옵션 목록</h2>
          <p className="mt-1 text-sm text-gray-500">
            옵션 현황만 빠르게 확인하고, 추가나 수정은 전용 페이지에서 진행합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge intent="info">{variants?.length || 0}개</Badge>
          <Button onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/variants/new`)}>
            옵션 추가
          </Button>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {variantsLoading && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            옵션 목록을 불러오는 중입니다.
          </div>
        )}

        {!variantsLoading && variantsError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
            옵션 목록을 불러오지 못했습니다.
          </div>
        )}

        {!variantsLoading && !variantsError && (!variants || variants.length === 0) && (
          <EmptyState
            title="아직 판매 옵션이 없어요"
            description="옵션 추가 페이지에서 첫 옵션을 만들어 보세요."
            action={
              <Button onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/variants/new`)}>
                옵션 추가
              </Button>
            }
          />
        )}

        {!variantsLoading &&
          !variantsError &&
          (variants || []).map((variant) => {
            const optionSummary = formatOptionSummary(variant.option_summary_json);
            const variantDetails = formatVariantDetails(variant);

            return (
              <div
                key={variant.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <Badge intent={resolveFulfillmentIntent(variant.fulfillment_type)}>
                        {FULFILLMENT_TYPE_LABELS[variant.fulfillment_type]}
                      </Badge>
                      <Badge intent={resolveVariantStatusIntent(variant.status)}>
                        {VARIANT_STATUS_LABELS[variant.status]}
                      </Badge>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-gray-900">{variant.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{variant.sku}</p>

                    {optionSummary.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {optionSummary.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">
                        BASE 가격:{' '}
                        {basePriceItemsLoading
                          ? '조회 중'
                          : basePriceByVariantId.has(variant.id)
                            ? formatCurrency(basePriceByVariantId.get(variant.id) || 0)
                            : '미설정'}
                      </span>
                      {variantDetails.map((detail) => (
                        <span
                          key={detail}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>

                    {variant.fulfillment_type === 'DIGITAL' && (
                      <div className="mt-4">
                        <VariantAudioSummary variantId={variant.id} />
                      </div>
                    )}

                    <p className="mt-4 text-xs text-gray-500">
                      {formatDateTime(variant.updated_at)} 수정
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      intent="neutral"
                      onClick={() =>
                        router.push(
                          `/admin/v2-catalog/products/${product.id}/variants/${variant.id}/edit`,
                        )
                      }
                    >
                      수정
                    </Button>
                    <Button
                      intent="danger"
                      loading={deleteVariant.isPending}
                      onClick={() => handleDeleteVariant(variant.id, variant.title)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
