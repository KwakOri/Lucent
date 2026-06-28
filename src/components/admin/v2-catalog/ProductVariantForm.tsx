'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileArchive, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
  V2DigitalAsset,
  V2FulfillmentType,
  V2MediaAssetKind,
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
  useCreateExternalV2MediaAsset,
  useCreateV2Variant,
  usePublishV2PriceList,
  useUpdateV2PriceListItem,
  useUpdateV2DigitalAsset,
  useUpdateV2Variant,
  useUploadV2MediaAssetFile,
  useV2Campaigns,
  useV2PriceListItems,
  useV2PriceLists,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { queryKeys } from '@/lib/client/hooks/query-keys';
import {
  useV2AdminInventoryLevels,
  useV2AdminStockLocations,
  useV2AdminUpsertInventoryLevel,
} from '@/lib/client/hooks/useV2AdminOps';
import {
  DEFAULT_VARIANT_STATUS,
  FULFILLMENT_TYPE_LABELS,
  VARIANT_STATUS_LABELS,
  buildVariantSku,
} from '@/lib/client/utils/v2-product-admin-form';
import { UploadProgressCard, type VariantUploadState } from './UploadProgressCard';

const VARIANT_STATUS_VALUES: V2VariantStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];
const FULFILLMENT_TYPE_VALUES: V2FulfillmentType[] = ['DIGITAL', 'PHYSICAL'];
const DIGITAL_FILE_ACCEPT = 'audio/*,.mp3,.wav,.flac,.m4a,.zip,application/zip,application/x-zip-compressed';

type VariantSaveHandler = () => Promise<boolean>;
type DigitalAssetInputMode = 'FILE' | 'LINK';

type ProductVariantFormProps = {
  mode: 'create' | 'edit';
  product: V2Product;
  variant?: V2Variant | null;
  variantCount?: number;
  primaryAsset?: V2DigitalAsset | null;
  isAssetsLoading?: boolean;
  hideActions?: boolean;
  registerSaveHandler?: (handler: VariantSaveHandler | null) => void;
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

function parseOptionalBasePrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return parseNonNegativeInteger(trimmed, '기본 판매가');
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

function isZipFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  return (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    /\.zip$/i.test(file.name)
  );
}

function isSupportedDigitalFile(file: File): boolean {
  return isAudioFile(file) || isZipFile(file);
}

function inferDigitalFileAssetKind(file: File): V2MediaAssetKind {
  if (isZipFile(file)) {
    return 'ARCHIVE';
  }
  return 'AUDIO';
}

function inferDigitalFileMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }
  if (isZipFile(file)) {
    return 'application/zip';
  }
  if (/\.mp3$/i.test(file.name)) {
    return 'audio/mpeg';
  }
  if (/\.wav$/i.test(file.name)) {
    return 'audio/wav';
  }
  if (/\.flac$/i.test(file.name)) {
    return 'audio/flac';
  }
  if (/\.m4a$/i.test(file.name)) {
    return 'audio/mp4';
  }
  return 'application/octet-stream';
}

function inferExternalLinkAssetKind(url: string, fileName: string): V2MediaAssetKind {
  const target = `${fileName} ${url}`;
  if (/\.zip(?:$|[?#\s])/i.test(target)) {
    return 'ARCHIVE';
  }
  return 'FILE';
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function getChoiceButtonClass(active: boolean): string {
  return `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
    active
      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
  }`;
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function pickLatestPriceList(lists: V2PriceList[]): V2PriceList | null {
  if (lists.length === 0) {
    return null;
  }
  return [...lists].sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0] || null;
}

function pickBestActivePriceItem(items: V2PriceListItem[]): V2PriceListItem | null {
  const activeItems = items.filter((item) => item.status === 'ACTIVE');
  if (activeItems.length === 0) {
    return null;
  }
  return [...activeItems].sort((left, right) => right.created_at.localeCompare(left.created_at))[0] || null;
}

function findExactVariantPriceItem(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string | null;
}): V2PriceListItem | null {
  if (!params.variantId) {
    return null;
  }
  return pickBestActivePriceItem(
    params.items.filter(
      (item) => item.product_id === params.productId && item.variant_id === params.variantId,
    ),
  );
}

function findResolvedVariantPriceItem(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string | null;
}): V2PriceListItem | null {
  const exact = findExactVariantPriceItem(params);
  if (exact) {
    return exact;
  }
  return pickBestActivePriceItem(
    params.items.filter(
      (item) => item.product_id === params.productId && item.variant_id === null,
    ),
  );
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
  variantCount = 0,
  primaryAsset,
  isAssetsLoading = false,
  hideActions = false,
  registerSaveHandler,
  onCancel,
  onSuccess,
}: ProductVariantFormProps) {
  const queryClient = useQueryClient();
  const createVariant = useCreateV2Variant();
  const updateVariant = useUpdateV2Variant();
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const createExternalMediaAsset = useCreateExternalV2MediaAsset();
  const createDigitalAsset = useCreateV2DigitalAsset();
  const updateDigitalAsset = useUpdateV2DigitalAsset();
  const upsertInventoryLevel = useV2AdminUpsertInventoryLevel();
  const createPriceList = useCreateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const updatePriceListItem = useUpdateV2PriceListItem();

  const [title, setTitle] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<V2FulfillmentType>('DIGITAL');
  const [status, setStatus] = useState<V2VariantStatus>(DEFAULT_VARIANT_STATUS);
  const [basePrice, setBasePrice] = useState('');
  const [basePriceTouched, setBasePriceTouched] = useState(false);
  const [trackInventory, setTrackInventory] = useState(false);
  const [weightGrams, setWeightGrams] = useState('');
  const [inventoryLocationId, setInventoryLocationId] = useState('');
  const [inventoryOnHandQuantity, setInventoryOnHandQuantity] = useState('');
  const [inventorySafetyStockQuantity, setInventorySafetyStockQuantity] = useState('');
  const [digitalAssetInputMode, setDigitalAssetInputMode] =
    useState<DigitalAssetInputMode>('FILE');
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [digitalLinkUrl, setDigitalLinkUrl] = useState('');
  const [digitalLinkFileName, setDigitalLinkFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<VariantUploadState | null>(null);
  const [persistedVariantId, setPersistedVariantId] = useState<string | null>(null);
  const [abortUpload, setAbortUpload] = useState<(() => void) | null>(null);
  const isBundleProduct = product.product_kind === 'BUNDLE';
  const lockedFulfillmentType =
    product.product_kind === 'STANDARD' ? product.fulfillment_type : null;
  const isFulfillmentLocked = Boolean(lockedFulfillmentType);
  const canEditFulfillmentType = !isFulfillmentLocked && !isBundleProduct;
  const isSingleDefaultVariant =
    mode === 'edit' &&
    variantCount === 1 &&
    (variant?.title || '').trim().toLowerCase() === 'default';
  const currentVariantId = variant?.id || persistedVariantId || null;

  const { data: stockLocations, isLoading: stockLocationsLoading } = useV2AdminStockLocations();
  const { data: inventoryLevels, isLoading: inventoryLevelsLoading } = useV2AdminInventoryLevels(
    mode === 'edit' && variant?.id
      ? { variant_id: variant.id }
      : mode === 'create' && persistedVariantId
        ? { variant_id: persistedVariantId }
        : null,
  );
  const {
    data: alwaysOnCampaigns,
    isLoading: alwaysOnCampaignsLoading,
  } = useV2Campaigns({ campaignType: 'ALWAYS_ON' });
  const projectBaseCampaign = useMemo(() => {
    const matchingCampaigns = (alwaysOnCampaigns || []).filter(
      (campaign) =>
        campaign.project_id === product.project_id &&
        campaign.campaign_type === 'ALWAYS_ON' &&
        campaign.status !== 'ARCHIVED',
    );

    if (matchingCampaigns.length === 0) {
      return null;
    }

    return [...matchingCampaigns].sort((left, right) => {
      const activeDiff = Number(right.status === 'ACTIVE') - Number(left.status === 'ACTIVE');
      if (activeDiff !== 0) {
        return activeDiff;
      }
      return right.updated_at.localeCompare(left.updated_at);
    })[0] || null;
  }, [alwaysOnCampaigns, product.project_id]);
  const { data: basePriceLists, isLoading: basePriceListsLoading } = useV2PriceLists({
    campaignId: projectBaseCampaign?.id,
    scopeType: 'BASE',
  });
  const activeBasePriceList = useMemo(
    () => (projectBaseCampaign ? pickLatestPriceList(basePriceLists || []) : null),
    [basePriceLists, projectBaseCampaign],
  );
  const basePriceListRef = useRef<V2PriceList | null>(null);
  const {
    data: basePriceItems,
    isLoading: basePriceItemsLoading,
  } = useV2PriceListItems(activeBasePriceList?.id || null);
  const exactBasePriceItem = useMemo(
    () =>
      findExactVariantPriceItem({
        items: basePriceItems || [],
        productId: product.id,
        variantId: currentVariantId,
      }),
    [basePriceItems, currentVariantId, product.id],
  );
  const currentBasePriceItem = useMemo(
    () =>
      findResolvedVariantPriceItem({
        items: basePriceItems || [],
        productId: product.id,
        variantId: currentVariantId,
      }),
    [basePriceItems, currentVariantId, product.id],
  );
  const isUsingInheritedBasePrice =
    Boolean(currentBasePriceItem) && currentBasePriceItem?.id !== exactBasePriceItem?.id;
  const isBasePricingLoading =
    alwaysOnCampaignsLoading ||
    (Boolean(projectBaseCampaign) && (basePriceListsLoading || basePriceItemsLoading));

  useEffect(() => {
    basePriceListRef.current = activeBasePriceList || null;
  }, [activeBasePriceList]);

  useEffect(() => {
    if (mode === 'edit' && variant) {
      setTitle(variant.title);
      setFulfillmentType(lockedFulfillmentType || variant.fulfillment_type);
      setStatus(variant.status);
      setBasePrice('');
      setBasePriceTouched(false);
      setTrackInventory(variant.track_inventory);
      setWeightGrams(variant.weight_grams == null ? '' : String(variant.weight_grams));
      setInventoryOnHandQuantity('');
      setInventorySafetyStockQuantity('');
      setDigitalAssetInputMode('FILE');
      setDigitalFile(null);
      setDigitalLinkUrl('');
      setDigitalLinkFileName('');
      setErrorMessage(null);
      setUploadState(null);
      setPersistedVariantId(null);
      setAbortUpload(null);
      return;
    }

    setTitle('');
    setFulfillmentType(lockedFulfillmentType || 'DIGITAL');
    setStatus(DEFAULT_VARIANT_STATUS);
    setBasePrice('');
    setBasePriceTouched(false);
    setTrackInventory(false);
    setWeightGrams('');
    setInventoryOnHandQuantity('');
    setInventorySafetyStockQuantity('');
    setDigitalAssetInputMode('FILE');
    setDigitalFile(null);
    setDigitalLinkUrl('');
    setDigitalLinkFileName('');
    setErrorMessage(null);
    setUploadState(null);
    setPersistedVariantId(null);
    setAbortUpload(null);
  }, [lockedFulfillmentType, mode, variant]);

  useEffect(() => {
    if (basePriceTouched) {
      return;
    }

    if (mode === 'edit' && currentBasePriceItem) {
      setBasePrice(String(currentBasePriceItem.unit_amount));
      return;
    }

    if (mode === 'edit' && !isBasePricingLoading) {
      setBasePrice('');
    }
  }, [basePriceTouched, currentBasePriceItem, isBasePricingLoading, mode]);

  useEffect(() => {
    if (!stockLocations || stockLocations.length === 0) {
      setInventoryLocationId('');
      return;
    }

    setInventoryLocationId((current) => {
      if (current && stockLocations.some((location) => location.id === current)) {
        return current;
      }
      return stockLocations[0]?.id || '';
    });
  }, [stockLocations]);

  useEffect(() => {
    if (!inventoryLevels || inventoryLevels.length === 0) {
      return;
    }
    if (inventoryOnHandQuantity !== '' || inventorySafetyStockQuantity !== '') {
      return;
    }

    const preferredLevel =
      (inventoryLocationId
        ? inventoryLevels.find((level) => level.location_id === inventoryLocationId)
        : null) || inventoryLevels[0];

    if (!preferredLevel) {
      return;
    }

    setInventoryLocationId(preferredLevel.location_id);
    setInventoryOnHandQuantity(String(preferredLevel.on_hand_quantity));
    setInventorySafetyStockQuantity(String(preferredLevel.safety_stock_quantity));
  }, [
    inventoryLevels,
    inventoryLocationId,
    inventoryOnHandQuantity,
    inventorySafetyStockQuantity,
  ]);

  const existingDigitalAssetName =
    primaryAsset?.file_name || primaryAsset?.media_asset?.file_name || '연결된 디지털 파일 없음';
  const existingDigitalAssetSize =
    primaryAsset?.file_size ?? primaryAsset?.media_asset?.file_size ?? null;
  const existingStorageProvider = primaryAsset?.media_asset?.storage_provider || null;
  const isExistingExternalLink =
    Boolean(existingStorageProvider && existingStorageProvider.toUpperCase() !== 'R2') ||
    isHttpUrl(primaryAsset?.storage_path || '');
  const existingDigitalAssetSizeLabel =
    isExistingExternalLink && (!existingDigitalAssetSize || existingDigitalAssetSize <= 1)
      ? '외부 링크'
      : formatBytes(existingDigitalAssetSize);

  const isSubmitting =
    isBasePricingLoading ||
    createVariant.isPending ||
    updateVariant.isPending ||
    createPriceList.isPending ||
    publishPriceList.isPending ||
    createPriceListItem.isPending ||
    updatePriceListItem.isPending ||
    uploadMediaAssetFile.isPending ||
    createExternalMediaAsset.isPending ||
    createDigitalAsset.isPending ||
    updateDigitalAsset.isPending ||
    upsertInventoryLevel.isPending;

  const selectedInventoryLevel =
    (inventoryLevels || []).find((level) => level.location_id === inventoryLocationId) || null;
  const hasMultipleStockLocations = (stockLocations || []).length > 1;
  const singleStockLocation = stockLocations?.[0] || null;

  const refreshPricingQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.v2CatalogAdmin.pricing.all,
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.v2Shop.all,
      }),
    ]);
  };

  const ensureBasePriceList = async (): Promise<V2PriceList> => {
    if (!projectBaseCampaign) {
      throw new Error('이 상품의 프로젝트에 연결된 기본 캠페인을 찾을 수 없습니다.');
    }

    let priceList = basePriceListRef.current || activeBasePriceList;
    if (!priceList) {
      const created = await createPriceList.mutateAsync({
        campaign_id: projectBaseCampaign.id,
        name: `${projectBaseCampaign.name} 기본 가격`,
        scope_type: 'BASE',
        status: 'DRAFT',
        currency_code: 'KRW',
        starts_at: projectBaseCampaign.starts_at,
        ends_at: projectBaseCampaign.ends_at,
        metadata: {
          source: 'v2-variant-form',
          product_id: product.id,
          project_id: product.project_id,
        },
        skipInvalidate: true,
      });
      priceList = created.data;
    }

    if (!priceList) {
      throw new Error('기본 가격표를 준비하지 못했습니다.');
    }

    basePriceListRef.current = priceList;
    return priceList;
  };

  const upsertVariantBasePrice = async (variantId: string, unitAmount: number) => {
    const priceList = await ensureBasePriceList();

    if (exactBasePriceItem) {
      await updatePriceListItem.mutateAsync({
        itemId: exactBasePriceItem.id,
        data: {
          product_id: product.id,
          variant_id: variantId,
          unit_amount: unitAmount,
          compare_at_amount: null,
          status: 'ACTIVE',
        },
        skipInvalidate: true,
      });
    } else {
      await createPriceListItem.mutateAsync({
        priceListId: priceList.id,
        data: {
          product_id: product.id,
          variant_id: variantId,
          unit_amount: unitAmount,
          compare_at_amount: null,
          status: 'ACTIVE',
          metadata: {
            source: 'v2-variant-form',
            pricing_mode: 'BASE',
          },
        },
        skipInvalidate: true,
      });
    }

    if (priceList.status !== 'PUBLISHED') {
      await publishPriceList.mutateAsync({
        id: priceList.id,
        skipInvalidate: true,
      });
      basePriceListRef.current = {
        ...priceList,
        status: 'PUBLISHED',
      };
    }

    await refreshPricingQueries();
  };

  const handleFulfillmentTypeChange = (value: V2FulfillmentType) => {
    if (!canEditFulfillmentType) {
      return;
    }
    setFulfillmentType(value);
    if (value === 'DIGITAL') {
      setTrackInventory(false);
      setWeightGrams('');
      setInventoryOnHandQuantity('');
      setInventorySafetyStockQuantity('');
      return;
    }
    setTrackInventory(true);
    setDigitalFile(null);
    setDigitalLinkUrl('');
    setDigitalLinkFileName('');
    setUploadState(null);
    setAbortUpload(null);
  };

  const handleInventoryLocationChange = (nextLocationId: string) => {
    setInventoryLocationId(nextLocationId);
    const matchedLevel = (inventoryLevels || []).find(
      (level) => level.location_id === nextLocationId,
    );
    if (!matchedLevel) {
      setInventoryOnHandQuantity('');
      setInventorySafetyStockQuantity('');
      return;
    }
    setInventoryOnHandQuantity(String(matchedLevel.on_hand_quantity));
    setInventorySafetyStockQuantity(String(matchedLevel.safety_stock_quantity));
  };

  const submitVariantForm = async (): Promise<boolean> => {
    setErrorMessage(null);
    setUploadState(null);
    setAbortUpload(null);
    let savedVariantId = variant?.id || persistedVariantId || null;

    try {
      const trimmedTitle = isSingleDefaultVariant ? 'default' : title.trim();
      if (!trimmedTitle) {
        throw new Error('옵션 이름을 입력해 주세요.');
      }
      const resolvedFulfillmentType = isBundleProduct
        ? variant?.fulfillment_type || 'PHYSICAL'
        : lockedFulfillmentType || fulfillmentType;
      if (!resolvedFulfillmentType) {
        throw new Error('상품 제공 방식이 설정되어 있지 않습니다. 상품 정보를 먼저 확인해 주세요.');
      }
      const parsedBasePrice = parseOptionalBasePrice(basePrice);
      if (status === 'ACTIVE' && parsedBasePrice === null) {
        throw new Error('판매 중 옵션은 기본 판매가를 입력해야 합니다.');
      }

      const nextVariantPayload = {
        title: trimmedTitle,
        fulfillment_type: resolvedFulfillmentType,
        status,
        requires_shipping: isBundleProduct ? false : resolvedFulfillmentType === 'PHYSICAL',
        track_inventory:
          !isBundleProduct && resolvedFulfillmentType === 'PHYSICAL' ? trackInventory : false,
        weight_grams:
          !isBundleProduct && resolvedFulfillmentType === 'PHYSICAL'
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
        savedVariantId = variant.id;
      }

      if (parsedBasePrice !== null) {
        if (!savedVariantId) {
          throw new Error('옵션 저장 후 기본 판매가를 반영할 수 없습니다.');
        }
        await upsertVariantBasePrice(savedVariantId, parsedBasePrice);
      }

      if (!isBundleProduct && resolvedFulfillmentType === 'PHYSICAL' && trackInventory) {
        if (!savedVariantId) {
          throw new Error('옵션 저장 후 재고를 반영할 수 없습니다.');
        }

        const onHandQuantity = parseNullableNonNegativeInteger(
          inventoryOnHandQuantity,
          '재고 수량',
        );
        const safetyStockQuantity = parseNullableNonNegativeInteger(
          inventorySafetyStockQuantity,
          '안전 재고',
        );

        await upsertInventoryLevel.mutateAsync({
          variant_id: savedVariantId,
          location_id: inventoryLocationId || null,
          on_hand_quantity: onHandQuantity ?? 0,
          safety_stock_quantity: safetyStockQuantity ?? 0,
          metadata: {
            source: mode === 'create' ? 'v2-variant-create-form' : 'v2-variant-edit-form',
          },
        });
      }

      if (!isBundleProduct && resolvedFulfillmentType === 'DIGITAL') {
        const persistPrimaryDigitalAsset = async (
          payload: {
            media_asset_id: string;
            file_name: string;
            mime_type: string;
            file_size: number;
            status: 'READY' | 'DRAFT';
            metadata: Record<string, unknown>;
          },
        ) => {
          if (!savedVariantId) {
            throw new Error('옵션 저장 후 디지털 파일을 연결할 수 없습니다.');
          }

          if (primaryAsset) {
            await updateDigitalAsset.mutateAsync({
              assetId: primaryAsset.id,
              data: payload,
            });
            return;
          }

          await createDigitalAsset.mutateAsync({
            variantId: savedVariantId,
            data: {
              asset_role: 'PRIMARY',
              ...payload,
            },
          });
        };

        if (digitalAssetInputMode === 'FILE' && digitalFile) {
          if (!isSupportedDigitalFile(digitalFile)) {
            throw new Error('오디오(mp3/wav/flac/m4a) 또는 zip 파일만 업로드할 수 있습니다.');
          }

          const uploadSource =
            mode === 'create' ? 'v2-variant-create-file' : 'v2-variant-edit-file';
          setUploadState(createIdleUploadState(digitalFile.name));
          const uploaded = await uploadMediaAssetFile.mutateAsync({
            data: {
              file: digitalFile,
              asset_kind: inferDigitalFileAssetKind(digitalFile),
              status: 'ACTIVE',
              metadata: {
                source: uploadSource,
                delivery_method: 'FILE',
              },
            },
            options: {
              onProgress: (progress) => {
                setUploadState(toUploadState(progress, digitalFile.name));
              },
              onAbortReady: (nextAbortUpload) => {
                setAbortUpload(() => nextAbortUpload);
              },
            },
          });
          setAbortUpload(null);

          setUploadState({
            stage: 'linking',
            fileName: digitalFile.name,
            loaded: digitalFile.size,
            total: digitalFile.size,
            percent: 100,
          });

          await persistPrimaryDigitalAsset({
            media_asset_id: uploaded.data.id,
            file_name: digitalFile.name,
            mime_type: inferDigitalFileMimeType(digitalFile),
            file_size: digitalFile.size,
            status: status === 'ACTIVE' ? 'READY' : 'DRAFT',
            metadata: {
              source: uploadSource,
              delivery_method: 'FILE',
              media_asset_kind: inferDigitalFileAssetKind(digitalFile),
            },
          });

          setUploadState({
            stage: 'complete',
            fileName: digitalFile.name,
            loaded: digitalFile.size,
            total: digitalFile.size,
            percent: 100,
          });
        }

        if (digitalAssetInputMode === 'LINK' && digitalLinkUrl.trim()) {
          if (!isHttpUrl(digitalLinkUrl)) {
            throw new Error('다운로드 링크는 http(s) URL이어야 합니다.');
          }

          const normalizedLinkUrl = digitalLinkUrl.trim();
          const linkFileName = digitalLinkFileName.trim() || 'Google Drive file';
          const assetKind = inferExternalLinkAssetKind(normalizedLinkUrl, linkFileName);
          const linkSource =
            mode === 'create' ? 'v2-variant-create-link' : 'v2-variant-edit-link';
          const mediaAsset = await createExternalMediaAsset.mutateAsync({
            url: normalizedLinkUrl,
            file_name: linkFileName,
            asset_kind: assetKind,
            status: 'ACTIVE',
            metadata: {
              source: linkSource,
              delivery_method: 'LINK',
            },
          });

          await persistPrimaryDigitalAsset({
            media_asset_id: mediaAsset.data.id,
            file_name: linkFileName,
            mime_type: mediaAsset.data.mime_type || 'application/octet-stream',
            file_size: mediaAsset.data.file_size || 1,
            status: status === 'ACTIVE' ? 'READY' : 'DRAFT',
            metadata: {
              source: linkSource,
              delivery_method: 'LINK',
              external_url: normalizedLinkUrl,
              media_asset_kind: assetKind,
            },
          });
        }
      }

      setAbortUpload(null);
      await onSuccess();
      return true;
    } catch (submitError) {
      setAbortUpload(null);
      const maybeUploadError = submitError as { code?: string; message?: string };
      if (maybeUploadError.code === 'UPLOAD_ABORTED') {
        if (mode === 'create' && savedVariantId) {
          setPersistedVariantId(savedVariantId);
          setErrorMessage(
            '디지털 파일 업로드를 취소했습니다. 옵션은 이미 저장되어 있으니 같은 옵션에 다시 업로드할 수 있습니다.',
          );
          return false;
        }
        setErrorMessage('디지털 파일 업로드를 취소했습니다. 다시 시도하거나 파일을 바꿀 수 있습니다.');
        return false;
      }

      const nextErrorMessage = getErrorMessage(submitError);
      if (mode === 'create' && savedVariantId) {
        setPersistedVariantId(savedVariantId);
        setErrorMessage(
          `${nextErrorMessage} 옵션은 이미 저장되어 있어 다시 제출해도 새 옵션이 추가되지는 않습니다.`,
        );
        return false;
      }
      setErrorMessage(nextErrorMessage);
      return false;
    }
  };

  const submitVariantFormRef = useRef(submitVariantForm);

  useEffect(() => {
    submitVariantFormRef.current = submitVariantForm;
  });

  useEffect(() => {
    if (!registerSaveHandler) {
      return;
    }

    registerSaveHandler(() => submitVariantFormRef.current());
    return () => registerSaveHandler(null);
  }, [registerSaveHandler]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitVariantForm();
  };

  const handleRetryUpload = async () => {
    if (!digitalFile || digitalAssetInputMode !== 'FILE' || isSubmitting) {
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
              {isSingleDefaultVariant
                ? '단일 기본 옵션은 판매 상태와 가격만 관리합니다.'
                : '이름과 노출 상태만 먼저 정리하면 나머지 설정은 아래에서 이어서 처리할 수 있습니다.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge intent={mode === 'create' ? 'info' : 'default'}>
              {mode === 'create' ? '새 옵션' : '옵션 수정'}
            </Badge>
            {!isSingleDefaultVariant && <Badge intent="default">{product.title}</Badge>}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          {!isSingleDefaultVariant && (
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
          )}

          {!isSingleDefaultVariant && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 lg:col-span-5">
              <p className="text-sm font-medium text-gray-900">연결 상품</p>
              <p className="mt-1 text-sm text-gray-500">선택한 상품에 이 옵션이 추가됩니다.</p>
              <p className="mt-3 text-sm font-medium text-gray-900">{product.title}</p>
              {isFulfillmentLocked && lockedFulfillmentType && (
                <p className="mt-2 text-xs font-medium text-gray-600">
                  제공 방식: {FULFILLMENT_TYPE_LABELS[lockedFulfillmentType]} (상품 기준 고정)
                </p>
              )}
              {isBundleProduct && (
                <p className="mt-2 text-xs font-medium text-gray-600">
                  제공 방식: 번들 구성 상품 기준 자동 적용
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                상품 상세 페이지에서 언제든 옵션을 추가/수정할 수 있습니다.
              </p>
            </div>
          )}

          {canEditFulfillmentType && (
            <div className="space-y-3 lg:col-span-7">
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
          )}

          <div
            className={`space-y-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 ${
              canEditFulfillmentType && !isSingleDefaultVariant ? 'lg:col-span-5' : 'lg:col-span-12'
            }`}
          >
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
            <h2 className="text-lg font-semibold text-gray-900">기본 판매가</h2>
            <p className="mt-1 text-sm text-gray-500">
              옵션의 상시 판매 가격입니다. 캠페인 화면에서는 포함 여부와 할인/특가를 관리합니다.
            </p>
          </div>
          <Badge intent="info">BASE</Badge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-12">
          <div className={isSingleDefaultVariant ? 'lg:col-span-12' : 'lg:col-span-7'}>
            <FormField
              label="기본 판매가 (원)"
              htmlFor="variant-base-price"
              required={status === 'ACTIVE'}
              help="판매 중 옵션은 기본 판매가가 필요합니다. 임시 저장 옵션은 비워둘 수 있습니다."
            >
              <Input
                id="variant-base-price"
                type="number"
                min="0"
                step="1"
                value={basePrice}
                onChange={(event) => {
                  setBasePriceTouched(true);
                  setBasePrice(event.target.value);
                }}
                placeholder="예: 10000"
                disabled={isBasePricingLoading}
              />
            </FormField>
          </div>

          {!isSingleDefaultVariant && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 lg:col-span-5">
              <p className="text-sm font-medium text-gray-900">연결 기본 캠페인</p>
              <p className="mt-2 text-sm text-gray-700">
                {alwaysOnCampaignsLoading
                  ? '기본 캠페인 확인 중'
                  : projectBaseCampaign?.name || '연결된 기본 캠페인 없음'}
              </p>
              {currentBasePriceItem && (
                <p className="mt-2 text-xs text-gray-500">
                  현재 기본가 {formatCurrency(currentBasePriceItem.unit_amount)}
                  {isUsingInheritedBasePrice ? ' · 상품 단위 가격에서 상속됨' : ''}
                </p>
              )}
              {!alwaysOnCampaignsLoading && !projectBaseCampaign && (
                <p className="mt-2 text-xs text-red-600">
                  저장하려면 이 프로젝트의 기본 캠페인이 먼저 필요합니다.
                </p>
              )}
              {isBasePricingLoading && (
                <p className="mt-2 text-xs text-gray-500">기존 기본 판매가를 불러오는 중입니다.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {isBundleProduct && !isSingleDefaultVariant && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">번들 이행 방식</h2>
              <p className="mt-1 text-sm text-gray-500">
                배송/디지털 제공 여부는 활성 번들 구성에 포함된 옵션 기준으로 자동 계산됩니다.
              </p>
            </div>
            <Badge intent="default">구성 기준</Badge>
          </div>
          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            부모 옵션에는 대표 판매가와 노출 상태만 저장하고, 디지털 파일/재고/배송 세부 정보는 구성 상품의
            옵션에서 관리합니다.
          </div>
        </section>
      )}

      {!isBundleProduct && fulfillmentType === 'PHYSICAL' ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
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
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 lg:col-span-8">
              <p className="text-sm font-medium text-gray-900">재고 추적</p>
              <p className="mt-1 text-sm text-gray-500">
                재고 추적을 켜면 아래 재고 수량(온핸드/안전재고)이 판매 가능 수량 계산에 반영됩니다.
              </p>
              <div className="mt-4">
                <Switch
                  checked={trackInventory}
                  onChange={(event) => setTrackInventory(event.target.checked)}
                  label={trackInventory ? '재고를 추적합니다.' : '재고를 추적하지 않습니다.'}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 lg:col-span-12">
              <p className="text-sm font-medium text-gray-900">재고 수량 설정</p>
              <p className="mt-1 text-sm text-gray-500">
                재고 추적이 켜진 경우에만 저장되며, 가용 재고는 on hand - reserved 로 계산됩니다.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {hasMultipleStockLocations ? (
                  <FormField
                    label="재고 위치"
                    htmlFor="variant-inventory-location"
                    help="기본값은 우선순위가 가장 높은 활성 위치입니다."
                  >
                    <Select
                      id="variant-inventory-location"
                      value={inventoryLocationId}
                      onChange={(event) => handleInventoryLocationChange(event.target.value)}
                      disabled={!trackInventory || stockLocationsLoading}
                      options={(stockLocations || []).map((location) => ({
                        value: location.id,
                        label: `${location.name} (${location.code})`,
                      }))}
                      placeholder={
                        stockLocationsLoading
                          ? '재고 위치 불러오는 중'
                          : '재고 위치를 선택하세요'
                      }
                    />
                  </FormField>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      재고 위치
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {singleStockLocation
                        ? `${singleStockLocation.name} (${singleStockLocation.code})`
                        : '기본 위치 자동 사용'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      단일 위치 운영 기준으로 자동 적용됩니다.
                    </p>
                  </div>
                )}

                <FormField
                  label="재고 수량 (on hand)"
                  htmlFor="variant-inventory-on-hand"
                  help="입고된 총 수량입니다."
                >
                  <Input
                    id="variant-inventory-on-hand"
                    type="number"
                    min="0"
                    step="1"
                    value={inventoryOnHandQuantity}
                    onChange={(event) => setInventoryOnHandQuantity(event.target.value)}
                    placeholder="예: 100"
                    disabled={!trackInventory}
                  />
                </FormField>

                <FormField
                  label="안전 재고"
                  htmlFor="variant-inventory-safety"
                  help="이 수량 이하일 때 운영 경고 기준으로 사용됩니다."
                >
                  <Input
                    id="variant-inventory-safety"
                    type="number"
                    min="0"
                    step="1"
                    value={inventorySafetyStockQuantity}
                    onChange={(event) => setInventorySafetyStockQuantity(event.target.value)}
                    placeholder="예: 5"
                    disabled={!trackInventory}
                  />
                </FormField>
              </div>

              {inventoryLevelsLoading && (
                <p className="mt-3 text-xs text-gray-500">기존 재고 수량을 불러오는 중입니다.</p>
              )}
              {!inventoryLevelsLoading && selectedInventoryLevel && (
                <p className="mt-3 text-xs text-gray-600">
                  현재 가용 재고 {selectedInventoryLevel.available_quantity}개 (reserved{' '}
                  {selectedInventoryLevel.reserved_quantity}개)
                </p>
              )}
              {!stockLocationsLoading && (stockLocations || []).length <= 1 && (
                <p className="mt-3 text-xs text-gray-500">
                  재고 위치는 단일 기본 위치로 자동 처리됩니다.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : !isBundleProduct ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">디지털 파일</h2>
              <p className="mt-1 text-sm text-gray-500">
                디지털 옵션에 파일 업로드 또는 다운로드 링크를 연결합니다.
              </p>
            </div>
            <Badge intent="info">디지털</Badge>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
            <p className="text-sm font-medium text-blue-900">
              {mode === 'create' ? '디지털 파일 연결 (선택)' : '디지털 파일 교체 (선택)'}
            </p>
            <p className="mt-1 text-sm text-blue-800/80">
              {mode === 'create'
                ? '파일을 선택하거나 링크를 입력하면 옵션 저장과 함께 기본 디지털 에셋으로 연결됩니다.'
                : '새 파일/링크를 입력하지 않으면 기존 디지털 에셋을 그대로 유지합니다.'}
            </p>

            {mode === 'edit' && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700">
                {isAssetsLoading ? (
                  <p>현재 연결된 디지털 에셋 정보를 불러오는 중입니다.</p>
                ) : primaryAsset ? (
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">현재 파일: {existingDigitalAssetName}</p>
                    <p className="text-xs text-gray-500">
                      {existingDigitalAssetSizeLabel} · 상태 {primaryAsset.status}
                    </p>
                  </div>
                ) : (
                  <p>현재 연결된 디지털 에셋이 없습니다. 파일 또는 링크를 추가할 수 있습니다.</p>
                )}
              </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setDigitalAssetInputMode('FILE');
                  setUploadState(null);
                  setAbortUpload(null);
                }}
                className={getChoiceButtonClass(digitalAssetInputMode === 'FILE')}
              >
                <span className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" aria-hidden="true" />
                  File
                </span>
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  오디오 또는 zip 파일을 R2에 업로드합니다.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDigitalAssetInputMode('LINK');
                  setUploadState(null);
                  setAbortUpload(null);
                }}
                className={getChoiceButtonClass(digitalAssetInputMode === 'LINK')}
              >
                <span className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  Link
                </span>
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  Google Drive 같은 외부 다운로드 링크를 연결합니다.
                </span>
              </button>
            </div>

            {digitalAssetInputMode === 'FILE' ? (
              <>
                <FileInput
                  id="variant-digital-file"
                  triggerLabel={
                    digitalFile
                      ? `${digitalFile.name} (${formatBytes(digitalFile.size)})`
                      : mode === 'create'
                        ? '디지털 파일 선택'
                        : '새 디지털 파일 선택'
                  }
                  accept={DIGITAL_FILE_ACCEPT}
                  onChange={(event) => setDigitalFile(event.target.files?.[0] || null)}
                  className="mt-4"
                />
                <p className="mt-2 text-xs text-gray-500">
                  선택 파일: {digitalFile ? `${digitalFile.name} (${formatBytes(digitalFile.size)})` : '없음'}
                </p>
              </>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <FormField
                    label="다운로드 링크"
                    htmlFor="variant-digital-link-url"
                    help="https:// 로 시작하는 공유 링크를 입력합니다."
                  >
                    <Input
                      id="variant-digital-link-url"
                      type="url"
                      value={digitalLinkUrl}
                      onChange={(event) => setDigitalLinkUrl(event.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                    />
                  </FormField>
                </div>
                <div className="lg:col-span-4">
                  <FormField
                    label="표시 파일명"
                    htmlFor="variant-digital-link-file-name"
                    help="비워두면 기본 이름을 사용합니다."
                  >
                    <Input
                      id="variant-digital-link-file-name"
                      value={digitalLinkFileName}
                      onChange={(event) => setDigitalLinkFileName(event.target.value)}
                      placeholder="voice-pack.zip"
                    />
                  </FormField>
                </div>
              </div>
            )}
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
                {!abortUpload && digitalFile && errorMessage && (
                  <Button type="button" intent="neutral" size="sm" onClick={handleRetryUpload}>
                    업로드 다시 시도
                  </Button>
                )}
              </div>
            </div>
          )}

          {!uploadState && digitalFile && errorMessage && (
            <div className="mt-4">
              <Button type="button" intent="neutral" size="sm" onClick={handleRetryUpload}>
                업로드 다시 시도
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {!hideActions && (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? '옵션 추가' : '옵션 저장'}
          </Button>
          <Button type="button" intent="neutral" onClick={onCancel}>
            취소
          </Button>
        </div>
      )}
    </form>
  );
}
