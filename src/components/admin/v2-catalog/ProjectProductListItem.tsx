'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type {
  V2Product,
  V2ProductMedia,
  V2Variant,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2ProductMedia,
  useUpdateV2ProductMedia,
  useUpdateV2Variant,
  useUploadV2MediaAssetFile,
  useV2AdminProductMedia,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  FULFILLMENT_TYPE_LABELS,
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
  VARIANT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

const DETAIL_ROLE_SET = new Set(['DETAIL', 'GALLERY']);
const VARIANT_STATUS_VALUES: V2VariantStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];

type ProjectProductListItemProps = {
  product: V2Product;
  onOpenDetail: () => void;
};

type VariantDraft = {
  title: string;
  status: V2VariantStatus;
};

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

function isImageFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
}

function sortMediaForDisplay(left: V2ProductMedia, right: V2ProductMedia): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }
  return left.created_at.localeCompare(right.created_at);
}

function getCoverMedia(mediaList: V2ProductMedia[]): V2ProductMedia | null {
  const active = mediaList.filter((media) => media.status === 'ACTIVE');
  return (
    active.find((media) => media.is_primary) ||
    active.find((media) => media.media_role === 'PRIMARY') ||
    null
  );
}

function getDetailMedia(mediaList: V2ProductMedia[], coverMediaId: string | null): V2ProductMedia[] {
  return mediaList
    .filter(
      (media) =>
        media.status === 'ACTIVE' &&
        media.id !== coverMediaId &&
        DETAIL_ROLE_SET.has(media.media_role),
    )
    .sort(sortMediaForDisplay);
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

function resolveProductStatusIntent(
  status: V2Product['status'],
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  if (status === 'INACTIVE') {
    return 'info';
  }
  return 'default';
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

function resolveKindIntent(
  kind: V2Product['product_kind'],
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (kind === 'BUNDLE') {
    return 'info';
  }
  return 'default';
}

function shouldHideVariantTitleInput(variants: V2Variant[], variant: V2Variant): boolean {
  if (variants.length !== 1) {
    return false;
  }
  return variant.title.trim().toLowerCase() === 'default';
}

export function ProjectProductListItem({
  product,
  onOpenDetail,
}: ProjectProductListItemProps) {
  const router = useRouter();
  const [isDetailMediaOpen, setIsDetailMediaOpen] = useState(false);
  const [isVariantAccordionOpen, setIsVariantAccordionOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  const { data: productMedia } = useV2AdminProductMedia(product.id);
  const {
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(isVariantAccordionOpen ? product.id : null);

  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const createProductMedia = useCreateV2ProductMedia();
  const updateProductMedia = useUpdateV2ProductMedia();
  const updateVariant = useUpdateV2Variant();

  const coverMedia = useMemo(() => getCoverMedia(productMedia || []), [productMedia]);
  const detailMedia = useMemo(
    () => getDetailMedia(productMedia || [], coverMedia?.id || null),
    [coverMedia?.id, productMedia],
  );
  const hasCover = Boolean(coverMedia?.public_url);

  const isSavingCover =
    uploadMediaAssetFile.isPending || createProductMedia.isPending || updateProductMedia.isPending;

  useEffect(() => {
    if (!variants) {
      return;
    }
    setVariantDrafts((previous) => {
      const next: Record<string, VariantDraft> = {};
      variants.forEach((variant) => {
        const previousDraft = previous[variant.id];
        next[variant.id] = {
          title: previousDraft?.title ?? variant.title,
          status: previousDraft?.status ?? variant.status,
        };
      });
      return next;
    });
  }, [variants]);

  const handleCoverImageChange = async (file: File) => {
    setMessage(null);
    setErrorMessage(null);

    if (!isImageFile(file)) {
      setErrorMessage('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      const uploaded = await uploadMediaAssetFile.mutateAsync({
        data: {
          file,
          asset_kind: 'IMAGE',
          status: 'ACTIVE',
          metadata: {
            source: 'v2-project-product-list-cover-upload',
          },
        },
      });

      if (coverMedia) {
        await updateProductMedia.mutateAsync({
          mediaId: coverMedia.id,
          data: {
            media_asset_id: uploaded.data.id,
            media_role: 'PRIMARY',
            is_primary: true,
            sort_order: 0,
            status: 'ACTIVE',
          },
        });
      } else {
        await createProductMedia.mutateAsync({
          productId: product.id,
          data: {
            media_asset_id: uploaded.data.id,
            media_role: 'PRIMARY',
            is_primary: true,
            sort_order: 0,
            status: 'ACTIVE',
          },
        });
      }

      setMessage('대표 이미지를 저장했습니다.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleVariantTitleChange = (variantId: string, value: string) => {
    setVariantDrafts((previous) => {
      const base = previous[variantId] || { title: '', status: 'DRAFT' as V2VariantStatus };
      return {
        ...previous,
        [variantId]: {
          ...base,
          title: value,
        },
      };
    });
  };

  const handleVariantStatusChange = (variantId: string, value: V2VariantStatus) => {
    setVariantDrafts((previous) => {
      const base = previous[variantId] || { title: '', status: 'DRAFT' as V2VariantStatus };
      return {
        ...previous,
        [variantId]: {
          ...base,
          status: value,
        },
      };
    });
  };

  const handleSaveVariant = async (variant: V2Variant, hideTitleInput: boolean) => {
    const draft = variantDrafts[variant.id];
    if (!draft) {
      return;
    }

    const nextTitle = hideTitleInput ? 'default' : draft.title.trim();
    if (!nextTitle) {
      setErrorMessage('옵션 이름을 입력해 주세요.');
      return;
    }

    const nextStatus = draft.status;
    const hasChanges = nextTitle !== variant.title || nextStatus !== variant.status;
    if (!hasChanges) {
      setMessage('변경된 내용이 없습니다.');
      setErrorMessage(null);
      return;
    }

    setMessage(null);
    setErrorMessage(null);
    setSavingVariantId(variant.id);

    try {
      await updateVariant.mutateAsync({
        variantId: variant.id,
        data: {
          title: nextTitle,
          status: nextStatus,
        },
      });
      setMessage('옵션 정보를 저장했습니다.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSavingVariantId(null);
    }
  };

  const coverInputId = `product-cover-upload-${product.id}`;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <input
        id={coverInputId}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
        className="hidden"
        disabled={isSavingCover}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleCoverImageChange(file);
          }
          event.target.value = '';
        }}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <label
            htmlFor={coverInputId}
            className={`group relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-200 ${
              isSavingCover ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            }`}
          >
            {hasCover ? (
              <img
                src={coverMedia?.public_url || ''}
                alt={coverMedia?.alt_text || `${product.title} 대표 이미지`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-50 text-xs text-gray-400">
                이미지 없음
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              {isSavingCover ? '업로드 중' : '변경'}
            </div>
          </label>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2">
              <h3 className="text-base font-semibold text-gray-900">{product.title}</h3>
              <Badge intent={resolveKindIntent(product.product_kind)}>
                {PRODUCT_KIND_LABELS[product.product_kind]}
              </Badge>
              <Badge intent={resolveProductStatusIntent(product.status)}>
                {PRODUCT_STATUS_LABELS[product.status]}
              </Badge>
              {product.fulfillment_type && (
                <Badge intent={product.fulfillment_type === 'DIGITAL' ? 'success' : 'info'}>
                  {FULFILLMENT_TYPE_LABELS[product.fulfillment_type]}
                </Badge>
              )}
            </div>

            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {product.short_description || '한 줄 설명이 없습니다.'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>정렬 {product.sort_order}</span>
              <span>·</span>
              <span>최근 수정 {formatDateTime(product.updated_at)}</span>
              <span>·</span>
              <button
                type="button"
                className="font-medium text-primary-700 hover:underline"
                onClick={() => setIsDetailMediaOpen((previous) => !previous)}
              >
                상세 이미지 {detailMedia.length}장
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            size="sm"
            intent="neutral"
            onClick={() => setIsVariantAccordionOpen((previous) => !previous)}
          >
            {isVariantAccordionOpen ? '옵션 접기' : '옵션 펼치기'}
          </Button>
          <Button size="sm" intent="neutral" onClick={onOpenDetail}>
            상세
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

      {isDetailMediaOpen && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          {detailMedia.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 상세 이미지가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {detailMedia.map((media) => (
                <div key={media.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {media.public_url ? (
                    <img
                      src={media.public_url}
                      alt={media.alt_text || `${product.title} 상세 이미지`}
                      className="aspect-square h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-xs text-gray-400">
                      URL 없음
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isVariantAccordionOpen && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">옵션 간단 편집</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                intent="neutral"
                onClick={() => router.push(`/admin/v2-catalog/products/${product.id}/variants/new`)}
              >
                옵션 추가
              </Button>
              <Badge intent="info">{variants?.length || 0}개</Badge>
            </div>
          </div>

          {variantsLoading && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
              옵션 목록을 불러오는 중입니다.
            </div>
          )}
          {!variantsLoading && variantsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
              옵션 목록을 불러오지 못했습니다.
            </div>
          )}
          {!variantsLoading && !variantsError && (variants || []).length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
              아직 옵션이 없습니다. 옵션 추가 버튼으로 새 옵션을 만들어 주세요.
            </div>
          )}

          {!variantsLoading && !variantsError && (variants || []).length > 0 && (
            <div className="space-y-3">
              {(variants || []).map((variant) => {
                const draft = variantDrafts[variant.id] || {
                  title: variant.title,
                  status: variant.status,
                };
                const hideTitleInput = shouldHideVariantTitleInput(variants || [], variant);
                const isSavingRow = savingVariantId === variant.id && updateVariant.isPending;

                return (
                  <div key={variant.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">옵션 이름</p>
                        {hideTitleInput ? (
                          <div className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
                            default
                          </div>
                        ) : (
                          <Input
                            value={draft.title}
                            onChange={(event) => handleVariantTitleChange(variant.id, event.target.value)}
                            placeholder="옵션 이름"
                          />
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">노출 상태</p>
                        <Select
                          value={draft.status}
                          onChange={(event) =>
                            handleVariantStatusChange(
                              variant.id,
                              event.target.value as V2VariantStatus,
                            )
                          }
                          options={VARIANT_STATUS_VALUES.map((status) => ({
                            value: status,
                            label: VARIANT_STATUS_LABELS[status],
                          }))}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => void handleSaveVariant(variant, hideTitleInput)}
                          loading={isSavingRow}
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          intent="neutral"
                          onClick={() =>
                            router.push(`/admin/v2-catalog/products/${product.id}/variants/${variant.id}/edit`)
                          }
                        >
                          상세 수정
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge intent={resolveVariantStatusIntent(variant.status)} size="sm">
                        현재 {VARIANT_STATUS_LABELS[variant.status]}
                      </Badge>
                      <span>SKU {variant.sku}</span>
                      <span>·</span>
                      <span>{FULFILLMENT_TYPE_LABELS[variant.fulfillment_type]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
