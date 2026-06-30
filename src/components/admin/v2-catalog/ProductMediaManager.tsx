'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ImageIcon, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FileInput } from '@/components/ui/file-input';
import { Loading } from '@/components/ui/loading';
import type { V2Product, V2ProductMedia } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2ProductMedia,
  useDeactivateV2ProductMedia,
  useUpdateV2ProductMedia,
  useUploadV2MediaAssetFile,
  useV2AdminProductMedia,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const DETAIL_ROLE_SET = new Set(['DETAIL', 'GALLERY']);

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

function getNextDetailSortOrder(detailMedia: V2ProductMedia[]): number {
  if (detailMedia.length === 0) {
    return 10;
  }
  const maxSortOrder = detailMedia.reduce((maxValue, item) => {
    return Math.max(maxValue, item.sort_order);
  }, 0);
  return maxSortOrder + 10;
}

function isImageFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
}

type ProductMediaManagerProps = {
  product: V2Product;
  embedded?: boolean;
  layout?: 'wide' | 'stacked';
};

const sectionClassName =
  'rounded-[20px] border border-[#e7e3d3] bg-white p-5 shadow-none sm:p-6';
const uploadTriggerClassName =
  '!h-11 !rounded-[11px] !border-0 !bg-[#f5f3e8] !px-4 !text-sm !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]';
const mutedTextClassName = 'text-[#1a1a2e]/55';

export function ProductMediaManager({
  product,
  embedded = false,
  layout = 'wide',
}: ProductMediaManagerProps) {
  const { data, isLoading, error } = useV2AdminProductMedia(product.id);
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const createProductMedia = useCreateV2ProductMedia();
  const updateProductMedia = useUpdateV2ProductMedia();
  const deactivateProductMedia = useDeactivateV2ProductMedia();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const coverMedia = useMemo(() => getCoverMedia(data || []), [data]);
  const detailMedia = useMemo(
    () => getDetailMedia(data || [], coverMedia?.id || null),
    [data, coverMedia?.id],
  );
  const galleryMedia = useMemo(
    () => (coverMedia ? [coverMedia, ...detailMedia] : detailMedia),
    [coverMedia, detailMedia],
  );

  const isMutating =
    uploadMediaAssetFile.isPending ||
    createProductMedia.isPending ||
    updateProductMedia.isPending ||
    deactivateProductMedia.isPending ||
    isReordering;

  const resetNotice = () => {
    setErrorMessage(null);
    setMessage(null);
  };

  const uploadProductImages = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    resetNotice();
    try {
      const imageFiles = files.filter((file) => isImageFile(file));
      if (imageFiles.length === 0) {
        setErrorMessage('이미지 파일만 업로드할 수 있습니다.');
        return;
      }

      const invalidCount = files.length - imageFiles.length;
      const shouldCreateCover = !coverMedia;
      const coverFile = shouldCreateCover ? imageFiles[0] : null;
      const detailFiles = shouldCreateCover ? imageFiles.slice(1) : imageFiles;
      const firstSortOrder = getNextDetailSortOrder(detailMedia);

      if (coverFile) {
        const uploaded = await uploadMediaAssetFile.mutateAsync({
          data: {
            file: coverFile,
            asset_kind: 'IMAGE',
            status: 'ACTIVE',
            metadata: {
              source: 'v2-product-gallery-cover-upload',
            },
          },
        });

        await createProductMedia.mutateAsync({
          productId: product.id,
          data: {
            media_asset_id: uploaded.data.id,
            media_role: 'PRIMARY',
            is_primary: true,
            sort_order: 0,
            status: 'ACTIVE',
            alt_text: `${product.title} 대표 이미지`,
          },
        });
      }

      for (let index = 0; index < detailFiles.length; index += 1) {
        const file = detailFiles[index];
        const uploaded = await uploadMediaAssetFile.mutateAsync({
          data: {
            file,
            asset_kind: 'IMAGE',
            status: 'ACTIVE',
            metadata: {
              source: 'v2-product-gallery-detail-upload',
            },
          },
        });

        await createProductMedia.mutateAsync({
          productId: product.id,
          data: {
            media_asset_id: uploaded.data.id,
            media_role: 'DETAIL',
            is_primary: false,
            sort_order: firstSortOrder + index * 10,
            status: 'ACTIVE',
            alt_text: `${product.title} 상세 이미지 ${detailMedia.length + index + 1}`,
          },
        });
      }

      if (invalidCount > 0) {
        setMessage(
          `이미지 ${imageFiles.length}장을 추가했습니다. 이미지가 아닌 ${invalidCount}개 파일은 제외했습니다.`,
        );
        return;
      }

      setMessage(`이미지 ${imageFiles.length}장을 추가했습니다.`);
    } catch (uploadError) {
      setErrorMessage(getErrorMessage(uploadError));
    }
  };

  const setPrimaryMedia = async (media: V2ProductMedia) => {
    if (coverMedia?.id === media.id) {
      return;
    }

    resetNotice();
    try {
      await updateProductMedia.mutateAsync({
        mediaId: media.id,
        data: {
          media_role: 'PRIMARY',
          is_primary: true,
          sort_order: 0,
          status: 'ACTIVE',
        },
      });

      if (coverMedia) {
        await updateProductMedia.mutateAsync({
          mediaId: coverMedia.id,
          data: {
            media_role: 'DETAIL',
            is_primary: false,
            sort_order: getNextDetailSortOrder(
              detailMedia.filter((detailItem) => detailItem.id !== media.id),
            ),
            status: 'ACTIVE',
          },
        });
      }

      setMessage('대표 이미지를 변경했습니다.');
    } catch (updateError) {
      setErrorMessage(getErrorMessage(updateError));
    }
  };

  const removeMedia = async (media: V2ProductMedia) => {
    resetNotice();
    try {
      await deactivateProductMedia.mutateAsync(media.id);

      if (coverMedia?.id === media.id && detailMedia.length > 0) {
        const nextPrimaryMedia = detailMedia[0];
        await updateProductMedia.mutateAsync({
          mediaId: nextPrimaryMedia.id,
          data: {
            media_role: 'PRIMARY',
            is_primary: true,
            sort_order: 0,
            status: 'ACTIVE',
          },
        });
        setMessage('대표 이미지를 제거하고 다음 이미지를 대표로 지정했습니다.');
        return;
      }

      setMessage(
        coverMedia?.id === media.id
          ? '대표 이미지를 제거했습니다.'
          : '상세 이미지를 제거했습니다.',
      );
    } catch (deactivateError) {
      setErrorMessage(getErrorMessage(deactivateError));
    }
  };

  const updateDetailSortOrder = async (orderedMedia: V2ProductMedia[]) => {
    for (let index = 0; index < orderedMedia.length; index += 1) {
      const media = orderedMedia[index];
      const desiredSortOrder = (index + 1) * 10;
      if (media.sort_order === desiredSortOrder) {
        continue;
      }
      await updateProductMedia.mutateAsync({
        mediaId: media.id,
        data: {
          sort_order: desiredSortOrder,
        },
      });
    }
  };

  const moveDetailImage = async (mediaId: string, direction: -1 | 1) => {
    const currentIndex = detailMedia.findIndex((item) => item.id === mediaId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= detailMedia.length) {
      return;
    }

    const nextOrder = [...detailMedia];
    const currentItem = nextOrder[currentIndex];
    nextOrder[currentIndex] = nextOrder[nextIndex];
    nextOrder[nextIndex] = currentItem;

    resetNotice();
    setIsReordering(true);
    try {
      await updateDetailSortOrder(nextOrder);
      setMessage('상세 이미지 순서를 저장했습니다.');
    } catch (reorderError) {
      setErrorMessage(getErrorMessage(reorderError));
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading) {
    if (embedded) {
      return (
        <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-[14px] border border-[#e7e3d3] bg-white">
          <Loading size="md" text="상품 이미지 정보를 불러오는 중입니다." />
        </div>
      );
    }

    return (
      <section className={sectionClassName}>
        <div className="flex min-h-[180px] items-center justify-center">
          <Loading size="md" text="상품 이미지 정보를 불러오는 중입니다." />
        </div>
      </section>
    );
  }

  if (error) {
    if (embedded) {
      return (
        <div className="mt-5 rounded-[14px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          상품 이미지 정보를 불러오지 못했습니다.
        </div>
      );
    }

    return (
      <section className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-none sm:p-6">
        상품 이미지 정보를 불러오지 못했습니다.
      </section>
    );
  }

  const galleryGridClassName =
    embedded && layout === 'stacked'
      ? 'mt-4 grid grid-cols-2 gap-3'
      : 'mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3';

  const content = (
    <>
      {!embedded && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#1a1a2e]">상품 이미지</h2>
            <p className={`mt-2 text-sm font-medium ${mutedTextClassName}`}>
              대표 이미지와 상세 이미지를 하나의 갤러리로 관리합니다.
            </p>
          </div>
          <Badge
            intent="info"
            className="rounded-[8px] border border-[#cde0f3] bg-[#eaf3fc] px-3 py-1 text-xs font-bold text-[#4a88b9]"
          >
            총 {galleryMedia.length}장
          </Badge>
        </div>
      )}

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

      {galleryMedia.length === 0 ? (
        <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-[14px] border border-dashed border-[#d9d4c3] bg-white px-4 py-6 text-center text-sm font-bold text-[#b3aea2]">
          <div>
            <ImageIcon className="mx-auto h-8 w-8" strokeWidth={1.6} aria-hidden />
            <div className="mt-2">
              등록된 이미지가
              <br />
              없습니다
            </div>
          </div>
        </div>
      ) : (
        <div className={galleryGridClassName}>
          {galleryMedia.map((media) => {
            const isPrimary = coverMedia?.id === media.id;
            const detailIndex = detailMedia.findIndex(
              (detailItem) => detailItem.id === media.id,
            );
            const canMoveUp = !isPrimary && detailIndex > 0;
            const canMoveDown =
              !isPrimary && detailIndex >= 0 && detailIndex < detailMedia.length - 1;
            const label = isPrimary ? '대표' : `상세 ${detailIndex + 1}`;

            return (
              <div
                key={media.id}
                className={`min-w-0 rounded-[14px] border bg-white p-2 ${
                  isPrimary ? 'border-[#1a1a2e]' : 'border-[#e7e3d3]'
                }`}
              >
                <div className="relative overflow-hidden rounded-[10px] bg-[#f5f3e8]">
                  {media.public_url ? (
                    <img
                      src={media.public_url}
                      alt={media.alt_text || `${product.title} ${label} 이미지`}
                      className="aspect-square h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square h-full w-full items-center justify-center text-[10px] font-bold text-[#b3aea2]">
                      NO IMAGE
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-black ${
                      isPrimary
                        ? 'bg-[#1a1a2e] text-white'
                        : 'bg-white/95 text-[#6f6a5e]'
                    }`}
                  >
                    {label}
                  </span>
                  {media.media_role === 'GALLERY' && !isPrimary && (
                    <span className="absolute right-2 top-2 rounded-full bg-[#eaf3fc] px-2 py-1 text-[10px] font-black text-[#4a88b9]">
                      GALLERY
                    </span>
                  )}
                </div>

                <p className="mt-2 truncate text-xs font-bold text-[#1a1a2e]">
                  {media.alt_text || media.storage_path || media.public_url || label}
                </p>

                <div className="mt-2 grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    className="flex h-8 items-center justify-center rounded-[9px] bg-[#f5f3e8] text-[#8a8678] hover:bg-[#ece8d9] hover:text-[#1a1a2e] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`${label} 이미지를 대표 이미지로 지정`}
                    title="대표 지정"
                    onClick={() => void setPrimaryMedia(media)}
                    disabled={isPrimary || isMutating}
                  >
                    <Star className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 items-center justify-center rounded-[9px] bg-[#f5f3e8] text-[#8a8678] hover:bg-[#ece8d9] hover:text-[#1a1a2e] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`${label} 이미지를 앞으로 이동`}
                    title="앞으로 이동"
                    onClick={() => void moveDetailImage(media.id, -1)}
                    disabled={!canMoveUp || isMutating}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 items-center justify-center rounded-[9px] bg-[#f5f3e8] text-[#8a8678] hover:bg-[#ece8d9] hover:text-[#1a1a2e] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`${label} 이미지를 뒤로 이동`}
                    title="뒤로 이동"
                    onClick={() => void moveDetailImage(media.id, 1)}
                    disabled={!canMoveDown || isMutating}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 items-center justify-center rounded-[9px] bg-[#fff0f0] text-[#ca2a30] hover:bg-[#ffe4e4] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`${label} 이미지 제거`}
                    title="이미지 제거"
                    onClick={() => void removeMedia(media)}
                    disabled={isMutating}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <FileInput
          triggerLabel={
            isMutating
              ? '업로드 중...'
              : galleryMedia.length > 0
                ? '이미지 추가'
                : '이미지 선택'
          }
          triggerClassName={uploadTriggerClassName}
          accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
          multiple
          disabled={isMutating}
          onChange={(event) => {
            const fileList = event.target.files;
            if (fileList && fileList.length > 0) {
              void uploadProductImages(Array.from(fileList));
            }
            event.target.value = '';
          }}
        />
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className={sectionClassName}>
      {content}
    </section>
  );
}
