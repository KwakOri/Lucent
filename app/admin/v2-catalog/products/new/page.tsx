'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2ProductKind,
  V2ProductStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2Product,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const PRODUCT_STATUS_VALUES: V2ProductStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];
const PRODUCT_KIND_VALUES: V2ProductKind[] = ['STANDARD', 'BUNDLE'];
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

export default function V2CatalogProductCreatePage() {
  const router = useRouter();
  const createProduct = useCreateV2Product();

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();

  const activeProjects = useMemo(
    () => (projects || []).filter((project) => project.status !== 'ARCHIVED'),
    [projects],
  );

  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [productKind, setProductKind] = useState<V2ProductKind>('STANDARD');
  const [status, setStatus] = useState<V2ProductStatus>('DRAFT');
  const [sortOrder, setSortOrder] = useState('0');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await createProduct.mutateAsync({
        project_id: projectId.trim(),
        title: title.trim(),
        slug: slug.trim(),
        product_kind: productKind,
        status,
        sort_order: parseNonNegativeInteger(sortOrder, 'sort_order'),
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
      });
      router.push('/admin/v2-catalog/products');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  if (projectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="프로젝트 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectsError || !projects) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          프로젝트 목록을 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 상품 생성</h1>
          <p className="mt-1 text-sm text-gray-500">새 상품을 등록합니다.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
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
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleCreateProduct}>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className={SELECT_CLASS}
            required
          >
            <option value="">프로젝트 선택</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.slug})
              </option>
            ))}
          </select>
          <Input
            placeholder="상품명"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Input
            placeholder="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />
          <select
            value={productKind}
            onChange={(event) => setProductKind(event.target.value as V2ProductKind)}
            className={SELECT_CLASS}
          >
            {PRODUCT_KIND_VALUES.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as V2ProductStatus)}
            className={SELECT_CLASS}
          >
            {PRODUCT_STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
          <Input
            placeholder="sort_order"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
          <div className="lg:col-span-3">
            <Input
              placeholder="짧은 설명 (선택)"
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <Textarea
              placeholder="상세 설명 (선택)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="lg:col-span-3 flex gap-2">
            <Button type="submit" loading={createProduct.isPending}>
              생성
            </Button>
            <Button
              type="button"
              intent="neutral"
              onClick={() => router.push('/admin/v2-catalog/products')}
            >
              취소
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
