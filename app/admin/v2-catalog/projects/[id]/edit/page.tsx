'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  AdminSurface,
  adminButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
} from '@/src/components/admin/AdminDesignSystem';
import type { V2Project, V2ProjectStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useUploadV2MediaAssetFile,
  useUpdateV2Project,
  useV2AdminProject,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const STATUS_VALUES: V2ProjectStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

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

type ProjectEditFormProps = {
  project: V2Project;
  onCancel: () => void;
};

function ProjectEditForm({ project, onCancel }: ProjectEditFormProps) {
  const updateProject = useUpdateV2Project();
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();

  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [description, setDescription] = useState(project.description || '');
  const [coverMediaAssetId, setCoverMediaAssetId] = useState(project.cover_media_asset_id || '');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    project.cover_media_asset?.public_url || null,
  );
  const [coverFileName, setCoverFileName] = useState(project.cover_media_asset?.file_name || '');
  const [sortOrder, setSortOrder] = useState(String(project.sort_order));
  const [status, setStatus] = useState<V2ProjectStatus>(project.status);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCover = coverMediaAssetId.trim().length > 0;
  const isSubmitting = updateProject.isPending || uploadMediaAssetFile.isPending;

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
            project_id: project.id,
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

  const handleUpdateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          cover_media_asset_id: coverMediaAssetId.trim() || null,
          sort_order: parseNonNegativeInteger(sortOrder, 'sort_order'),
          status,
          is_active: status === 'ACTIVE',
        },
      });
      onCancel();
    } catch (updateError) {
      setErrorMessage(getErrorMessage(updateError));
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}
      {message && (
        <div className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      <AdminSurface padding="lg">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleUpdateProject}>
          <Input
            placeholder="프로젝트명"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={adminInputClass}
          />
          <Input
            placeholder="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            className={adminInputClass}
          />
          <Input
            placeholder="sort_order"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className={adminInputClass}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as V2ProjectStatus)}
            className={adminSelectClass}
          >
            {STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
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
              className={adminButtonClass}
              onClick={clearProjectCover}
              disabled={!hasCover || isSubmitting}
            >
              커버 해제
            </Button>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[#1a1a2e]">커버 이미지 (선택)</label>
            {coverPreviewUrl ? (
              <div className="overflow-hidden rounded-[16px] border border-[#e7e3d3] bg-[#faf9f3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreviewUrl}
                  alt="프로젝트 커버 미리보기"
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[16px] border border-dashed border-[#e7e3d3] bg-[#faf9f3] px-4 text-center text-sm font-medium text-[#1a1a2e]/55">
                {hasCover
                  ? '커버가 연결되어 있습니다. (public URL이 없어 미리보기는 표시되지 않습니다)'
                  : '커버 이미지를 설정하지 않았습니다.'}
              </div>
            )}
            {coverFileName ? (
              <p className="mt-2 text-xs font-medium text-[#1a1a2e]/45">최근 업로드 파일: {coverFileName}</p>
            ) : null}
            {hasCover && !coverFileName ? (
              <p className="mt-2 break-all text-xs font-medium text-[#1a1a2e]/45">연결된 asset ID: {coverMediaAssetId}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Textarea
              placeholder="설명"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={adminInputClass}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" className={adminPrimaryButtonClass} loading={isSubmitting}>
              저장
            </Button>
            <Button type="button" intent="neutral" className={adminButtonClass} onClick={onCancel}>
              취소
            </Button>
          </div>
        </form>
      </AdminSurface>
    </>
  );
}

export default function V2CatalogProjectEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const projectId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: project, isLoading, error } = useV2AdminProject(projectId);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="프로젝트 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          프로젝트 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push('/admin/v2-catalog/projects')}>
          프로젝트 목록
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="project form"
        title="v2 프로젝트 수정"
        description={`${project.name} 정보를 수정합니다.`}
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}`)}>
            상세로 돌아가기
          </Button>
        }
      />

      <ProjectEditForm
        project={project}
        onCancel={() => router.push(`/admin/v2-catalog/projects/${project.id}`)}
      />
    </div>
  );
}
