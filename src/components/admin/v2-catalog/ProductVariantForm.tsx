'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type {
  V2DigitalAsset,
  V2FulfillmentType,
  V2MediaAssetUploadProgress,
  V2Product,
  V2Variant,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2DigitalAsset,
  useCreateV2Variant,
  useUpdateV2DigitalAsset,
  useUpdateV2Variant,
  useUploadV2MediaAssetFile,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  FULFILLMENT_TYPE_LABELS,
  VARIANT_STATUS_LABELS,
  buildVariantSku,
} from '@/lib/client/utils/v2-product-admin-form';
import { UploadProgressCard, type VariantUploadState } from './UploadProgressCard';

const VARIANT_STATUS_VALUES: V2VariantStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];
const FULFILLMENT_TYPE_VALUES: V2FulfillmentType[] = ['DIGITAL', 'PHYSICAL'];

type ProductVariantFormProps = {
  mode: 'create' | 'edit';
  product: V2Product;
  variant?: V2Variant | null;
  primaryAsset?: V2DigitalAsset | null;
  isAssetsLoading?: boolean;
  onCancel: () => void;
  onSuccess: () => void | Promise<void>;
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

function parseNonNegativeInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function parseNullableNonNegativeInteger(
  value: string,
  fieldName: string,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return parseNonNegativeInteger(trimmed, fieldName);
}

function isAudioFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('audio/')) {
    return true;
  }
  return /\.(mp3|wav|flac|m4a)$/i.test(file.name);
}

function getChoiceButtonClass(active: boolean): string {
  return `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
    active
      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
  }`;
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

function createIdleUploadState(fileName = ''): VariantUploadState {
  return {
    stage: 'preparing',
    fileName,
    loaded: 0,
    total: 0,
    percent: 0,
  };
}

function toUploadState(
  progress: V2MediaAssetUploadProgress,
  fileName: string,
): VariantUploadState {
  return {
    stage: progress.stage,
    fileName,
    loaded: progress.loaded,
    total: progress.total,
    percent: progress.percent,
  };
}

export function ProductVariantForm({
  mode,
  product,
  variant,
  primaryAsset,
  isAssetsLoading = false,
  onCancel,
  onSuccess,
}: ProductVariantFormProps) {
  const createVariant = useCreateV2Variant();
  const updateVariant = useUpdateV2Variant();
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const createDigitalAsset = useCreateV2DigitalAsset();
  const updateDigitalAsset = useUpdateV2DigitalAsset();

  const [title, setTitle] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<V2FulfillmentType>('DIGITAL');
  const [status, setStatus] = useState<V2VariantStatus>('DRAFT');
  const [trackInventory, setTrackInventory] = useState(false);
  const [weightGrams, setWeightGrams] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<VariantUploadState | null>(null);
  const [persistedVariantId, setPersistedVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && variant) {
      setTitle(variant.title);
      setFulfillmentType(variant.fulfillment_type);
      setStatus(variant.status);
      setTrackInventory(variant.track_inventory);
      setWeightGrams(variant.weight_grams == null ? '' : String(variant.weight_grams));
      setAudioFile(null);
      setErrorMessage(null);
      setUploadState(null);
      setPersistedVariantId(null);
      return;
    }

    setTitle('');
    setFulfillmentType('DIGITAL');
    setStatus('DRAFT');
    setTrackInventory(false);
    setWeightGrams('');
    setAudioFile(null);
    setErrorMessage(null);
    setUploadState(null);
    setPersistedVariantId(null);
  }, [mode, variant]);

  const skuPreview = useMemo(() => {
    if (mode === 'edit') {
      return variant?.sku || '';
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return '';
    }

    return buildVariantSku({
      productSlug: product.slug,
      variantTitle: trimmedTitle,
      fulfillmentType,
    });
  }, [fulfillmentType, mode, product.slug, title, variant?.sku]);

  const existingAudioName =
    primaryAsset?.file_name || primaryAsset?.media_asset?.file_name || '연결된 오디오 없음';
  const existingAudioSize =
    primaryAsset?.file_size ?? primaryAsset?.media_asset?.file_size ?? null;

  const isSubmitting =
    createVariant.isPending ||
    updateVariant.isPending ||
    uploadMediaAssetFile.isPending ||
    createDigitalAsset.isPending ||
    updateDigitalAsset.isPending;

  const handleFulfillmentTypeChange = (value: V2FulfillmentType) => {
    setFulfillmentType(value);
    if (value === 'DIGITAL') {
      setTrackInventory(false);
      setWeightGrams('');
      return;
    }
    setTrackInventory(true);
    setAudioFile(null);
    setUploadState(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setUploadState(null);
    let savedVariantId = variant?.id || persistedVariantId || null;

    try {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error('옵션 이름을 입력해 주세요.');
      }

      const nextVariantPayload = {
        title: trimmedTitle,
        fulfillment_type: fulfillmentType,
        status,
        requires_shipping: fulfillmentType === 'PHYSICAL',
        track_inventory: fulfillmentType === 'PHYSICAL' ? trackInventory : false,
        weight_grams:
          fulfillmentType === 'PHYSICAL'
            ? parseNullableNonNegativeInteger(weightGrams, '무게')
            : null,
      };

      if (mode === 'create' && persistedVariantId) {
        await updateVariant.mutateAsync({
          variantId: persistedVariantId,
          data: nextVariantPayload,
        });
        savedVariantId = persistedVariantId;
      } else if (mode === 'create') {
        const createdVariant = await createVariant.mutateAsync({
          productId: product.id,
          data: {
            ...nextVariantPayload,
            sku: buildVariantSku({
              productSlug: product.slug,
              variantTitle: trimmedTitle,
              fulfillmentType,
            }),
          },
        });
        savedVariantId = createdVariant.data.id;
        setPersistedVariantId(createdVariant.data.id);
      } else if (variant) {
        await updateVariant.mutateAsync({
          variantId: variant.id,
          data: nextVariantPayload,
        });
      }

      if (fulfillmentType === 'DIGITAL' && audioFile) {
        if (!isAudioFile(audioFile)) {
          throw new Error('오디오 파일 형식(mp3/wav/flac/m4a 또는 audio/*)만 업로드할 수 있습니다.');
        }
        if (!savedVariantId) {
          throw new Error('옵션 저장 후 오디오를 연결할 수 없습니다.');
        }

        setUploadState(createIdleUploadState(audioFile.name));
        const uploaded = await uploadMediaAssetFile.mutateAsync({
          data: {
            file: audioFile,
            asset_kind: 'AUDIO',
            status: 'ACTIVE',
            metadata: {
              source: mode === 'create' ? 'v2-variant-create-audio' : 'v2-variant-edit-audio',
            },
          },
          options: {
            onProgress: (progress) => {
              setUploadState(toUploadState(progress, audioFile.name));
            },
          },
        });

        setUploadState({
          stage: 'linking',
          fileName: audioFile.name,
          loaded: audioFile.size,
          total: audioFile.size,
          percent: 100,
        });

        const digitalAssetPayload = {
          media_asset_id: uploaded.data.id,
          file_name: audioFile.name,
          mime_type: audioFile.type || 'application/octet-stream',
          file_size: audioFile.size,
          status: status === 'ACTIVE' ? 'READY' : 'DRAFT',
          metadata: {
            source: mode === 'create' ? 'v2-variant-create-audio' : 'v2-variant-edit-audio',
          },
        } as const;

        if (primaryAsset) {
          await updateDigitalAsset.mutateAsync({
            assetId: primaryAsset.id,
            data: digitalAssetPayload,
          });
        } else {
          await createDigitalAsset.mutateAsync({
            variantId: savedVariantId,
            data: {
              asset_role: 'PRIMARY',
              ...digitalAssetPayload,
            },
          });
        }

        setUploadState({
          stage: 'complete',
          fileName: audioFile.name,
          loaded: audioFile.size,
          total: audioFile.size,
          percent: 100,
        });
      }

      await onSuccess();
    } catch (submitError) {
      const nextErrorMessage = getErrorMessage(submitError);
      if (mode === 'create' && savedVariantId) {
        setPersistedVariantId(savedVariantId);
        setErrorMessage(
          `${nextErrorMessage} 옵션은 이미 저장되어 있어 다시 제출해도 새 옵션이 추가되지는 않습니다.`,
        );
        return;
      }
      setErrorMessage(nextErrorMessage);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">기본 옵션 정보</h2>
            <p className="mt-1 text-sm text-gray-500">
              옵션 이름과 판매 방식을 정하고, 고객에게 보일 상태를 정리합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 lg:w-[280px]">
            <p className="text-sm font-medium text-gray-900">
              {mode === 'create' ? '생성될 코드' : '현재 코드'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'create'
                ? '옵션 이름을 기준으로 자동 생성됩니다.'
                : '이미 저장된 코드는 그대로 유지됩니다.'}
            </p>
            <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{skuPreview || '자동 생성 예정'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <FormField
            label="옵션 이름"
            htmlFor="variant-title"
            required
            help="구매자가 이해하기 쉬운 이름으로 유지해 주세요."
          >
            <Input
              id="variant-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 디지털 음원 세트"
              required
            />
          </FormField>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <p className="text-sm font-medium text-gray-900">상품 연결 정보</p>
            <p className="mt-1 text-sm text-gray-500">현재 작업 중인 상품에 아래 옵션이 연결됩니다.</p>
            <div className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              <p>{product.title}</p>
              <p className="text-xs text-gray-500">/shop/{product.slug}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">판매 방식</p>
              <p className="mt-1 text-sm text-gray-500">
                디지털 제공인지, 실물 배송인지 선택합니다.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {FULFILLMENT_TYPE_VALUES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFulfillmentTypeChange(type)}
                  className={getChoiceButtonClass(fulfillmentType === type)}
                >
                  <p>{FULFILLMENT_TYPE_LABELS[type]}</p>
                  <p className="mt-1 text-xs font-normal text-gray-500">
                    {type === 'DIGITAL'
                      ? '배송 없이 제공되는 옵션이에요.'
                      : '배송과 재고 관리가 필요한 옵션이에요.'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">노출 상태</p>
              <p className="mt-1 text-sm text-gray-500">고객에게 지금 보여줄지 정합니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {VARIANT_STATUS_VALUES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  intent={status === value ? 'primary' : 'neutral'}
                  onClick={() => setStatus(value)}
                >
                  {VARIANT_STATUS_LABELS[value]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {fulfillmentType === 'PHYSICAL' ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="무게 (g)"
              htmlFor="variant-weight"
              help="배송비 계산이나 출고 참고용으로 입력합니다."
            >
              <Input
                id="variant-weight"
                type="number"
                min="0"
                step="1"
                value={weightGrams}
                onChange={(event) => setWeightGrams(event.target.value)}
                placeholder="예: 180"
              />
            </FormField>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-sm font-medium text-gray-900">재고 추적</p>
              <p className="mt-1 text-sm text-gray-500">
                실물 상품은 기본으로 켜집니다. 수량 관리를 하지 않을 때만 꺼 주세요.
              </p>
              <div className="mt-4">
                <Switch
                  checked={trackInventory}
                  onChange={(event) => setTrackInventory(event.target.checked)}
                  label={
                    trackInventory
                      ? '재고를 추적합니다.'
                      : '재고를 추적하지 않습니다.'
                  }
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">오디오 파일</h2>
              <p className="mt-1 text-sm text-gray-500">
                디지털 옵션은 오디오 파일을 연결해 바로 제공할 수 있습니다.
              </p>
            </div>
            <Badge intent="info">디지털</Badge>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
            <p className="text-sm font-medium text-blue-900">
              {mode === 'create' ? '오디오 파일 업로드 (선택)' : '오디오 파일 교체 (선택)'}
            </p>
            <p className="mt-1 text-sm text-blue-800/80">
              {mode === 'create'
                ? '파일을 선택하면 옵션 저장과 함께 업로드되어 기본 디지털 에셋으로 연결됩니다.'
                : '새 파일을 선택하지 않으면 기존 오디오를 그대로 유지합니다.'}
            </p>

            {mode === 'edit' && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700">
                {isAssetsLoading ? (
                  <p>현재 연결된 오디오 정보를 불러오는 중입니다.</p>
                ) : primaryAsset ? (
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">현재 파일: {existingAudioName}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(existingAudioSize)} · 상태 {primaryAsset.status}
                    </p>
                  </div>
                ) : (
                  <p>현재 연결된 오디오가 없습니다. 새 파일을 선택하면 기본 오디오로 연결됩니다.</p>
                )}
              </div>
            )}

            <input
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.m4a"
              onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
              className="mt-4 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
            <p className="mt-2 text-xs text-gray-500">
              선택 파일: {audioFile ? `${audioFile.name} (${formatBytes(audioFile.size)})` : '없음'}
            </p>
          </div>

          {uploadState && <div className="mt-4"><UploadProgressCard state={uploadState} /></div>}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? '옵션 추가' : '옵션 저장'}
        </Button>
        <Button type="button" intent="neutral" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
