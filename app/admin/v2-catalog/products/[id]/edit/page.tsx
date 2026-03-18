'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2Product,
  V2ProductKind,
  V2ProductStatus,
  V2Project,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useUpdateV2Product,
  useV2AdminProduct,
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

type ProductEditFormProps = {
  product: V2Product;
  projects: V2Project[];
  onCancel: () => void;
};

function ProductEditForm({ product, projects, onCancel }: ProductEditFormProps) {
  const updateProduct = useUpdateV2Product();

  const [projectId, setProjectId] = useState(product.project_id);
  const [title, setTitle] = useState(product.title);
  const [slug, setSlug] = useState(product.slug);
  const [productKind, setProductKind] = useState<V2ProductKind>(product.product_kind);
  const [status, setStatus] = useState<V2ProductStatus>(product.status);
  const [sortOrder, setSortOrder] = useState(String(product.sort_order));
  const [shortDescription, setShortDescription] = useState(product.short_description || '');
  const [description, setDescription] = useState(product.description || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: {
          project_id: projectId.trim(),
          title: title.trim(),
          slug: slug.trim(),
          product_kind: productKind,
          status,
          sort_order: parseNonNegativeInteger(sortOrder, 'sort_order'),
          short_description: shortDescription.trim() || null,
          description: description.trim() || null,
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
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleUpdateProduct}>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className={SELECT_CLASS}
            required
          >
            <option value="">프로젝트 선택</option>
            {projects.map((projectOption) => (
              <option key={projectOption.id} value={projectOption.id}>
                {projectOption.name} ({projectOption.slug})
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
            <Button type="submit" loading={updateProduct.isPending}>
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

export default function V2CatalogProductEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const productId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();
  const { data: product, isLoading, error } = useV2AdminProduct(productId);

  if (isLoading || projectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || projectsError || !product || !projects) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          상품 정보를 불러오지 못했습니다.
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
          <h1 className="text-2xl font-bold text-gray-900">v2 상품 수정</h1>
          <p className="mt-1 text-sm text-gray-500">{product.title} 정보를 수정합니다.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/products')}>
            목록으로
          </Button>
        </div>
      </div>

      <ProductEditForm
        product={product}
        projects={projects}
        onCancel={() => router.push('/admin/v2-catalog/products')}
      />
    </div>
  );
}
