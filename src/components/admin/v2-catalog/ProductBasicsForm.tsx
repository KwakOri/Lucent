'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
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
  cover_image_file?: File | null;
  detail_image_files?: File[];
};

type ProductBasicsFormProps = {
  mode: 'create' | 'edit';
  projects: V2Project[];
  initialValues: ProductBasicsFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  formId?: string;
  hideActions?: boolean;
  errorMessage?: string | null;
  showDefaultOptionSettings?: boolean;
  showCampaignInclusionSettings?: boolean;
  campaignOptions?: ProductDefaultCampaignOption[];
  mediaContent?: ReactNode;
  advancedContent?: ReactNode;
  advancedAction?: ReactNode;
  advancedTitle?: string;
  advancedDescription?: string;
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
const controlPanelClassName =
  'min-h-[128px] rounded-[16px] border border-[#eee7d6] bg-[#faf9f3] px-4 py-4';
const mediaPreviewPanelClassName =
  'rounded-[14px] border border-[#e7e3d3] bg-white';
const fileTriggerClassName =
  '!h-11 !rounded-[11px] !border-0 !bg-[#f5f3e8] !px-4 !text-sm !font-bold !text-[#1a1a2e] hover:!bg-[#ece8d9]';

type ImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

function getSegmentButtonClass(active: boolean): string {
  return `h-11 flex-1 rounded-[10px] border-0 px-3 text-sm font-black transition ${
    active
      ? 'bg-[#1a1a2e] text-white'
      : 'bg-transparent text-[#8a8678] hover:bg-[#f5f3e8] hover:text-[#1a1a2e]'
  }`;
}

function getTwoOptionButtonClass(active: boolean, disabled = false): string {
  if (disabled && active) {
    return 'min-h-[54px] flex-1 cursor-default rounded-[14px] bg-[#1a1a2e] px-4 text-sm font-black text-white transition';
  }
  if (disabled) {
    return 'min-h-[54px] flex-1 cursor-not-allowed rounded-[14px] bg-transparent px-4 text-sm font-black text-[#b3aea2] opacity-55 transition';
  }
  return `min-h-[54px] flex-1 rounded-[14px] px-4 text-sm font-black transition ${
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

function isImageFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024)).toLocaleString()}KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function createImageDraft(file: File): ImageDraft {
  const fallbackId = `${Date.now()}-${file.name}-${file.size}`;
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : fallbackId,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function ProductBasicsForm({
  mode,
  projects,
  initialValues,
  isSubmitting,
  submitLabel,
  formId,
  hideActions = false,
  errorMessage,
  showDefaultOptionSettings = false,
  showCampaignInclusionSettings = false,
  campaignOptions = [],
  mediaContent,
  advancedContent,
  advancedAction,
  advancedTitle = '고급 옵션',
  advancedDescription = '옵션, 수량 정책, 재고와 전달 방식을 한곳에서 정리합니다.',
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
  const [coverImageDraft, setCoverImageDraft] = useState<ImageDraft | null>(null);
  const [detailImageDrafts, setDetailImageDrafts] = useState<ImageDraft[]>([]);
  const [mediaErrorMessage, setMediaErrorMessage] = useState<string | null>(null);
  const previewUrlSetRef = useRef<Set<string>>(new Set());

  const autoSlug = buildProductSlug(title);
  const effectiveSlug = mode === 'create' ? autoSlug : slug;
  const selectedCampaignOption = useMemo(
    () => campaignOptions.find((option) => option.projectId === projectId) || null,
    [campaignOptions, projectId],
  );
  const inferredCampaignInclusion: ProductCampaignInclusion =
    selectedCampaignOption?.excludedProductTargetId ? 'EXCLUDED' : 'INCLUDED';
  const campaignInclusion = campaignInclusionDraft || inferredCampaignInclusion;

  useEffect(() => {
    const previewUrls = previewUrlSetRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  const registerImageDraft = (file: File): ImageDraft => {
    const draft = createImageDraft(file);
    previewUrlSetRef.current.add(draft.previewUrl);
    return draft;
  };

  const revokeImageDraft = (draft: ImageDraft) => {
    URL.revokeObjectURL(draft.previewUrl);
    previewUrlSetRef.current.delete(draft.previewUrl);
  };

  const handleCoverImageChange = (file: File) => {
    if (!isImageFile(file)) {
      setMediaErrorMessage('대표 이미지는 이미지 파일만 선택할 수 있습니다.');
      return;
    }

    setMediaErrorMessage(null);
    const nextDraft = registerImageDraft(file);
    setCoverImageDraft((current) => {
      if (current) {
        revokeImageDraft(current);
      }
      return nextDraft;
    });
  };

  const handleDetailImagesChange = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => isImageFile(file));
    if (imageFiles.length === 0) {
      setMediaErrorMessage('상세 이미지는 이미지 파일만 선택할 수 있습니다.');
      return;
    }

    const invalidCount = files.length - imageFiles.length;
    setMediaErrorMessage(
      invalidCount > 0 ? `이미지가 아닌 ${invalidCount}개 파일은 제외했습니다.` : null,
    );
    const nextDrafts = imageFiles.map((file) => registerImageDraft(file));
    setDetailImageDrafts((current) => [...current, ...nextDrafts]);
  };

  const removeCoverImageDraft = () => {
    setCoverImageDraft((current) => {
      if (current) {
        revokeImageDraft(current);
      }
      return null;
    });
  };

  const removeDetailImageDraft = (draftId: string) => {
    setDetailImageDrafts((current) => {
      const target = current.find((draft) => draft.id === draftId);
      if (target) {
        revokeImageDraft(target);
      }
      return current.filter((draft) => draft.id !== draftId);
    });
  };

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
      status,
      default_variant_status: showDefaultOptionSettings ? defaultVariantStatus : undefined,
      default_variant_base_price: showDefaultOptionSettings
        ? normalizePriceInputValue(defaultVariantBasePrice) || null
        : undefined,
      default_campaign_inclusion: showCampaignInclusionSettings
        ? campaignInclusion
        : undefined,
      cover_image_file: coverImageDraft?.file || null,
      detail_image_files: detailImageDrafts.map((draft) => draft.file),
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

        <form id={formId} className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:items-start">
            <section className={controlPanelClassName}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#1a1a2e]">상품 이미지</p>
                  <p className="mt-1 text-xs font-medium text-[#1a1a2e]/55">
                    대표 이미지와 상세 이미지를 관리합니다.
                  </p>
                </div>
                {!mediaContent && detailImageDrafts.length > 0 && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#6f6a5e]">
                    상세 {detailImageDrafts.length}장
                  </span>
                )}
              </div>

              {mediaContent || (
                <>
                  {mediaErrorMessage && (
                    <div className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                      {mediaErrorMessage}
                    </div>
                  )}

                  <div className="mt-5 grid gap-5">
                    <div>
                      <p className="text-xs font-black text-[#1a1a2e]">대표 이미지</p>
                      <div className={`mt-3 overflow-hidden ${mediaPreviewPanelClassName}`}>
                        {coverImageDraft ? (
                          <div
                            role="img"
                            aria-label="선택한 대표 이미지 미리보기"
                            className="aspect-square bg-cover bg-center"
                            style={{ backgroundImage: `url(${coverImageDraft.previewUrl})` }}
                          />
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-[#f5f3e8] text-[#b3aea2]">
                            <div className="text-center">
                              <ImageIcon className="mx-auto h-8 w-8" strokeWidth={1.6} aria-hidden />
                              <div className="mt-2 text-xs font-bold">대표 이미지</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <FileInput
                          triggerLabel={coverImageDraft ? '대표 이미지 변경' : '대표 이미지 선택'}
                          triggerClassName={fileTriggerClassName}
                          accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
                          disabled={isSubmitting}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              handleCoverImageChange(file);
                            }
                            event.target.value = '';
                          }}
                        />
                      </div>

                      {coverImageDraft && (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-[12px] bg-white px-3 py-2 text-xs font-bold text-[#6f6a5e]">
                          <span className="min-w-0 truncate">
                            {coverImageDraft.file.name}
                          </span>
                          <button
                            type="button"
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#8a8678] hover:bg-[#f5f3e8] hover:text-[#1a1a2e]"
                            aria-label="대표 이미지 제거"
                            onClick={removeCoverImageDraft}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black text-[#1a1a2e]">상세 이미지</p>
                        <span className="text-xs font-bold text-[#1a1a2e]/45">
                          순서대로 노출
                        </span>
                      </div>

                      {detailImageDrafts.length === 0 ? (
                        <div className="mt-3 flex min-h-[180px] items-center justify-center rounded-[14px] border border-dashed border-[#d9d4c3] bg-white px-4 py-6 text-center text-sm font-bold text-[#b3aea2]">
                          상세 이미지를
                          <br />
                          선택하세요
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-3">
                          {detailImageDrafts.map((draft, index) => (
                            <div
                              key={draft.id}
                              className="rounded-[14px] border border-[#e7e3d3] bg-white p-2"
                            >
                              <div className="flex gap-3">
                                <div
                                  role="img"
                                  aria-label={`선택한 상세 이미지 ${index + 1} 미리보기`}
                                  className="h-16 w-16 flex-shrink-0 rounded-[10px] bg-cover bg-center"
                                  style={{ backgroundImage: `url(${draft.previewUrl})` }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-black text-[#1a1a2e]">
                                      상세 {index + 1}
                                    </span>
                                    <button
                                      type="button"
                                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#8a8678] hover:bg-[#f5f3e8] hover:text-[#1a1a2e]"
                                      aria-label={`상세 이미지 ${index + 1} 제거`}
                                      onClick={() => removeDetailImageDraft(draft.id)}
                                      disabled={isSubmitting}
                                    >
                                      <X className="h-4 w-4" aria-hidden />
                                    </button>
                                  </div>
                                  <p className="mt-1 truncate text-xs font-bold text-[#6f6a5e]">
                                    {draft.file.name}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">
                                    {formatFileSize(draft.file.size)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3">
                        <FileInput
                          triggerLabel="상세 이미지 선택 (여러 장)"
                          triggerClassName={fileTriggerClassName}
                          accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.svg"
                          multiple
                          disabled={isSubmitting}
                          onChange={(event) => {
                            const fileList = event.target.files;
                            if (fileList && fileList.length > 0) {
                              handleDetailImagesChange(Array.from(fileList));
                            }
                            event.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="space-y-4">
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

              <section className={controlPanelClassName}>
                <FormField
                  label="한 줄 설명"
                  htmlFor="product-short-description"
                >
                  <Input
                    id="product-short-description"
                    value={shortDescription}
                    onChange={(event) => setShortDescription(event.target.value)}
                    placeholder="예: 디지털 음원과 보너스 콘텐츠를 한 번에"
                    className={`${adminInputClass} !mt-4`}
                  />
                </FormField>
              </section>

              <section className={controlPanelClassName}>
                <FormField
                  label="상세 설명"
                  htmlFor="product-description"
                >
                  <Textarea
                    id="product-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={8}
                    placeholder="상품 소개, 구성, 구매 전 안내를 자연스럽게 작성하세요."
                    className={`${adminInputClass} !mt-4`}
                  />
                </FormField>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <section className={controlPanelClassName}>
                  <p className="text-sm font-black text-[#1a1a2e]">상품 유형</p>
                  <div className="mt-4 grid grid-cols-2 gap-1 rounded-[16px] border border-[#e7e3d3] bg-white p-1">
                    {PRODUCT_KIND_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={getTwoOptionButtonClass(
                          productKind === option.value,
                          mode === 'edit',
                        )}
                        disabled={mode === 'edit'}
                        onClick={() => {
                          if (mode === 'edit') {
                            return;
                          }
                          setProductKind(option.value);
                        }}
                      >
                        {option.title}
                      </button>
                    ))}
                  </div>
                </section>

                <section className={controlPanelClassName}>
                  <p className="text-sm font-black text-[#1a1a2e]">상품 제공 방식</p>
                  <div className="mt-4 grid grid-cols-2 gap-1 rounded-[16px] border border-[#e7e3d3] bg-white p-1">
                    {FULFILLMENT_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={getTwoOptionButtonClass(
                          productKind === 'STANDARD' && fulfillmentType === option,
                          productKind !== 'STANDARD' || mode === 'edit',
                        )}
                        disabled={productKind !== 'STANDARD' || mode === 'edit'}
                        onClick={() => {
                          if (productKind !== 'STANDARD' || mode === 'edit') {
                            return;
                          }
                          setFulfillmentType(option);
                        }}
                      >
                        {FULFILLMENT_TYPE_LABELS[option]}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className={controlPanelClassName}>
                <p className="text-sm font-black text-[#1a1a2e]">상품 상태</p>
                <div className="mt-5 grid grid-cols-3 gap-1 rounded-[12px] border border-[#e7e3d3] bg-white p-1">
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

              {showDefaultOptionSettings && (
                <>
                  <section className={controlPanelClassName}>
                    <p className="text-sm font-black text-[#1a1a2e]">기본 옵션 상태</p>
                    <div className="mt-5 grid grid-cols-3 gap-1 rounded-[12px] border border-[#e7e3d3] bg-white p-1">
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

                  <section className={controlPanelClassName}>
                    <label
                      htmlFor="default-variant-base-price"
                      className="text-sm font-black text-[#1a1a2e]"
                    >
                      기본 판매가 (원)
                      {defaultVariantStatus === 'ACTIVE' && (
                        <span className="ml-1 text-[#ca2a30]">*</span>
                      )}
                    </label>
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
                      className={`${adminInputClass} !mt-5 !h-14`}
                    />
                  </section>
                </>
              )}

              {showCampaignInclusionSettings && (
                <div className={controlPanelClassName}>
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

              <section className={softPanelClassName}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#1a1a2e]">{advancedTitle}</p>
                    <p className="mt-1 text-xs font-medium text-[#1a1a2e]/55">
                      {advancedDescription}
                    </p>
                  </div>
                  {advancedAction}
                </div>
                <div className="mt-4">
                  {advancedContent || (
                    <div className="rounded-[12px] border border-dashed border-[#d9d4c3] bg-white px-4 py-4 text-sm font-bold text-[#b3aea2]">
                      저장 후 상품 상세에서 고급 옵션을 관리할 수 있습니다.
                    </div>
                  )}
                </div>
              </section>
            </section>
          </div>

          {!hideActions && (
            <div className={adminActionRowClass}>
              <Button type="submit" className={adminPrimaryButtonClass} loading={isSubmitting}>
                {submitLabel}
              </Button>
              <Button type="button" intent="neutral" className={adminButtonClass} onClick={onCancel}>
                취소
              </Button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
