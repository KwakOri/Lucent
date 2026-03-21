'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { Input, Textarea } from '@/components/ui/input';
import {
  useCreateV2Project,
  useUploadV2MediaAssetFile,
} from '@/lib/client/hooks/useV2CatalogAdmin';

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

function isImageFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
}

export default function V2CatalogProjectCreatePage() {
  const router = useRouter();
  const createProject = useCreateV2Project();
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverMediaAssetId, setCoverMediaAssetId] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCover = coverMediaAssetId.trim().length > 0;
  const isSubmitting = createProject.isPending || uploadMediaAssetFile.isPending;

  const handleUploadProjectCover = async (file: File) => {
    if (!isImageFile(file)) {
      setErrorMessage('커버 이미지는 이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setErrorMessage(null);
    setMessage(null);

    try {
      const uploaded = await uploadMediaAssetFile.mutateAsync({
        data: {
          file,
          asset_kind: 'IMAGE',
          status: 'ACTIVE',
          metadata: {
            source: 'v2-project-cover-upload',
          },
        },
      });
      setCoverMediaAssetId(uploaded.data.id);
      setCoverPreviewUrl(uploaded.data.public_url || null);
      setCoverFileName(uploaded.data.file_name || file.name);
      setMessage('프로젝트 커버 이미지를 연결했습니다.');
    } catch (uploadError) {
      setErrorMessage(getErrorMessage(uploadError));
    }
  };

  const clearProjectCover = () => {
    setCoverMediaAssetId('');
    setCoverPreviewUrl(null);
    setCoverFileName('');
    setMessage('프로젝트 커버 연결을 해제했습니다. 저장하면 반영됩니다.');
  };

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    try {
      await createProject.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        cover_media_asset_id: coverMediaAssetId.trim() || null,
        sort_order: parseNonNegativeInteger(sortOrder, 'sort_order'),
      });
      router.push('/admin/v2-catalog/projects');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 프로젝트 생성</h1>
          <p className="mt-1 text-sm text-gray-500">새 프로젝트를 등록합니다.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/projects')}>
            목록으로
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleCreateProject}>
          <Input
            placeholder="프로젝트명"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            placeholder="slug (예: jennie-solo)"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />
          <Input
            placeholder="sort_order"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
          <div className="md:col-span-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">커버 이미지 (선택)</label>
              {coverPreviewUrl ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreviewUrl}
                    alt="프로젝트 커버 미리보기"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
                  {hasCover
                    ? '커버가 연결되어 있습니다. (public URL이 없어 미리보기는 표시되지 않습니다)'
                    : '커버 이미지를 설정하지 않았습니다.'}
                </div>
              )}
              {coverFileName ? (
                <p className="mt-2 text-xs text-gray-500">최근 업로드 파일: {coverFileName}</p>
              ) : null}
              {hasCover && !coverFileName ? (
                <p className="mt-2 break-all text-xs text-gray-500">연결된 asset ID: {coverMediaAssetId}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <FileInput
                triggerLabel={uploadMediaAssetFile.isPending ? '업로드 중...' : '커버 이미지 선택'}
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
                disabled={isSubmitting}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleUploadProjectCover(file);
                  }
                  event.target.value = '';
                }}
              />
              <Button
                type="button"
                intent="neutral"
                onClick={clearProjectCover}
                disabled={!hasCover || isSubmitting}
              >
                커버 해제
              </Button>
            </div>
          </div>
          <div className="md:col-span-2">
            <Textarea
              placeholder="설명 (선택)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" loading={isSubmitting}>
              생성
            </Button>
            <Button
              type="button"
              intent="neutral"
              onClick={() => router.push('/admin/v2-catalog/projects')}
            >
              취소
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
