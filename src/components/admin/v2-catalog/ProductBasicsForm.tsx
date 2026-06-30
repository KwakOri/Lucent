'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  adminActionRowClass,
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
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  DEFAULT_VARIANT_STATUS,
  FULFILLMENT_TYPE_LABELS,
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
  VARIANT_STATUS_LABELS,
  buildProductSlug,
} from '@/lib/client/utils/v2-product-admin-form';
import {
  formatPriceInputValue,
  normalizePriceInputValue,
} from '@/lib/client/utils/v2-price-input';
import type {
  ProductDefaultCampaignOption,
} from '@/lib/client/utils/v2-product-campaign-inclusion';

export type ProductCampaignInclusion = 'INCLUDED' | 'EXCLUDED';

export type ProductBasicsFormValues = {
  project_id: string;
  product_kind: V2ProductKind;
  fulfillment_type: V2FulfillmentType | null;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  status?: V2ProductStatus;
  default_variant_status?: V2VariantStatus;
  default_variant_base_price?: string | null;
  default_campaign_inclusion?: ProductCampaignInclusion;
};

type ProductBasicsFormProps = {
  mode: 'create' | 'edit';
  projects: V2Project[];
  initialValues: ProductBasicsFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  errorMessage?: string | null;
  showDefaultOptionSettings?: boolean;
  showCampaignInclusionSettings?: boolean;
  campaignOptions?: ProductDefaultCampaignOption[];
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
const VARIANT_STATUS_OPTIONS: V2VariantStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];
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

function getSegmentButtonClass(active: boolean): string {
  return `h-11 flex-1 rounded-[10px] border-0 px-3 text-sm font-black transition ${
    active
      ? 'bg-[#1a1a2e] text-white'
      : 'bg-transparent text-[#8a8678] hover:bg-[#f5f3e8] hover:text-[#1a1a2e]'
  }`;
}

function getInclusionButtonClass(active: boolean): string {
  return `min-h-[54px] flex-1 rounded-[14px] border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
    active
      ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white'
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
  showDefaultOptionSettings = false,
  showCampaignInclusionSettings = false,
  campaignOptions = [],
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
  const [defaultVariantStatus, setDefaultVariantStatus] = useState<V2VariantStatus>(
    initialValues.default_variant_status || DEFAULT_VARIANT_STATUS,
  );
  const [defaultVariantBasePrice, setDefaultVariantBasePrice] = useState(
    initialValues.default_variant_base_price || '',
  );
  const [campaignInclusionDraft, setCampaignInclusionDraft] = useState<
    ProductCampaignInclusion | null
  >(
    initialValues.default_campaign_inclusion || null,
  );

  const autoSlug = buildProductSlug(title);
  const effectiveSlug = mode === 'create' ? autoSlug : slug;
  const selectedCampaignOption = useMemo(
    () => campaignOptions.find((option) => option.projectId === projectId) || null,
    [campaignOptions, projectId],
  );
  const inferredCampaignInclusion: ProductCampaignInclusion =
    selectedCampaignOption?.excludedProductTargetId ? 'EXCLUDED' : 'INCLUDED';
  const campaignInclusion = campaignInclusionDraft || inferredCampaignInclusion;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (mode === 'create') {
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
      default_variant_status: showDefaultOptionSettings ? defaultVariantStatus : undefined,
      default_variant_base_price: showDefaultOptionSettings
        ? normalizePriceInputValue(defaultVariantBasePrice) || null
        : undefined,
      default_campaign_inclusion: showCampaignInclusionSettings
        ? campaignInclusion
        : undefined,
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
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setCampaignInclusionDraft(null);
                }}
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

          {showDefaultOptionSettings && (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className={softPanelClassName}>
                <p className="text-sm font-black text-[#1a1a2e]">기본 옵션 상태</p>
                <div className="mt-4 grid grid-cols-3 gap-1 rounded-[12px] border border-[#e7e3d3] bg-white p-1">
                  {VARIANT_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={getSegmentButtonClass(defaultVariantStatus === option)}
                      onClick={() => setDefaultVariantStatus(option)}
                    >
                      {VARIANT_STATUS_LABELS[option]}
                    </button>
                  ))}
                </div>
              </section>

              <section className={softPanelClassName}>
                <FormField
                  label="기본 판매가 (원)"
                  htmlFor="default-variant-base-price"
                  required={defaultVariantStatus === 'ACTIVE'}
                >
                  <Input
                    id="default-variant-base-price"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9,]*"
                    value={formatPriceInputValue(defaultVariantBasePrice)}
                    onChange={(event) =>
                      setDefaultVariantBasePrice(
                        normalizePriceInputValue(event.target.value),
                      )
                    }
                    placeholder="예: 10,000"
                    className={adminInputClass}
                  />
                </FormField>
              </section>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-4">
              <FormField
                label="한 줄 설명"
                htmlFor="product-short-description"
              >
                <Input
                  id="product-short-description"
                  value={shortDescription}
                  onChange={(event) => setShortDescription(event.target.value)}
                  placeholder="예: 디지털 음원과 보너스 콘텐츠를 한 번에"
                  className={adminInputClass}
                />
              </FormField>

              <FormField
                label="상세 설명"
                htmlFor="product-description"
              >
                <Textarea
                  id="product-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={7}
                  placeholder="상품 소개, 구성, 구매 전 안내를 자연스럽게 작성하세요."
                  className={adminInputClass}
                />
              </FormField>
            </section>

            <section className="space-y-4">
              {showCampaignInclusionSettings && (
                <div className={softPanelClassName}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-[#1a1a2e]">기본 캠페인 포함</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#6f6a5e]">
                      {selectedCampaignOption?.campaignName || '캠페인 없음'}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className={getInclusionButtonClass(campaignInclusion === 'INCLUDED')}
                      disabled={!selectedCampaignOption}
                      onClick={() => setCampaignInclusionDraft('INCLUDED')}
                    >
                      포함
                    </button>
                    <button
                      type="button"
                      className={getInclusionButtonClass(campaignInclusion === 'EXCLUDED')}
                      disabled={!selectedCampaignOption}
                      onClick={() => setCampaignInclusionDraft('EXCLUDED')}
                    >
                      미포함
                    </button>
                  </div>
                </div>
              )}

              {mode === 'edit' && (
                <div className={softPanelClassName}>
                  <p className="text-sm font-black text-[#1a1a2e]">판매 상태</p>
                  <div className="mt-4 grid grid-cols-3 gap-1 rounded-[12px] border border-[#e7e3d3] bg-white p-1">
                    {EDIT_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={getSegmentButtonClass(status === option)}
                        onClick={() => setStatus(option)}
                      >
                        {PRODUCT_STATUS_LABELS[option]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className={adminActionRowClass}>
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
