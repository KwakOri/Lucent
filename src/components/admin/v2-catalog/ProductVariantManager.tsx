'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
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
  useV2AdminVariantAssets,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { useAdminFeedback } from '@/src/components/admin/AdminFeedback';
import { FULFILLMENT_TYPE_LABELS, VARIANT_STATUS_LABELS } from '@/lib/client/utils/v2-product-admin-form';
import { ProductVariantForm } from './ProductVariantForm';

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

function formatVariantDetails(product: V2Product, variant: V2Variant): string[] {
  if (product.product_kind === 'BUNDLE') {
    return ['구성 상품 옵션 기준으로 이행 방식이 자동 계산됩니다.'];
  }

  if (variant.fulfillment_type === 'PHYSICAL') {
    return [
      variant.track_inventory
        ? '재고를 추적합니다. 수량은 옵션 수정 화면에서 관리합니다.'
        : '재고 추적 없이 판매합니다.',
      variant.weight_grams != null ? `무게 ${variant.weight_grams}g` : '무게 미설정',
      '배송이 필요한 옵션입니다.',
    ];
  }

  return ['배송 없이 제공되는 디지털 옵션입니다.'];
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
    <div className="rounded-[12px] border border-[#cde0f3] bg-[#f0f7ff] px-3 py-3 text-xs text-[#4a88b9]">
      <p className="font-medium">오디오 연결됨</p>
      <p className="mt-1">{primaryAsset.file_name}</p>
      <p className="mt-1 text-[#4a88b9]/70">
        {formatBytes(primaryAsset.file_size)} · 상태 {primaryAsset.status}
      </p>
    </div>
  );
}

type VariantInlineEditPanelProps = {
  product: V2Product;
  variant: V2Variant;
  variantCount: number;
  compact?: boolean;
  hideActions?: boolean;
  registerSaveHandler?: (handler: (() => Promise<boolean>) | null) => void;
  onCancel: () => void;
  onSuccess: () => void;
};

function VariantInlineEditPanel({
  product,
  variant,
  variantCount,
  compact = false,
  hideActions = false,
  registerSaveHandler,
  onCancel,
  onSuccess,
}: VariantInlineEditPanelProps) {
  const {
    data: assets,
    isLoading: assetsLoading,
  } = useV2AdminVariantAssets(variant.id);
  const primaryAsset = getPrimaryDigitalAsset(assets);

  return (
    <div className={compact ? 'mt-5' : 'mt-5 border-t border-[#f1eee2] pt-5'}>
      <ProductVariantForm
        mode="edit"
        product={product}
        variant={variant}
        variantCount={variantCount}
        primaryAsset={primaryAsset}
        isAssetsLoading={assetsLoading}
        compact={compact}
        hideActions={hideActions}
        registerSaveHandler={registerSaveHandler}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    </div>
  );
}

type ProductVariantManagerProps = {
  product: V2Product;
  registerSaveHandler?: (handler: (() => Promise<boolean>) | null) => void;
};

const sectionClassName =
  'rounded-[20px] border border-[#e7e3d3] bg-white p-5 shadow-none sm:p-6';
const addButtonClassName =
  '!h-10 !rounded-[12px] !bg-[#1a1a2e] !px-4 !text-sm !font-bold !text-white hover:!bg-[#272743]';

export function ProductVariantManager({
  product,
  registerSaveHandler,
}: ProductVariantManagerProps) {
  const router = useRouter();
  const { confirm } = useAdminFeedback();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);

  const {
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(product.id);
  const deleteVariant = useDeleteV2Variant();
  const variantList = variants || [];
  const isSingleVariant = variantList.length === 1;

  const handleDeleteVariant = async (variantId: string, variantTitle: string) => {
    const confirmed = await confirm({
      title: '옵션 삭제',
      message: `"${variantTitle}" 옵션을 삭제하시겠습니까?`,
      description: '옵션과 연결된 디지털/이행 데이터에 영향이 있을 수 있습니다.',
      confirmText: '삭제',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);

    try {
      await deleteVariant.mutateAsync({
        variantId,
        productId: product.id,
      });
      setExpandedVariantId((current) => (current === variantId ? null : current));
      setMessage('옵션을 삭제했습니다.');
    } catch (deleteError) {
      setErrorMessage(getErrorMessage(deleteError));
    }
  };

  const handleToggleVariant = (variantId: string) => {
    setMessage(null);
    setErrorMessage(null);
    setExpandedVariantId((current) => (current === variantId ? null : variantId));
  };

  const handleInlineEditSuccess = () => {
    setExpandedVariantId(null);
    setErrorMessage(null);
    setMessage('옵션을 저장했습니다.');
  };

  return (
    <section className={sectionClassName}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#1a1a2e]">
            {isSingleVariant ? '판매 옵션' : '옵션 목록'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            intent="info"
            className={`rounded-[8px] border px-3 py-1 text-xs font-bold ${
              isSingleVariant
                ? 'border-[#eee7d6] bg-[#f5f3e8] text-[#9b9788]'
                : 'border-[#cde0f3] bg-[#eaf3fc] text-[#4a88b9]'
            }`}
          >
            {isSingleVariant ? '단일 옵션' : `${variantList.length}개`}
          </Badge>
          <Button
            className={addButtonClassName}
            onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/variants/new`)}
          >
            <Plus className="h-4 w-4" aria-hidden />
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
          <div className="rounded-[14px] border border-[#eee7d6] bg-[#faf9f3] px-4 py-8 text-center text-sm text-[#1a1a2e]/55">
            옵션 목록을 불러오는 중입니다.
          </div>
        )}

        {!variantsLoading && variantsError && (
          <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
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
          isSingleVariant &&
          variantList[0] && (
            <VariantInlineEditPanel
              compact
              product={product}
              variant={variantList[0]}
              variantCount={variantList.length}
              hideActions={Boolean(registerSaveHandler)}
              registerSaveHandler={registerSaveHandler}
              onCancel={() => undefined}
              onSuccess={handleInlineEditSuccess}
            />
          )}

        {!variantsLoading &&
          !variantsError &&
          !isSingleVariant &&
          variantList.map((variant) => {
            const optionSummary = formatOptionSummary(variant.option_summary_json);
            const variantDetails = formatVariantDetails(product, variant);
            const isExpanded = expandedVariantId === variant.id;

            return (
              <div
                key={variant.id}
                className="rounded-[16px] border border-[#e7e3d3] bg-white p-4 transition hover:border-[#d9d4c3]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {product.product_kind === 'BUNDLE' ? (
                        <Badge intent="default">구성 기준</Badge>
                      ) : (
                        <Badge intent={resolveFulfillmentIntent(variant.fulfillment_type)}>
                          {FULFILLMENT_TYPE_LABELS[variant.fulfillment_type]}
                        </Badge>
                      )}
                      <Badge intent={resolveVariantStatusIntent(variant.status)}>
                        {VARIANT_STATUS_LABELS[variant.status]}
                      </Badge>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-gray-900">{variant.title}</h3>

                    {optionSummary.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {optionSummary.map((item) => (
                          <span
                            key={item}
                            className="rounded-[8px] bg-[#f5f3e8] px-3 py-1 text-xs font-bold text-[#6f6a5e]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {variantDetails.map((detail) => (
                        <span
                          key={detail}
                          className="rounded-[8px] border border-[#e7e3d3] px-3 py-1 text-xs font-medium text-[#1a1a2e]/60"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>

                    {product.product_kind !== 'BUNDLE' && variant.fulfillment_type === 'DIGITAL' && (
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
                      intent={isExpanded ? 'secondary' : 'neutral'}
                      className="!rounded-[10px] !border-0 !bg-[#f5f3e8] !px-4 !text-sm !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]"
                      onClick={() => handleToggleVariant(variant.id)}
                    >
                      {isExpanded ? '접기' : '펼치기'}
                    </Button>
                    <Button
                      intent="danger"
                      className="!rounded-[10px] !border !border-[#f3d6d6] !bg-white !px-3 !text-[#ca2a30] hover:!bg-[#fff0f0]"
                      loading={deleteVariant.isPending}
                      onClick={() => handleDeleteVariant(variant.id, variant.title)}
                      aria-label={`${variant.title} 옵션 삭제`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      삭제
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <VariantInlineEditPanel
                    product={product}
                    variant={variant}
                    variantCount={variants?.length || 0}
                    hideActions={Boolean(registerSaveHandler)}
                    registerSaveHandler={registerSaveHandler}
                    onCancel={() => setExpandedVariantId(null)}
                    onSuccess={handleInlineEditSuccess}
                  />
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}
