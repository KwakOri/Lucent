'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  adminButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
} from '@/src/components/admin/AdminDesignSystem';
import type {
  V2FulfillmentType,
  V2ProductKind,
  V2ProductStatus,
  V2Project,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  FULFILLMENT_TYPE_LABELS,
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
  buildProductSlug,
} from '@/lib/client/utils/v2-product-admin-form';

export type ProductBasicsFormValues = {
  project_id: string;
  product_kind: V2ProductKind;
  fulfillment_type: V2FulfillmentType | null;
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
const FULFILLMENT_TYPE_OPTIONS: V2FulfillmentType[] = ['DIGITAL', 'PHYSICAL'];
const formSectionClassName =
  'rounded-[22px] border border-[#e7e3d3] bg-white p-5 shadow-none sm:p-6';
const softPanelClassName =
  'rounded-[16px] border border-[#eee7d6] bg-[#faf9f3] px-4 py-4';

function getChoiceButtonClass(active: boolean): string {
  return `rounded-[16px] border px-4 py-4 text-left transition ${
    active
      ? 'border-[#1a1a2e] bg-[#f5f3e8] text-[#1a1a2e]'
      : 'border-[#e7e3d3] bg-white text-[#1a1a2e] hover:border-[#d8d1bd] hover:bg-[#faf9f3]'
  }`;
}

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
  const [fulfillmentType, setFulfillmentType] = useState<V2FulfillmentType>(
    initialValues.fulfillment_type || 'DIGITAL',
  );
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
      fulfillment_type: productKind === 'STANDARD' ? fulfillmentType : null,
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
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <section className={formSectionClassName}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-[#1a1a2e]">기본 정보</h2>
          <p className="text-sm font-medium text-[#1a1a2e]/55">
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
                className={adminSelectClass}
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
                className={adminInputClass}
              />
            </FormField>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-black text-[#1a1a2e]">상품 유형</p>
              <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
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
                    className={getChoiceButtonClass(active)}
                  >
                    <p className="text-sm font-black">{option.title}</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#1a1a2e]/55">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-black text-[#1a1a2e]">상품 제공 방식</p>
              <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
                STANDARD 상품은 여기서 디지털/실물 유형을 고정합니다.
              </p>
            </div>

            {productKind === 'STANDARD' ? (
              <div className="grid gap-3 md:grid-cols-2">
                {FULFILLMENT_TYPE_OPTIONS.map((option) => {
                  const active = fulfillmentType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFulfillmentType(option)}
                      className={getChoiceButtonClass(active)}
                    >
                      <p className="text-sm font-black">
                        {FULFILLMENT_TYPE_LABELS[option]}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-[#1a1a2e]/55">
                        {option === 'DIGITAL'
                          ? '옵션은 디지털 형식으로 고정되며 배송이 필요하지 않습니다.'
                          : '옵션은 실물 형식으로 고정되며 배송/재고 관리를 사용할 수 있습니다.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-[#e7e3d3] bg-[#faf9f3] px-4 py-4 text-sm font-medium text-[#1a1a2e]/60">
                <p>
                  번들 상품은 하위 구성에 따라 디지털/실물이 섞일 수 있어 상품 수준 제공 방식은
                  고정하지 않습니다.
                </p>
                <p className="mt-2 text-xs text-[#1a1a2e]/45">
                  저장 후 상품 상세의 `번들 구성 상품` 영역에서 포함 상품과 수량 정책을 확정합니다.
                </p>
              </div>
            )}
          </div>

          <div className={softPanelClassName}>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[#1a1a2e]">상품 주소</p>
                <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
                  상품명 기준으로 자동 생성되며, 필요할 때만 직접 수정합니다.
                </p>
              </div>
              <Button
                type="button"
                intent="neutral"
                size="sm"
                className={adminButtonClass}
                onClick={() => {
                  setShowAdvanced((prev) => !prev);
                  setManualSlug(true);
                }}
              >
                {showAdvanced ? '고급 설정 닫기' : '고급 설정 열기'}
              </Button>
            </div>

            <div className="mt-3 rounded-[14px] border border-[#e7e3d3] bg-white px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-[#1a1a2e]/40">
                Preview
              </p>
              <p className="mt-1 text-sm font-bold text-[#1a1a2e]">
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
                className={adminInputClass}
              />
            </FormField>

            {mode === 'edit' && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-black text-[#1a1a2e]">판매 상태</p>
                  <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
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
                      className={status === option ? adminPrimaryButtonClass : adminButtonClass}
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
              className={adminInputClass}
            />
          </FormField>

          {showAdvanced && (
            <section className="rounded-[16px] border border-dashed border-[#e7e3d3] bg-[#faf9f3] px-4 py-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black text-[#1a1a2e]">고급 설정</h3>
                <p className="text-sm font-medium text-[#1a1a2e]/55">
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
                    className={adminInputClass}
                  />
                </FormField>

                {mode === 'edit' && (
                  <div className="space-y-3">
                    <p className="text-sm font-black text-[#1a1a2e]">보관 상태</p>
                    <p className="text-sm font-medium text-[#1a1a2e]/55">
                      더 이상 운영하지 않는 상품은 보관할 수 있습니다.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      intent={status === 'ARCHIVED' ? 'danger' : 'neutral'}
                      className={
                        status === 'ARCHIVED'
                          ? '!rounded-[12px] !bg-[#ca2a30] !font-bold !text-white hover:!bg-[#b0242a]'
                          : adminButtonClass
                      }
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
            <Button type="submit" className={adminPrimaryButtonClass} loading={isSubmitting}>
              {submitLabel}
            </Button>
            <Button type="button" intent="neutral" className={adminButtonClass} onClick={onCancel}>
              취소
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
