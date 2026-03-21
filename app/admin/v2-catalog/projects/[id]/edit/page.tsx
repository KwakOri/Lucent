'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type { V2Project, V2ProjectStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useUpdateV2Project,
  useV2AdminProject,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const STATUS_VALUES: V2ProjectStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
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

type ProjectEditFormProps = {
  project: V2Project;
  onCancel: () => void;
};

function ProjectEditForm({ project, onCancel }: ProjectEditFormProps) {
  const updateProject = useUpdateV2Project();

  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [description, setDescription] = useState(project.description || '');
  const [coverImageUrl, setCoverImageUrl] = useState(project.cover_image_url || '');
  const [sortOrder, setSortOrder] = useState(String(project.sort_order));
  const [status, setStatus] = useState<V2ProjectStatus>(project.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          cover_image_url: coverImageUrl.trim() || null,
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleUpdateProject}>
          <Input
            placeholder="프로젝트명"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            placeholder="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />
          <Input
            placeholder="cover_image_url"
            value={coverImageUrl}
            onChange={(event) => setCoverImageUrl(event.target.value)}
          />
          <Input
            placeholder="sort_order"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as V2ProjectStatus)}
            className={SELECT_CLASS}
          >
            {STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
          <div />
          <div className="md:col-span-2">
            <Textarea
              placeholder="설명"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" loading={updateProject.isPending}>
              저장
            </Button>
            <Button type="button" intent="neutral" onClick={onCancel}>
              취소
            </Button>
          </div>
        </form>
      </section>
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          프로젝트 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/projects')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 프로젝트 수정</h1>
          <p className="mt-1 text-sm text-gray-500">{project.name} 정보를 수정합니다.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/projects')}>
            목록으로
          </Button>
        </div>
      </div>

      <ProjectEditForm
        project={project}
        onCancel={() => router.push('/admin/v2-catalog/projects')}
      />
    </div>
  );
}
