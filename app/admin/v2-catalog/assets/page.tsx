'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { ImageUpload } from '@/src/components/admin/ImageUpload';
import type {
  V2AssetRole,
  V2DigitalAssetStatus,
  V2MediaAssetKind,
  V2MediaAssetStatus,
  V2MediaRole,
  V2MediaStatus,
  V2MediaType,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useActivateV2DigitalAsset,
  useCreateV2MediaAsset,
  useCreateV2DigitalAsset,
  useCreateV2ProductMedia,
  useDeactivateV2DigitalAsset,
  useDeactivateV2ProductMedia,
  useV2AdminMediaAssets,
  useUpdateV2DigitalAsset,
  useUpdateV2ProductMedia,
  useV2AdminProductMedia,
  useV2AdminProducts,
  useV2AdminVariantAssets,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const MEDIA_TYPE_VALUES: V2MediaType[] = ['IMAGE', 'VIDEO'];
const MEDIA_ROLE_VALUES: V2MediaRole[] = ['PRIMARY', 'GALLERY', 'DETAIL'];
const MEDIA_STATUS_VALUES: V2MediaStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const ASSET_ROLE_VALUES: V2AssetRole[] = ['PRIMARY', 'BONUS'];
const ASSET_STATUS_VALUES: V2DigitalAssetStatus[] = ['DRAFT', 'READY', 'RETIRED'];
const MEDIA_ASSET_KIND_VALUES: V2MediaAssetKind[] = [
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'DOCUMENT',
  'ARCHIVE',
  'FILE',
];
const MEDIA_ASSET_STATUS_VALUES: V2MediaAssetStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];
const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

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

function parsePositiveInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}는 1 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function parseOptionalPositiveInteger(value: string, fieldName: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return parsePositiveInteger(trimmed, fieldName);
}

function parseNullablePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('file_size는 1 이상의 정수여야 합니다.');
  }
  return parsed;
}

function deriveStoragePathFromPublicUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    return '';
  }
}

function parseAssetFromSourceUrl(sourceUrl: string): {
  storagePath: string;
  fileName: string;
  mimeType: string;
} | null {
  const storagePath = deriveStoragePathFromPublicUrl(sourceUrl);
  if (!storagePath) {
    return null;
  }
  const fileName = storagePath.split('/').pop() || storagePath;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  let mimeType = 'application/octet-stream';
  if (extension === 'png') {
    mimeType = 'image/png';
  } else if (extension === 'jpg' || extension === 'jpeg') {
    mimeType = 'image/jpeg';
  } else if (extension === 'webp') {
    mimeType = 'image/webp';
  } else if (extension === 'gif') {
    mimeType = 'image/gif';
  } else if (extension === 'mp4') {
    mimeType = 'video/mp4';
  } else if (extension === 'zip') {
    mimeType = 'application/zip';
  } else if (extension === 'mp3') {
    mimeType = 'audio/mpeg';
  } else if (extension === 'wav') {
    mimeType = 'audio/wav';
  } else if (extension === 'flac') {
    mimeType = 'audio/flac';
  } else if (extension === 'm4a') {
    mimeType = 'audio/mp4';
  } else if (extension === 'pdf') {
    mimeType = 'application/pdf';
  }

  return {
    storagePath,
    fileName,
    mimeType,
  };
}

function resolveMediaStatusIntent(
  status: V2MediaStatus,
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

function resolveAssetStatusIntent(
  status: V2DigitalAssetStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'READY') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'RETIRED') {
    return 'info';
  }
  return 'default';
}

export default function V2CatalogAssetsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [newMediaType, setNewMediaType] = useState<V2MediaType>('IMAGE');
  const [newMediaRole, setNewMediaRole] = useState<V2MediaRole>('GALLERY');
  const [newMediaStatus, setNewMediaStatus] = useState<V2MediaStatus>('DRAFT');
  const [newMediaSortOrder, setNewMediaSortOrder] = useState('0');
  const [newMediaAltText, setNewMediaAltText] = useState('');
  const [newMediaAssetId, setNewMediaAssetId] = useState('');
  const [newMediaIsPrimary, setNewMediaIsPrimary] = useState(false);

  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editingMediaType, setEditingMediaType] = useState<V2MediaType>('IMAGE');
  const [editingMediaRole, setEditingMediaRole] = useState<V2MediaRole>('GALLERY');
  const [editingMediaStatus, setEditingMediaStatus] = useState<V2MediaStatus>('DRAFT');
  const [editingMediaSortOrder, setEditingMediaSortOrder] = useState('0');
  const [editingMediaAltText, setEditingMediaAltText] = useState('');
  const [editingMediaAssetId, setEditingMediaAssetId] = useState('');
  const [editingMediaIsPrimary, setEditingMediaIsPrimary] = useState(false);

  const [newAssetMediaAssetId, setNewAssetMediaAssetId] = useState('');
  const [newAssetRole, setNewAssetRole] = useState<V2AssetRole>('PRIMARY');
  const [newAssetStatus, setNewAssetStatus] = useState<V2DigitalAssetStatus>('DRAFT');
  const [newAssetVersionNo, setNewAssetVersionNo] = useState('');
  const [newAssetMetadataJson, setNewAssetMetadataJson] = useState('{}');

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetMediaAssetId, setEditingAssetMediaAssetId] = useState('');
  const [editingAssetStatus, setEditingAssetStatus] = useState<V2DigitalAssetStatus>('DRAFT');
  const [editingAssetMetadataJson, setEditingAssetMetadataJson] = useState('{}');

  const [newRegistryKind, setNewRegistryKind] = useState<V2MediaAssetKind>('IMAGE');
  const [newRegistryStatus, setNewRegistryStatus] = useState<V2MediaAssetStatus>('ACTIVE');
  const [newRegistrySourceUrl, setNewRegistrySourceUrl] = useState('');
  const [newRegistryStoragePath, setNewRegistryStoragePath] = useState('');
  const [newRegistryFileName, setNewRegistryFileName] = useState('');
  const [newRegistryMimeType, setNewRegistryMimeType] = useState('application/octet-stream');
  const [newRegistryFileSize, setNewRegistryFileSize] = useState('');
  const [newRegistryChecksum, setNewRegistryChecksum] = useState('');

  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useV2AdminProducts();
  const {
    data: mediaAssets,
    isLoading: mediaAssetsLoading,
    error: mediaAssetsError,
  } = useV2AdminMediaAssets();

  const createMediaAsset = useCreateV2MediaAsset();

  const activeProductId = useMemo(() => {
    if (
      selectedProductId &&
      (products || []).some((product) => product.id === selectedProductId)
    ) {
      return selectedProductId;
    }
    return products?.[0]?.id ?? null;
  }, [products, selectedProductId]);

  const activeProduct = useMemo(
    () => (products || []).find((product) => product.id === activeProductId) || null,
    [products, activeProductId],
  );

  const {
    data: media,
    isLoading: mediaLoading,
    error: mediaError,
  } = useV2AdminProductMedia(activeProductId);
  const {
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(activeProductId);

  const digitalVariants = useMemo(
    () => (variants || []).filter((variant) => variant.fulfillment_type === 'DIGITAL'),
    [variants],
  );

  const activeVariantId = useMemo(() => {
    if (
      selectedVariantId &&
      digitalVariants.some((variant) => variant.id === selectedVariantId)
    ) {
      return selectedVariantId;
    }
    return digitalVariants[0]?.id ?? null;
  }, [digitalVariants, selectedVariantId]);

  const activeVariant = useMemo(
    () => digitalVariants.find((variant) => variant.id === activeVariantId) || null,
    [digitalVariants, activeVariantId],
  );

  const {
    data: assets,
    isLoading: assetsLoading,
    error: assetsError,
  } = useV2AdminVariantAssets(activeVariantId);

  const productMediaAssetCandidates = useMemo(
    () =>
      (mediaAssets || []).filter(
        (asset) => asset.asset_kind === 'IMAGE' || asset.asset_kind === 'VIDEO',
      ),
    [mediaAssets],
  );

  const digitalAssetCandidates = useMemo(
    () =>
      (mediaAssets || []).filter(
        (asset) => asset.file_size !== null && asset.file_size > 0,
      ),
    [mediaAssets],
  );

  const createMedia = useCreateV2ProductMedia();
  const updateMedia = useUpdateV2ProductMedia();
  const deactivateMedia = useDeactivateV2ProductMedia();

  const createAsset = useCreateV2DigitalAsset();
  const updateAsset = useUpdateV2DigitalAsset();
  const activateAsset = useActivateV2DigitalAsset();
  const deactivateAsset = useDeactivateV2DigitalAsset();

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const runAction = async (task: () => Promise<void>) => {
    clearNotice();
    try {
      await task();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
  };

  const handleApplyRegistrySourceUrl = () => {
    const parsed = parseAssetFromSourceUrl(newRegistrySourceUrl);
    if (!parsed) {
      setErrorMessage('유효한 파일 URL을 입력하세요.');
      return;
    }
    setNewRegistryStoragePath(parsed.storagePath);
    setNewRegistryFileName(parsed.fileName);
    setNewRegistryMimeType(parsed.mimeType);
    clearNotice();
  };

  const handleCreateRegistryAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(async () => {
      const response = await createMediaAsset.mutateAsync({
        asset_kind: newRegistryKind,
        status: newRegistryStatus,
        storage_provider: 'R2',
        storage_path: newRegistryStoragePath.trim(),
        public_url: newRegistrySourceUrl.trim() || null,
        file_name: newRegistryFileName.trim() || undefined,
        mime_type: newRegistryMimeType.trim() || null,
        file_size: parseNullablePositiveInteger(newRegistryFileSize),
        checksum: newRegistryChecksum.trim() || null,
      });
      const created = response.data;
      setMessage('미디어 에셋 레지스트리에 등록했습니다.');
      if (created.asset_kind === 'IMAGE' || created.asset_kind === 'VIDEO') {
        setNewMediaAssetId(created.id);
      }
      if (created.file_size && created.file_size > 0) {
        setNewAssetMediaAssetId(created.id);
      }
      setNewRegistrySourceUrl('');
      setNewRegistryStoragePath('');
      setNewRegistryFileName('');
      setNewRegistryMimeType('application/octet-stream');
      setNewRegistryFileSize('');
      setNewRegistryChecksum('');
      setNewRegistryStatus('ACTIVE');
      setNewRegistryKind('IMAGE');
    });
  };

  const handleCreateMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProductId) {
      setErrorMessage('상품을 먼저 선택하세요.');
      return;
    }
    if (!newMediaAssetId) {
      setErrorMessage('연결할 media asset을 선택하세요.');
      return;
    }
    await runAction(async () => {
      await createMedia.mutateAsync({
        productId: activeProductId,
        data: {
          media_type: newMediaType,
          media_role: newMediaRole,
          media_asset_id: newMediaAssetId,
          status: newMediaStatus,
          sort_order: parseNonNegativeInteger(newMediaSortOrder, 'sort_order'),
          alt_text: newMediaAltText.trim() || null,
          is_primary: newMediaIsPrimary || newMediaRole === 'PRIMARY',
        },
      });
      setMessage('상품 미디어를 등록했습니다.');
      setNewMediaSortOrder('0');
      setNewMediaAltText('');
      setNewMediaAssetId('');
      setNewMediaIsPrimary(false);
      setNewMediaStatus('DRAFT');
      setNewMediaRole('GALLERY');
    });
  };

  const handleStartEditMedia = (item: {
    id: string;
    media_type: V2MediaType;
    media_role: V2MediaRole;
    status: V2MediaStatus;
    sort_order: number;
    alt_text: string | null;
    media_asset_id: string | null;
    is_primary: boolean;
  }) => {
    clearNotice();
    setEditingMediaId(item.id);
    setEditingMediaType(item.media_type);
    setEditingMediaRole(item.media_role);
    setEditingMediaStatus(item.status);
    setEditingMediaSortOrder(String(item.sort_order));
    setEditingMediaAltText(item.alt_text || '');
    setEditingMediaAssetId(item.media_asset_id || '');
    setEditingMediaIsPrimary(item.is_primary);
  };

  const handleCancelEditMedia = () => {
    setEditingMediaId(null);
    setEditingMediaType('IMAGE');
    setEditingMediaRole('GALLERY');
    setEditingMediaStatus('DRAFT');
    setEditingMediaSortOrder('0');
    setEditingMediaAltText('');
    setEditingMediaAssetId('');
    setEditingMediaIsPrimary(false);
  };

  const handleUpdateMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMediaId) {
      return;
    }
    if (!editingMediaAssetId) {
      setErrorMessage('연결할 media asset을 선택하세요.');
      return;
    }
    await runAction(async () => {
      await updateMedia.mutateAsync({
        mediaId: editingMediaId,
        data: {
          media_type: editingMediaType,
          media_role: editingMediaRole,
          media_asset_id: editingMediaAssetId,
          status: editingMediaStatus,
          sort_order: parseNonNegativeInteger(editingMediaSortOrder, 'sort_order'),
          alt_text: editingMediaAltText.trim() || null,
          is_primary: editingMediaIsPrimary || editingMediaRole === 'PRIMARY',
        },
      });
      setMessage('상품 미디어를 수정했습니다.');
      handleCancelEditMedia();
    });
  };

  const handleDeactivateMedia = async (mediaId: string) => {
    await runAction(async () => {
      await deactivateMedia.mutateAsync(mediaId);
      if (editingMediaId === mediaId) {
        handleCancelEditMedia();
      }
      setMessage('상품 미디어를 비활성화했습니다.');
    });
  };

  const handleCreateAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeVariantId) {
      setErrorMessage('디지털 variant를 먼저 선택하세요.');
      return;
    }
    if (!newAssetMediaAssetId) {
      setErrorMessage('연결할 media asset을 선택하세요.');
      return;
    }
    await runAction(async () => {
      const metadata = JSON.parse(newAssetMetadataJson || '{}') as Record<string, unknown>;
      await createAsset.mutateAsync({
        variantId: activeVariantId,
        data: {
          asset_role: newAssetRole,
          media_asset_id: newAssetMediaAssetId,
          status: newAssetStatus,
          version_no: parseOptionalPositiveInteger(newAssetVersionNo, 'version_no') ?? undefined,
          metadata,
        },
      });
      setMessage('디지털 에셋을 등록했습니다.');
      setNewAssetMediaAssetId('');
      setNewAssetRole('PRIMARY');
      setNewAssetStatus('DRAFT');
      setNewAssetVersionNo('');
      setNewAssetMetadataJson('{}');
    });
  };

  const handleStartEditAsset = (asset: {
    id: string;
    media_asset_id: string | null;
    status: V2DigitalAssetStatus;
    metadata: Record<string, unknown>;
  }) => {
    clearNotice();
    setEditingAssetId(asset.id);
    setEditingAssetMediaAssetId(asset.media_asset_id || '');
    setEditingAssetStatus(asset.status);
    setEditingAssetMetadataJson(JSON.stringify(asset.metadata || {}, null, 2));
  };

  const handleCancelEditAsset = () => {
    setEditingAssetId(null);
    setEditingAssetMediaAssetId('');
    setEditingAssetStatus('DRAFT');
    setEditingAssetMetadataJson('{}');
  };

  const handleUpdateAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAssetId) {
      return;
    }
    if (!editingAssetMediaAssetId) {
      setErrorMessage('연결할 media asset을 선택하세요.');
      return;
    }
    await runAction(async () => {
      const metadata = JSON.parse(editingAssetMetadataJson || '{}') as Record<
        string,
        unknown
      >;
      await updateAsset.mutateAsync({
        assetId: editingAssetId,
        data: {
          media_asset_id: editingAssetMediaAssetId || undefined,
          status: editingAssetStatus,
          metadata,
        },
      });
      setMessage('디지털 에셋을 수정했습니다.');
      handleCancelEditAsset();
    });
  };

  const handleActivateAsset = async (assetId: string) => {
    await runAction(async () => {
      await activateAsset.mutateAsync(assetId);
      setMessage('디지털 에셋을 READY 상태로 전환했습니다.');
    });
  };

  const handleDeactivateAsset = async (assetId: string) => {
    await runAction(async () => {
      await deactivateAsset.mutateAsync(assetId);
      if (editingAssetId === assetId) {
        handleCancelEditAsset();
      }
      setMessage('디지털 에셋을 RETIRED 상태로 전환했습니다.');
    });
  };

  if (productsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 미디어/에셋 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (productsError || !products) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        상품 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 미디어·에셋 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            상품 이미지와 디지털 파일 메타데이터를 운영합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 sm:min-w-80">
          <select
            value={activeProductId || ''}
            onChange={(event) => {
              setSelectedProductId(event.target.value || null);
              setSelectedVariantId(null);
            }}
            className={SELECT_CLASS}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title} ({product.slug})
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!activeProduct ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          관리할 v2 상품이 없습니다. 먼저 상품을 생성하세요.
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="sm:flex sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">미디어 에셋 레지스트리</h2>
                <p className="mt-1 text-sm text-gray-500">
                  R2 파일 메타데이터를 먼저 등록한 뒤 상품/디지털 에셋에서 참조합니다.
                </p>
              </div>
              <Badge intent="info" size="md">
                {(mediaAssets || []).length}개
              </Badge>
            </div>

            <form
              className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4"
              onSubmit={handleCreateRegistryAsset}
            >
              <select
                value={newRegistryKind}
                onChange={(event) =>
                  setNewRegistryKind(event.target.value as V2MediaAssetKind)
                }
                className={SELECT_CLASS}
              >
                {MEDIA_ASSET_KIND_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={newRegistryStatus}
                onChange={(event) =>
                  setNewRegistryStatus(event.target.value as V2MediaAssetStatus)
                }
                className={SELECT_CLASS}
              >
                {MEDIA_ASSET_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <Input
                placeholder="파일 URL (선택)"
                value={newRegistrySourceUrl}
                onChange={(event) => setNewRegistrySourceUrl(event.target.value)}
              />
              <Button type="button" intent="neutral" onClick={handleApplyRegistrySourceUrl}>
                URL 파싱
              </Button>
              <Input
                placeholder="storage_path"
                value={newRegistryStoragePath}
                onChange={(event) => setNewRegistryStoragePath(event.target.value)}
                required
              />
              <Input
                placeholder="file_name"
                value={newRegistryFileName}
                onChange={(event) => setNewRegistryFileName(event.target.value)}
              />
              <Input
                placeholder="mime_type"
                value={newRegistryMimeType}
                onChange={(event) => setNewRegistryMimeType(event.target.value)}
              />
              <Input
                placeholder="file_size (bytes, 선택)"
                value={newRegistryFileSize}
                onChange={(event) => setNewRegistryFileSize(event.target.value)}
              />
              <Input
                placeholder="checksum (선택)"
                value={newRegistryChecksum}
                onChange={(event) => setNewRegistryChecksum(event.target.value)}
                className="lg:col-span-3"
              />
              <div>
                <Button type="submit" loading={createMediaAsset.isPending}>
                  에셋 등록
                </Button>
              </div>
            </form>

            {mediaAssetsLoading && (
              <p className="mt-3 text-sm text-gray-500">레지스트리를 불러오는 중입니다.</p>
            )}
            {!mediaAssetsLoading && mediaAssetsError && (
              <p className="mt-3 text-sm text-red-600">레지스트리를 불러오지 못했습니다.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="sm:flex sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">상품 미디어</h2>
                <p className="mt-1 text-sm text-gray-500">
                  선택된 상품의 대표/갤러리/상세 미디어를 운영합니다.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  상품: {activeProduct.title}
                </p>
              </div>
              <Badge intent="info" size="md">
                {(media || []).length}개
              </Badge>
            </div>

            <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleCreateMedia}>
              <select
                value={newMediaType}
                onChange={(event) => setNewMediaType(event.target.value as V2MediaType)}
                className={SELECT_CLASS}
              >
                {MEDIA_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={newMediaRole}
                onChange={(event) => setNewMediaRole(event.target.value as V2MediaRole)}
                className={SELECT_CLASS}
              >
                {MEDIA_ROLE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={newMediaStatus}
                onChange={(event) => setNewMediaStatus(event.target.value as V2MediaStatus)}
                className={SELECT_CLASS}
              >
                {MEDIA_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <Input
                placeholder="sort_order"
                value={newMediaSortOrder}
                onChange={(event) => setNewMediaSortOrder(event.target.value)}
              />
              <select
                value={newMediaAssetId}
                onChange={(event) => setNewMediaAssetId(event.target.value)}
                className={SELECT_CLASS}
                required
              >
                <option value="">media asset 선택</option>
                {productMediaAssetCandidates.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.file_name} ({asset.asset_kind})
                  </option>
                ))}
              </select>
              <Input
                placeholder="alt_text"
                value={newMediaAltText}
                onChange={(event) => setNewMediaAltText(event.target.value)}
              />
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newMediaIsPrimary}
                  onChange={(event) => setNewMediaIsPrimary(event.target.checked)}
                />
                Primary 지정
              </label>
              <div className="lg:col-span-4">
                <ImageUpload
                  imageType={newMediaRole === 'PRIMARY' ? 'product_main' : 'product_gallery'}
                  label="이미지 업로드 (R2)"
                  currentImageUrl={
                    productMediaAssetCandidates.find((asset) => asset.id === newMediaAssetId)
                      ?.public_url || undefined
                  }
                  altText={newMediaAltText || activeProduct.title}
                  onUploadSuccess={async (_imageId, publicUrl) => {
                    const storagePath = deriveStoragePathFromPublicUrl(publicUrl);
                    if (!storagePath) {
                      setErrorMessage('업로드 결과에서 storage_path를 확인하지 못했습니다.');
                      return;
                    }
                    const parsed = parseAssetFromSourceUrl(publicUrl);
                    await runAction(async () => {
                      const response = await createMediaAsset.mutateAsync({
                        asset_kind: 'IMAGE',
                        status: 'ACTIVE',
                        storage_provider: 'R2',
                        storage_path: storagePath,
                        public_url: publicUrl,
                        file_name: storagePath.split('/').pop() || storagePath,
                        mime_type: parsed?.mimeType || 'image/webp',
                      });
                      setNewMediaAssetId(response.data.id);
                      setMessage('업로드 파일을 media asset으로 등록했습니다.');
                    });
                  }}
                />
              </div>
              <div className="lg:col-span-4">
                <Button type="submit" loading={createMedia.isPending}>
                  미디어 등록
                </Button>
              </div>
            </form>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      미디어
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      역할/상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      경로
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {mediaLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        미디어 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!mediaLoading && mediaError && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">
                        미디어 목록을 불러오지 못했습니다.
                      </td>
                    </tr>
                  )}
                  {!mediaLoading && !mediaError && (media || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        등록된 미디어가 없습니다.
                      </td>
                    </tr>
                  )}
                  {!mediaLoading &&
                    !mediaError &&
                    (media || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.alt_text || '(alt 없음)'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            sort {item.sort_order} / {item.is_primary ? 'Primary' : 'Normal'}
                          </p>
                          {item.public_url ? (
                            <a
                              href={item.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                            >
                              미디어 URL 열기
                            </a>
                          ) : (
                            <p className="mt-1 text-xs text-gray-400">public URL 없음</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge intent="default">{item.media_type}</Badge>
                            <Badge intent="default">{item.media_role}</Badge>
                            <Badge intent={resolveMediaStatusIntent(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <p className="break-all">{item.storage_path}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              intent="neutral"
                              size="sm"
                              onClick={() => handleStartEditMedia(item)}
                            >
                              수정
                            </Button>
                            <Button
                              intent="danger"
                              size="sm"
                              onClick={() => handleDeactivateMedia(item.id)}
                              loading={deactivateMedia.isPending}
                            >
                              비활성화
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {editingMediaId && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">상품 미디어 수정</h2>
              <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleUpdateMedia}>
                <select
                  value={editingMediaType}
                  onChange={(event) =>
                    setEditingMediaType(event.target.value as V2MediaType)
                  }
                  className={SELECT_CLASS}
                >
                  {MEDIA_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={editingMediaRole}
                  onChange={(event) =>
                    setEditingMediaRole(event.target.value as V2MediaRole)
                  }
                  className={SELECT_CLASS}
                >
                  {MEDIA_ROLE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={editingMediaStatus}
                  onChange={(event) =>
                    setEditingMediaStatus(event.target.value as V2MediaStatus)
                  }
                  className={SELECT_CLASS}
                >
                  {MEDIA_STATUS_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="sort_order"
                  value={editingMediaSortOrder}
                  onChange={(event) => setEditingMediaSortOrder(event.target.value)}
                />
                <select
                  value={editingMediaAssetId}
                  onChange={(event) => setEditingMediaAssetId(event.target.value)}
                  className={SELECT_CLASS}
                  required
                >
                  <option value="">media asset 선택</option>
                  {productMediaAssetCandidates.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.file_name} ({asset.asset_kind})
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="alt_text"
                  value={editingMediaAltText}
                  onChange={(event) => setEditingMediaAltText(event.target.value)}
                />
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingMediaIsPrimary}
                    onChange={(event) => setEditingMediaIsPrimary(event.target.checked)}
                  />
                  Primary 지정
                </label>
                <div className="lg:col-span-4 flex gap-2">
                  <Button type="submit" loading={updateMedia.isPending}>
                    저장
                  </Button>
                  <Button type="button" intent="neutral" onClick={handleCancelEditMedia}>
                    취소
                  </Button>
                </div>
              </form>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="sm:flex sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">디지털 에셋</h2>
                <p className="mt-1 text-sm text-gray-500">
                  디지털 variant의 파일 버전과 상태를 운영합니다.
                </p>
              </div>
              <div className="mt-3 sm:mt-0 sm:min-w-80">
                <select
                  value={activeVariantId || ''}
                  onChange={(event) => setSelectedVariantId(event.target.value || null)}
                  className={SELECT_CLASS}
                >
                  {digitalVariants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.title} ({variant.sku})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {variantsLoading ? (
              <div className="mt-4 text-sm text-gray-500">variant 목록을 불러오는 중입니다.</div>
            ) : variantsError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                variant 데이터를 불러오지 못했습니다.
              </div>
            ) : !activeVariant ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                DIGITAL variant가 없습니다. 상품 variant를 DIGITAL로 등록하세요.
              </div>
            ) : (
              <>
                <div className="mt-3 text-xs text-gray-500">
                  선택 variant: {activeVariant.title} / {activeVariant.sku}
                </div>

                <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleCreateAsset}>
                  <select
                    value={newAssetMediaAssetId}
                    onChange={(event) => setNewAssetMediaAssetId(event.target.value)}
                    className={`${SELECT_CLASS} lg:col-span-2`}
                    required
                  >
                    <option value="">media asset 선택</option>
                    {digitalAssetCandidates.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.file_name} ({asset.file_size?.toLocaleString() || 0} bytes)
                      </option>
                    ))}
                  </select>
                  <select
                    value={newAssetRole}
                    onChange={(event) => setNewAssetRole(event.target.value as V2AssetRole)}
                    className={SELECT_CLASS}
                  >
                    {ASSET_ROLE_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newAssetStatus}
                    onChange={(event) =>
                      setNewAssetStatus(event.target.value as V2DigitalAssetStatus)
                    }
                    className={SELECT_CLASS}
                  >
                    {ASSET_STATUS_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="version_no (비우면 자동)"
                    value={newAssetVersionNo}
                    onChange={(event) => setNewAssetVersionNo(event.target.value)}
                  />
                  <div className="lg:col-span-4">
                    <Textarea
                      placeholder='metadata JSON (예: {"source":"admin"})'
                      value={newAssetMetadataJson}
                      onChange={(event) => setNewAssetMetadataJson(event.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <Button type="submit" loading={createAsset.isPending}>
                      디지털 에셋 등록
                    </Button>
                  </div>
                </form>

                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          파일
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          역할/상태
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          메타
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {assetsLoading && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                            에셋 목록을 불러오는 중입니다.
                          </td>
                        </tr>
                      )}
                      {!assetsLoading && assetsError && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">
                            에셋 목록을 불러오지 못했습니다.
                          </td>
                        </tr>
                      )}
                      {!assetsLoading && !assetsError && (assets || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                            등록된 에셋이 없습니다.
                          </td>
                        </tr>
                      )}
                      {!assetsLoading &&
                        !assetsError &&
                        (assets || []).map((asset) => (
                          <tr key={asset.id}>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {asset.file_name}
                              </p>
                              <p className="mt-1 break-all text-xs text-gray-500">
                                {asset.storage_path}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge intent="default">{asset.asset_role}</Badge>
                                <Badge intent={resolveAssetStatusIntent(asset.status)}>
                                  {asset.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              <p>version: {asset.version_no}</p>
                              <p>size: {asset.file_size.toLocaleString()} bytes</p>
                              <p>mime: {asset.mime_type}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button
                                  intent="neutral"
                                  size="sm"
                                  onClick={() => handleStartEditAsset(asset)}
                                >
                                  수정
                                </Button>
                                {asset.status !== 'READY' ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleActivateAsset(asset.id)}
                                    loading={activateAsset.isPending}
                                  >
                                    READY
                                  </Button>
                                ) : (
                                  <Button
                                    intent="secondary"
                                    size="sm"
                                    onClick={() => handleDeactivateAsset(asset.id)}
                                    loading={deactivateAsset.isPending}
                                  >
                                    RETIRED
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {editingAssetId && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">디지털 에셋 수정</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleUpdateAsset}>
            <select
              value={editingAssetMediaAssetId}
              onChange={(event) => setEditingAssetMediaAssetId(event.target.value)}
              className={`${SELECT_CLASS} lg:col-span-2`}
              required
            >
              <option value="">media asset 선택</option>
              {digitalAssetCandidates.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.file_name} ({asset.file_size?.toLocaleString() || 0} bytes)
                </option>
              ))}
            </select>
            <select
              value={editingAssetStatus}
              onChange={(event) =>
                setEditingAssetStatus(event.target.value as V2DigitalAssetStatus)
              }
              className={SELECT_CLASS}
            >
              {ASSET_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <div className="lg:col-span-4">
              <Textarea
                placeholder='metadata JSON (예: {"source":"admin"})'
                value={editingAssetMetadataJson}
                onChange={(event) => setEditingAssetMetadataJson(event.target.value)}
                rows={3}
              />
            </div>
            <div className="lg:col-span-4 flex gap-2">
              <Button type="submit" loading={updateAsset.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelEditAsset}>
                취소
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
