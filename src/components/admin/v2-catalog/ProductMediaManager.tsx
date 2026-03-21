'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
};

export function ProductMediaManager({ product }: ProductMediaManagerProps) {
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

  const uploadCoverImage = async (file: File) => {
    if (!isImageFile(file)) {
      setErrorMessage('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    resetNotice();
    try {
      const uploaded = await uploadMediaAssetFile.mutateAsync({
        data: {
          file,
          asset_kind: 'IMAGE',
          status: 'ACTIVE',
          metadata: {
            source: 'v2-product-cover-upload',
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

      setMessage('커버 이미지를 저장했습니다.');
    } catch (uploadError) {
      setErrorMessage(getErrorMessage(uploadError));
    }
  };

  const uploadDetailImages = async (files: File[]) => {
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
      const firstSortOrder = getNextDetailSortOrder(detailMedia);

      for (let index = 0; index < imageFiles.length; index += 1) {
        const file = imageFiles[index];
        const uploaded = await uploadMediaAssetFile.mutateAsync({
          data: {
            file,
            asset_kind: 'IMAGE',
            status: 'ACTIVE',
            metadata: {
              source: 'v2-product-detail-upload',
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
          },
        });
      }

      if (invalidCount > 0) {
        setMessage(
          `상세 이미지 ${imageFiles.length}장을 추가했습니다. 이미지가 아닌 ${invalidCount}개 파일은 제외했습니다.`,
        );
        return;
      }

      setMessage(`상세 이미지 ${imageFiles.length}장을 추가했습니다.`);
    } catch (uploadError) {
      setErrorMessage(getErrorMessage(uploadError));
    }
  };

  const deactivateMedia = async (mediaId: string, doneMessage: string) => {
    resetNotice();
    try {
      await deactivateProductMedia.mutateAsync(mediaId);
      setMessage(doneMessage);
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
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex min-h-[180px] items-center justify-center">
          <Loading size="md" text="상품 이미지 정보를 불러오는 중입니다." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
        상품 이미지 정보를 불러오지 못했습니다.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">상품 이미지</h2>
          <p className="mt-1 text-sm text-gray-500">
            커버(대표) 이미지 1장과 상세 이미지를 분리해 관리합니다.
          </p>
        </div>
        <Badge intent="info">상세 {detailMedia.length}장</Badge>
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

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">커버 이미지</h3>
          <p className="mt-1 text-xs text-gray-500">상점 목록/상세 상단에 보이는 대표 이미지</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {coverMedia?.public_url ? (
              <img
                src={coverMedia.public_url}
                alt={coverMedia.alt_text || `${product.title} 커버 이미지`}
                className="aspect-square h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-sm text-gray-400">
                등록된 커버 이미지가 없습니다.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <input
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
              disabled={isMutating}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadCoverImage(file);
                }
                event.target.value = '';
              }}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />

            <Button
              type="button"
              intent="danger"
              size="sm"
              disabled={!coverMedia}
              loading={deactivateProductMedia.isPending}
              onClick={() => {
                if (!coverMedia) {
                  return;
                }
                void deactivateMedia(coverMedia.id, '커버 이미지를 제거했습니다.');
              }}
            >
              커버 이미지 제거
            </Button>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">상세 이미지</h3>
          <p className="mt-1 text-xs text-gray-500">
            상세 페이지에서 순서대로 노출됩니다. (위/아래 버튼으로 순서 변경)
          </p>

          <div className="mt-4">
            <input
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
              multiple
              disabled={isMutating}
              onChange={(event) => {
                const fileList = event.target.files;
                if (fileList && fileList.length > 0) {
                  void uploadDetailImages(Array.from(fileList));
                }
                event.target.value = '';
              }}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>

          {detailMedia.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
              등록된 상세 이미지가 없습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {detailMedia.map((media, index) => {
                const canMoveUp = index > 0;
                const canMoveDown = index < detailMedia.length - 1;

                return (
                  <div
                    key={media.id}
                    className="rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="flex gap-3">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {media.public_url ? (
                          <img
                            src={media.public_url}
                            alt={media.alt_text || `${product.title} 상세 이미지`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                            NO IMAGE
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge intent="default" size="sm">
                            순서 {(index + 1) * 10}
                          </Badge>
                          {media.media_role === 'GALLERY' && (
                            <Badge intent="info" size="sm">
                              기존 GALLERY
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 truncate text-xs text-gray-500">
                          {media.public_url || media.storage_path}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        intent="neutral"
                        disabled={!canMoveUp || isMutating}
                        onClick={() => void moveDetailImage(media.id, -1)}
                      >
                        위로
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        intent="neutral"
                        disabled={!canMoveDown || isMutating}
                        onClick={() => void moveDetailImage(media.id, 1)}
                      >
                        아래로
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        intent="danger"
                        loading={deactivateProductMedia.isPending}
                        onClick={() =>
                          void deactivateMedia(media.id, '상세 이미지를 제거했습니다.')
                        }
                      >
                        제거
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
