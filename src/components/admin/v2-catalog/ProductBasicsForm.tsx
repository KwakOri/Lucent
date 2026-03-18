'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type {
  V2ProductKind,
  V2ProductStatus,
  V2Project,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
  buildProductSlug,
} from '@/lib/client/utils/v2-product-admin-form';

export type ProductBasicsFormValues = {
  project_id: string;
  product_kind: V2ProductKind;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  status?: V2ProductStatus;
};

type ProductBasicsFormProps = {
  mode: 'create' | 'edit';
  projects: V2Project[];
  initialValues: ProductBasicsFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: ProductBasicsFormValues) => Promise<void>;
};

const PRODUCT_KIND_OPTIONS: Array<{
  value: V2ProductKind;
  title: string;
  description: string;
}> = [
  {
    value: 'STANDARD',
    title: PRODUCT_KIND_LABELS.STANDARD,
    description: '하나의 상품을 만들고, 아래에서 옵션을 추가합니다.',
  },
  {
    value: 'BUNDLE',
    title: PRODUCT_KIND_LABELS.BUNDLE,
    description: '여러 상품을 묶는 대표 상품입니다. 기본 정보부터 저장합니다.',
  },
];

const EDIT_STATUS_OPTIONS: V2ProductStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];

export function ProductBasicsForm({
  mode,
  projects,
  initialValues,
  isSubmitting,
  submitLabel,
  errorMessage,
  onCancel,
  onSubmit,
}: ProductBasicsFormProps) {
  const [projectId, setProjectId] = useState(initialValues.project_id);
  const [productKind, setProductKind] = useState<V2ProductKind>(initialValues.product_kind);
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [shortDescription, setShortDescription] = useState(
    initialValues.short_description || '',
  );
  const [description, setDescription] = useState(initialValues.description || '');
  const [status, setStatus] = useState<V2ProductStatus>(
    initialValues.status || 'DRAFT',
  );
  const [showAdvanced, setShowAdvanced] = useState(mode === 'edit');
  const [manualSlug, setManualSlug] = useState(mode === 'edit');

  const autoSlug = buildProductSlug(title);
  const effectiveSlug = manualSlug ? slug : autoSlug;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (mode === 'create' && !manualSlug) {
      setSlug(buildProductSlug(value));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      project_id: projectId.trim(),
      product_kind: productKind,
      title: title.trim(),
      slug: effectiveSlug.trim(),
      short_description: shortDescription.trim() || null,
      description: description.trim() || null,
      status: mode === 'edit' ? status : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
          <p className="text-sm text-gray-500">
            꼭 필요한 정보만 먼저 입력하세요. 내부 코드는 자동으로 정리합니다.
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="프로젝트"
              htmlFor="product-project"
              required
              help="이 상품이 속한 프로젝트를 선택합니다."
            >
              <Select
                id="product-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                options={projects.map((project) => ({
                  value: project.id,
                  label: `${project.name} (${project.slug})`,
                }))}
                placeholder="프로젝트를 선택하세요"
                required
              />
            </FormField>

            <FormField
              label="상품명"
              htmlFor="product-title"
              required
              help="고객과 운영자가 모두 보는 이름입니다."
            >
              <Input
                id="product-title"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="예: 봄 시즌 디지털 팩"
                required
              />
            </FormField>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text-primary">상품 유형</p>
              <p className="mt-1 text-sm text-gray-500">
                먼저 개별 상품인지, 여러 상품을 묶는 번들인지 선택합니다.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {PRODUCT_KIND_OPTIONS.map((option) => {
                const active = productKind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setProductKind(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{option.title}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">상품 주소</p>
                <p className="mt-1 text-sm text-gray-500">
                  상품명 기준으로 자동 생성되며, 필요할 때만 직접 수정합니다.
                </p>
              </div>
              <Button
                type="button"
                intent="neutral"
                size="sm"
                onClick={() => {
                  setShowAdvanced((prev) => !prev);
                  setManualSlug(true);
                }}
              >
                {showAdvanced ? '고급 설정 닫기' : '고급 설정 열기'}
              </Button>
            </div>

            <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Preview
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                /shop/{effectiveSlug || autoSlug}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="한 줄 설명"
              htmlFor="product-short-description"
              help="목록이나 카드에서 먼저 보일 짧은 소개입니다."
            >
              <Input
                id="product-short-description"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                placeholder="예: 디지털 음원과 보너스 콘텐츠를 한 번에"
              />
            </FormField>

            {mode === 'edit' && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">판매 상태</p>
                  <p className="mt-1 text-sm text-gray-500">
                    고객에게 어떻게 보일지 선택하세요.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EDIT_STATUS_OPTIONS.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      intent={status === option ? 'primary' : 'neutral'}
                      onClick={() => setStatus(option)}
                    >
                      {PRODUCT_STATUS_LABELS[option]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <FormField
            label="상세 설명"
            htmlFor="product-description"
            help="상세 페이지에서 보여줄 긴 설명입니다."
          >
            <Textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="상품 소개, 구성, 구매 전 안내를 자연스럽게 작성하세요."
            />
          </FormField>

          {showAdvanced && (
            <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-gray-900">고급 설정</h3>
                <p className="text-sm text-gray-500">
                  일반적으로는 수정할 필요 없는 내부 설정입니다.
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  label="Slug 직접 수정"
                  htmlFor="product-slug"
                  help="링크 주소를 유지해야 할 때만 수정하세요."
                >
                  <Input
                    id="product-slug"
                    value={slug}
                    onChange={(event) => {
                      setManualSlug(true);
                      setSlug(event.target.value);
                    }}
                    placeholder={autoSlug}
                  />
                </FormField>

                {mode === 'edit' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text-primary">보관 상태</p>
                    <p className="text-sm text-gray-500">
                      더 이상 운영하지 않는 상품은 보관할 수 있습니다.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      intent={status === 'ARCHIVED' ? 'danger' : 'neutral'}
                      onClick={() => setStatus('ARCHIVED')}
                    >
                      {PRODUCT_STATUS_LABELS.ARCHIVED}
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={isSubmitting}>
              {submitLabel}
            </Button>
            <Button type="button" intent="neutral" onClick={onCancel}>
              취소
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
