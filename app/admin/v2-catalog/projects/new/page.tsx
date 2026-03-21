'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useCreateV2Project } from '@/lib/client/hooks/useV2CatalogAdmin';

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

export default function V2CatalogProjectCreatePage() {
  const router = useRouter();
  const createProject = useCreateV2Project();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await createProject.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
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
            placeholder="cover_image_url (선택)"
            value={coverImageUrl}
            onChange={(event) => setCoverImageUrl(event.target.value)}
          />
          <Input
            placeholder="sort_order"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
          <div className="md:col-span-2">
            <Textarea
              placeholder="설명 (선택)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" loading={createProject.isPending}>
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
