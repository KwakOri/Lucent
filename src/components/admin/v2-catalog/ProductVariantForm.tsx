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
  V2PriceList,
  V2PriceListItem,
  V2Product,
  V2Variant,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2PriceList,
  useCreateV2PriceListItem,
  useCreateV2DigitalAsset,
  useCreateV2Variant,
  usePublishV2PriceList,
  useUpdateV2PriceListItem,
  useUpdateV2DigitalAsset,
  useUpdateV2Variant,
  useV2PriceListItems,
  useV2PriceLists,
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

function pickLatestPriceList(lists: V2PriceList[]): V2PriceList | null {
  if (lists.length === 0) {
    return null;
  }
  const sorted = [...lists].sort((left, right) =>
    right.updated_at.localeCompare(left.updated_at),
  );
  return sorted[0] || null;
}

function findCurrentBasePriceItem(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string | null;
}): V2PriceListItem | null {
  if (!params.variantId) {
    return null;
  }

  const matched = params.items.filter(
    (item) =>
      item.status === 'ACTIVE' &&
      item.product_id === params.productId &&
      (item.variant_id === params.variantId || item.variant_id === null),
  );
  if (matched.length === 0) {
    return null;
  }

  const exact = matched.find((item) => item.variant_id === params.variantId);
  if (exact) {
    return exact;
  }
  return matched[0];
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
  const createPriceList = useCreateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const updatePriceListItem = useUpdateV2PriceListItem();
  const { data: basePriceLists = [] } = useV2PriceLists({
    scopeType: 'BASE',
    status: 'PUBLISHED',
    campaignId: '',
  });
  const activeBasePriceList = useMemo(
    () => pickLatestPriceList(basePriceLists),
    [basePriceLists],
  );
  const { data: activeBasePriceItems = [] } = useV2PriceListItems(
    activeBasePriceList?.id || null,
  );
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const createDigitalAsset = useCreateV2DigitalAsset();
  const updateDigitalAsset = useUpdateV2DigitalAsset();

  const [title, setTitle] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<V2FulfillmentType>('DIGITAL');
  const [status, setStatus] = useState<V2VariantStatus>('DRAFT');
  const [trackInventory, setTrackInventory] = useState(false);
  const [weightGrams, setWeightGrams] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<VariantUploadState | null>(null);
  const [persistedVariantId, setPersistedVariantId] = useState<string | null>(null);
  const [persistedBasePriceItemId, setPersistedBasePriceItemId] = useState<string | null>(null);
  const [abortUpload, setAbortUpload] = useState<(() => void) | null>(null);
  const lockedFulfillmentType =
    product.product_kind === 'STANDARD' ? product.fulfillment_type : null;
  const isFulfillmentLocked = Boolean(lockedFulfillmentType);

  const currentBasePriceItem = useMemo(
    () =>
      findCurrentBasePriceItem({
        items: activeBasePriceItems,
        productId: product.id,
        variantId: variant?.id || persistedVariantId,
      }),
    [activeBasePriceItems, persistedVariantId, product.id, variant?.id],
  );

  useEffect(() => {
    if (mode === 'edit' && variant) {
      setTitle(variant.title);
      setFulfillmentType(lockedFulfillmentType || variant.fulfillment_type);
      setStatus(variant.status);
      setTrackInventory(variant.track_inventory);
      setWeightGrams(variant.weight_grams == null ? '' : String(variant.weight_grams));
      setAudioFile(null);
      setErrorMessage(null);
      setUploadState(null);
      setPersistedVariantId(null);
      setPersistedBasePriceItemId(null);
      setAbortUpload(null);
      return;
    }

    setTitle('');
    setFulfillmentType(lockedFulfillmentType || 'DIGITAL');
    setStatus('DRAFT');
    setTrackInventory(false);
    setWeightGrams('');
    setBasePrice('');
    setAudioFile(null);
    setErrorMessage(null);
    setUploadState(null);
    setPersistedVariantId(null);
    setPersistedBasePriceItemId(null);
    setAbortUpload(null);
  }, [lockedFulfillmentType, mode, variant]);

  useEffect(() => {
    if (mode !== 'edit' || !variant) {
      return;
    }
    setBasePrice(
      currentBasePriceItem?.unit_amount == null
        ? ''
        : String(currentBasePriceItem.unit_amount),
    );
    setPersistedBasePriceItemId(currentBasePriceItem?.id || null);
  }, [currentBasePriceItem, mode, variant]);

  const existingAudioName =
    primaryAsset?.file_name || primaryAsset?.media_asset?.file_name || '연결된 오디오 없음';
  const existingAudioSize =
    primaryAsset?.file_size ?? primaryAsset?.media_asset?.file_size ?? null;

  const isSubmitting =
    createVariant.isPending ||
    updateVariant.isPending ||
    createPriceList.isPending ||
    publishPriceList.isPending ||
    createPriceListItem.isPending ||
    updatePriceListItem.isPending ||
    uploadMediaAssetFile.isPending ||
    createDigitalAsset.isPending ||
    updateDigitalAsset.isPending;

  const handleFulfillmentTypeChange = (value: V2FulfillmentType) => {
    if (isFulfillmentLocked) {
      return;
    }
    setFulfillmentType(value);
    if (value === 'DIGITAL') {
      setTrackInventory(false);
      setWeightGrams('');
      return;
    }
    setTrackInventory(true);
    setAudioFile(null);
    setUploadState(null);
    setAbortUpload(null);
  };

  const submitVariantForm = async () => {
    setErrorMessage(null);
    setUploadState(null);
    setAbortUpload(null);
    let savedVariantId = variant?.id || persistedVariantId || null;

    try {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error('옵션 이름을 입력해 주세요.');
      }
      const resolvedFulfillmentType = lockedFulfillmentType || fulfillmentType;
      if (!resolvedFulfillmentType) {
        throw new Error('상품 제공 방식이 설정되어 있지 않습니다. 상품 정보를 먼저 확인해 주세요.');
      }

      const nextVariantPayload = {
        title: trimmedTitle,
        fulfillment_type: resolvedFulfillmentType,
        status,
        requires_shipping: resolvedFulfillmentType === 'PHYSICAL',
        track_inventory: resolvedFulfillmentType === 'PHYSICAL' ? trackInventory : false,
        weight_grams:
          resolvedFulfillmentType === 'PHYSICAL'
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
              fulfillmentType: resolvedFulfillmentType,
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

      const parsedBasePrice = parseNonNegativeInteger(basePrice, 'BASE 가격');
      if (!savedVariantId) {
        throw new Error('옵션 저장 후 BASE 가격을 연결할 수 없습니다.');
      }

      let targetBasePriceList = activeBasePriceList;
      if (!targetBasePriceList) {
        const createdBasePriceList = await createPriceList.mutateAsync({
          name: '기본 판매가 (KRW)',
          scope_type: 'BASE',
          status: 'DRAFT',
          currency_code: 'KRW',
        });
        const publishedBasePriceList = await publishPriceList.mutateAsync(
          createdBasePriceList.data.id,
        );
        targetBasePriceList = publishedBasePriceList.data;
      }

      if (!targetBasePriceList) {
        throw new Error('BASE 가격표를 준비하지 못했습니다.');
      }

      const existingBasePriceItem = persistedBasePriceItemId
        ? { id: persistedBasePriceItemId }
        : findCurrentBasePriceItem({
            items: activeBasePriceItems,
            productId: product.id,
            variantId: savedVariantId,
          });

      if (existingBasePriceItem) {
        const updatedBasePriceItem = await updatePriceListItem.mutateAsync({
          itemId: existingBasePriceItem.id,
          data: {
            product_id: product.id,
            variant_id: savedVariantId,
            status: 'ACTIVE',
            unit_amount: parsedBasePrice,
            compare_at_amount: null,
          },
        });
        setPersistedBasePriceItemId(updatedBasePriceItem.data.id);
      } else {
        const createdBasePriceItem = await createPriceListItem.mutateAsync({
          priceListId: targetBasePriceList.id,
          data: {
            product_id: product.id,
            variant_id: savedVariantId,
            status: 'ACTIVE',
            unit_amount: parsedBasePrice,
            compare_at_amount: null,
          },
        });
        setPersistedBasePriceItemId(createdBasePriceItem.data.id);
      }

      if (resolvedFulfillmentType === 'DIGITAL' && audioFile) {
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
            onAbortReady: (nextAbortUpload) => {
              setAbortUpload(() => nextAbortUpload);
            },
          },
        });
        setAbortUpload(null);

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

      setAbortUpload(null);
      await onSuccess();
    } catch (submitError) {
      setAbortUpload(null);
      const maybeUploadError = submitError as { code?: string; message?: string };
      if (maybeUploadError.code === 'UPLOAD_ABORTED') {
        if (mode === 'create' && savedVariantId) {
          setPersistedVariantId(savedVariantId);
          setErrorMessage(
            '오디오 업로드를 취소했습니다. 옵션은 이미 저장되어 있으니 같은 옵션에 다시 업로드할 수 있습니다.',
          );
          return;
        }
        setErrorMessage('오디오 업로드를 취소했습니다. 다시 시도하거나 파일을 바꿀 수 있습니다.');
        return;
      }

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitVariantForm();
  };

  const handleRetryUpload = async () => {
    if (!audioFile || isSubmitting) {
      return;
    }
    await submitVariantForm();
  };

  const handleCancelUpload = () => {
    if (!abortUpload) {
      return;
    }
    abortUpload();
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
            <h2 className="text-lg font-semibold text-gray-900">옵션 기본 설정</h2>
            <p className="mt-1 text-sm text-gray-500">
              이름, 판매 방식, 노출 상태만 먼저 정리하면 나머지 설정은 아래에서 이어서 처리할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge intent={mode === 'create' ? 'info' : 'default'}>
              {mode === 'create' ? '새 옵션' : '옵션 수정'}
            </Badge>
            <Badge intent="default">{product.title}</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
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
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 lg:col-span-5">
            <p className="text-sm font-medium text-gray-900">연결 상품</p>
            <p className="mt-1 text-sm text-gray-500">선택한 상품에 이 옵션이 추가됩니다.</p>
            <p className="mt-3 text-sm font-medium text-gray-900">{product.title}</p>
            <p className="mt-1 text-xs text-gray-500">
              상품 상세 페이지에서 언제든 옵션을 추가/수정할 수 있습니다.
            </p>
          </div>

          <div className="space-y-3 lg:col-span-7">
            <div>
              <p className="text-sm font-medium text-gray-900">판매 방식</p>
              <p className="mt-1 text-sm text-gray-500">
                디지털 제공인지, 실물 배송인지 선택합니다.
              </p>
            </div>
            {isFulfillmentLocked && lockedFulfillmentType ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                <p className="text-sm font-semibold text-blue-900">
                  {FULFILLMENT_TYPE_LABELS[lockedFulfillmentType]}
                </p>
                <p className="mt-1 text-sm text-blue-800/80">
                  STANDARD 상품은 상품 정보에서 정한 제공 방식으로 모든 옵션이 고정됩니다.
                </p>
              </div>
            ) : (
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
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 lg:col-span-5">
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">BASE 가격</h2>
            <p className="mt-1 text-sm text-gray-500">
              이 옵션의 상시 판매 가격입니다. 캠페인이 없을 때 기본으로 노출됩니다.
            </p>
          </div>
          <Badge intent="info">필수</Badge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <FormField
            label="기본 판매가 (원)"
            htmlFor="variant-base-price"
            required
            help="정수 금액으로 입력해 주세요. 캠페인 할인은 별도 캠페인 화면에서 설정합니다."
          >
            <Input
              id="variant-base-price"
              type="number"
              min="0"
              step="1"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              placeholder="예: 30000"
              required
            />
          </FormField>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <p className="text-sm font-medium text-gray-900">현재 저장값</p>
            <p className="mt-1 text-sm text-gray-500">
              {currentBasePriceItem
                ? `${currentBasePriceItem.unit_amount.toLocaleString('ko-KR')}원`
                : '아직 저장된 BASE 가격이 없습니다.'}
            </p>
            <p className="mt-3 text-xs text-gray-500">
              옵션 저장 시 BASE price list/item이 자동으로 생성 또는 갱신됩니다.
            </p>
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

          {uploadState && (
            <div className="mt-4 space-y-3">
              <UploadProgressCard state={uploadState} />
              <div className="flex flex-wrap gap-2">
                {abortUpload && (
                  <Button type="button" intent="neutral" size="sm" onClick={handleCancelUpload}>
                    업로드 취소
                  </Button>
                )}
                {!abortUpload && audioFile && errorMessage && (
                  <Button type="button" intent="neutral" size="sm" onClick={handleRetryUpload}>
                    업로드 다시 시도
                  </Button>
                )}
              </div>
            </div>
          )}

          {!uploadState && audioFile && errorMessage && (
            <div className="mt-4">
              <Button type="button" intent="neutral" size="sm" onClick={handleRetryUpload}>
                업로드 다시 시도
              </Button>
            </div>
          )}
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
