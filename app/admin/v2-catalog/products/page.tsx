'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
  V2FulfillmentType,
  V2ProductKind,
  V2ProductStatus,
  V2Variant,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2DigitalAsset,
  useCreateV2Variant,
  useDeleteV2Product,
  useDeleteV2Variant,
  useUpdateV2Variant,
  useUploadV2MediaAssetFile,
  useV2AdminProducts,
  useV2AdminProjects,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  FULFILLMENT_TYPE_LABELS,
  PRODUCT_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
  VARIANT_STATUS_LABELS,
  buildVariantSku,
} from '@/lib/client/utils/v2-product-admin-form';

type ProductFilterStatus = 'ALL' | V2ProductStatus;
type ProductFilterProject = 'ALL' | string;
type ProductSortKey = 'SORT_ASC' | 'UPDATED_DESC' | 'TITLE_ASC';

const PRODUCT_STATUS_VALUES: V2ProductStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];
const VARIANT_STATUS_VALUES: V2VariantStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];
const FULFILLMENT_TYPE_VALUES: V2FulfillmentType[] = ['DIGITAL', 'PHYSICAL'];

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

function parseNullableNonNegativeInteger(
  value: string,
  fieldName: string,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return parseNonNegativeInteger(trimmed, fieldName);
}

function isAudioFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('audio/')) {
    return true;
  }
  return /\.(mp3|wav|flac|m4a)$/i.test(file.name);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveProductStatusIntent(
  status: V2ProductStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  if (status === 'INACTIVE') {
    return 'info';
  }
  return 'default';
}

function resolveVariantStatusIntent(
  status: V2VariantStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'INACTIVE') {
    return 'info';
  }
  return 'default';
}

function resolveKindIntent(
  kind: V2ProductKind,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (kind === 'BUNDLE') {
    return 'info';
  }
  return 'default';
}

function resolveFulfillmentIntent(
  type: V2FulfillmentType,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (type === 'DIGITAL') {
    return 'success';
  }
  return 'info';
}

function getChoiceButtonClass(active: boolean): string {
  return `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
    active
      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
  }`;
}

function formatOptionSummary(optionSummary: Record<string, unknown> | null): string[] {
  if (!optionSummary) {
    return [];
  }

  return Object.entries(optionSummary)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? `${key}: ${value.join(', ')}` : null;
      }
      if (value == null || value === '') {
        return null;
      }
      return `${key}: ${String(value)}`;
    })
    .filter((value): value is string => Boolean(value));
}

function formatVariantDetails(variant: V2Variant): string[] {
  if (variant.fulfillment_type === 'PHYSICAL') {
    return [
      variant.track_inventory ? '재고를 추적합니다.' : '재고 추적 없이 판매합니다.',
      variant.weight_grams != null ? `무게 ${variant.weight_grams}g` : '무게 미설정',
      '배송이 필요한 옵션입니다.',
    ];
  }

  return ['배송 없이 제공되는 디지털 옵션입니다.'];
}

function resetVariantFormState(): {
  title: string;
  fulfillmentType: V2FulfillmentType;
  status: V2VariantStatus;
  trackInventory: boolean;
  weightGrams: string;
  audioFile: File | null;
} {
  return {
    title: '',
    fulfillmentType: 'DIGITAL',
    status: 'DRAFT',
    trackInventory: false,
    weightGrams: '',
    audioFile: null,
  };
}

export default function V2CatalogProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductFilterStatus>('ALL');
  const [projectFilter, setProjectFilter] = useState<ProductFilterProject>('ALL');
  const [sortKey, setSortKey] = useState<ProductSortKey>('SORT_ASC');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [newVariantTitle, setNewVariantTitle] = useState('');
  const [newVariantFulfillmentType, setNewVariantFulfillmentType] =
    useState<V2FulfillmentType>('DIGITAL');
  const [newVariantStatus, setNewVariantStatus] = useState<V2VariantStatus>('DRAFT');
  const [newVariantTrackInventory, setNewVariantTrackInventory] = useState(false);
  const [newVariantWeightGrams, setNewVariantWeightGrams] = useState('');
  const [newVariantAudioFile, setNewVariantAudioFile] = useState<File | null>(null);

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariantSku, setEditingVariantSku] = useState('');
  const [editingVariantTitle, setEditingVariantTitle] = useState('');
  const [editingVariantFulfillmentType, setEditingVariantFulfillmentType] =
    useState<V2FulfillmentType>('DIGITAL');
  const [editingVariantStatus, setEditingVariantStatus] =
    useState<V2VariantStatus>('DRAFT');
  const [editingVariantTrackInventory, setEditingVariantTrackInventory] =
    useState(false);
  const [editingVariantWeightGrams, setEditingVariantWeightGrams] = useState('');

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useV2AdminProducts();
  const deleteProduct = useDeleteV2Product();

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (projects || []).forEach((project) => {
      map.set(project.id, project.name);
    });
    return map;
  }, [projects]);

  const filteredProducts = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    const filtered = (products || []).filter((product) => {
      if (statusFilter !== 'ALL' && product.status !== statusFilter) {
        return false;
      }
      if (projectFilter !== 'ALL' && product.project_id !== projectFilter) {
        return false;
      }
      if (!search) {
        return true;
      }

      const projectName = projectNameMap.get(product.project_id) || '';
      const haystack = `${product.title} ${product.slug} ${projectName}`.toLowerCase();
      return haystack.includes(search);
    });

    return filtered.sort((left, right) => {
      if (sortKey === 'SORT_ASC') {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        return left.title.localeCompare(right.title, 'ko');
      }
      if (sortKey === 'TITLE_ASC') {
        return left.title.localeCompare(right.title, 'ko');
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [keyword, products, statusFilter, projectFilter, sortKey, projectNameMap]);

  const requestedProductId = searchParams.get('product');

  const activeProductId = useMemo(() => {
    const preferredId = selectedProductId || requestedProductId;
    if (preferredId && (products || []).some((product) => product.id === preferredId)) {
      return preferredId;
    }
    return filteredProducts[0]?.id ?? null;
  }, [filteredProducts, products, requestedProductId, selectedProductId]);

  const activeProduct = useMemo(
    () => (products || []).find((product) => product.id === activeProductId) || null,
    [activeProductId, products],
  );

  const {
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(activeProductId);
  const createVariant = useCreateV2Variant();
  const createDigitalAsset = useCreateV2DigitalAsset();
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const updateVariant = useUpdateV2Variant();
  const deleteVariant = useDeleteV2Variant();

  const activeProjectName = activeProduct
    ? projectNameMap.get(activeProduct.project_id) || activeProduct.project_id
    : null;

  const variantCount = (variants || []).length;
  const newVariantSkuPreview =
    activeProduct && newVariantTitle.trim()
      ? buildVariantSku({
          productSlug: activeProduct.slug,
          variantTitle: newVariantTitle.trim(),
          fulfillmentType: newVariantFulfillmentType,
        })
      : '';

  const resetCreateVariantForm = () => {
    const nextState = resetVariantFormState();
    setNewVariantTitle(nextState.title);
    setNewVariantFulfillmentType(nextState.fulfillmentType);
    setNewVariantStatus(nextState.status);
    setNewVariantTrackInventory(nextState.trackInventory);
    setNewVariantWeightGrams(nextState.weightGrams);
    setNewVariantAudioFile(nextState.audioFile);
  };

  const resetEditingVariantForm = () => {
    setEditingVariantId(null);
    setEditingVariantSku('');
    setEditingVariantTitle('');
    setEditingVariantFulfillmentType('DIGITAL');
    setEditingVariantStatus('DRAFT');
    setEditingVariantTrackInventory(false);
    setEditingVariantWeightGrams('');
  };

  useEffect(() => {
    const nextState = resetVariantFormState();
    setNewVariantTitle(nextState.title);
    setNewVariantFulfillmentType(nextState.fulfillmentType);
    setNewVariantStatus(nextState.status);
    setNewVariantTrackInventory(nextState.trackInventory);
    setNewVariantWeightGrams(nextState.weightGrams);
    setNewVariantAudioFile(nextState.audioFile);
    setEditingVariantId(null);
    setEditingVariantSku('');
    setEditingVariantTitle('');
    setEditingVariantFulfillmentType('DIGITAL');
    setEditingVariantStatus('DRAFT');
    setEditingVariantTrackInventory(false);
    setEditingVariantWeightGrams('');
  }, [activeProductId]);

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const runAction = async (task: () => Promise<void>) => {
    clearNotice();
    try {
      await task();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
  };

  const handleDeleteProduct = async (productId: string, title: string) => {
    if (!window.confirm(`"${title}" 상품을 삭제하시겠습니까?`)) {
      return;
    }
    await runAction(async () => {
      await deleteProduct.mutateAsync(productId);
      if (selectedProductId === productId) {
        setSelectedProductId(null);
      }
      setMessage('상품을 삭제했습니다.');
    });
  };

  const handleNewFulfillmentTypeChange = (value: V2FulfillmentType) => {
    setNewVariantFulfillmentType(value);
    if (value === 'DIGITAL') {
      setNewVariantTrackInventory(false);
      setNewVariantWeightGrams('');
      return;
    }
    setNewVariantTrackInventory(true);
    setNewVariantAudioFile(null);
  };

  const handleEditingFulfillmentTypeChange = (value: V2FulfillmentType) => {
    setEditingVariantFulfillmentType(value);
    if (value === 'DIGITAL') {
      setEditingVariantTrackInventory(false);
      setEditingVariantWeightGrams('');
      return;
    }
    setEditingVariantTrackInventory(true);
  };

  const handleCreateVariant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProductId || !activeProduct) {
      return;
    }

    await runAction(async () => {
      const variantTitle = newVariantTitle.trim();
      if (!variantTitle) {
        throw new Error('옵션 이름을 입력해 주세요.');
      }

      const generatedSku = buildVariantSku({
        productSlug: activeProduct.slug,
        variantTitle,
        fulfillmentType: newVariantFulfillmentType,
      });

      const response = await createVariant.mutateAsync({
        productId: activeProductId,
        data: {
          sku: generatedSku,
          title: variantTitle,
          fulfillment_type: newVariantFulfillmentType,
          status: newVariantStatus,
          requires_shipping: newVariantFulfillmentType === 'PHYSICAL',
          track_inventory:
            newVariantFulfillmentType === 'PHYSICAL' ? newVariantTrackInventory : false,
          weight_grams:
            newVariantFulfillmentType === 'PHYSICAL'
              ? parseNullableNonNegativeInteger(newVariantWeightGrams, '무게')
              : null,
        },
      });

      let extraMessage = '';
      if (newVariantFulfillmentType === 'DIGITAL' && newVariantAudioFile) {
        if (!isAudioFile(newVariantAudioFile)) {
          throw new Error('오디오 파일 형식(mp3/wav/flac/m4a 또는 audio/*)만 업로드할 수 있습니다.');
        }

        const uploaded = await uploadMediaAssetFile.mutateAsync({
          file: newVariantAudioFile,
          asset_kind: 'AUDIO',
          status: 'ACTIVE',
          metadata: {
            source: 'v2-products-inline-audio',
          },
        });

        await createDigitalAsset.mutateAsync({
          variantId: response.data.id,
          data: {
            asset_role: 'PRIMARY',
            media_asset_id: uploaded.data.id,
            status: newVariantStatus === 'ACTIVE' ? 'READY' : 'DRAFT',
            metadata: {
              source: 'v2-products-inline-audio',
            },
          },
        });
        extraMessage = ' 오디오 파일도 함께 연결했습니다.';
      }

      setMessage(`옵션을 추가했습니다.${extraMessage}`);
      resetCreateVariantForm();
    });
  };

  const handleStartEditVariant = (variant: V2Variant) => {
    clearNotice();
    setEditingVariantId(variant.id);
    setEditingVariantSku(variant.sku);
    setEditingVariantTitle(variant.title);
    setEditingVariantFulfillmentType(variant.fulfillment_type);
    setEditingVariantStatus(variant.status);
    setEditingVariantTrackInventory(variant.track_inventory);
    setEditingVariantWeightGrams(variant.weight_grams == null ? '' : String(variant.weight_grams));
  };

  const handleUpdateVariant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingVariantId) {
      return;
    }

    await runAction(async () => {
      await updateVariant.mutateAsync({
        variantId: editingVariantId,
        data: {
          title: editingVariantTitle.trim(),
          fulfillment_type: editingVariantFulfillmentType,
          status: editingVariantStatus,
          requires_shipping: editingVariantFulfillmentType === 'PHYSICAL',
          track_inventory:
            editingVariantFulfillmentType === 'PHYSICAL'
              ? editingVariantTrackInventory
              : false,
          weight_grams:
            editingVariantFulfillmentType === 'PHYSICAL'
              ? parseNullableNonNegativeInteger(editingVariantWeightGrams, '무게')
              : null,
        },
      });
      setMessage('옵션 정보를 수정했습니다.');
      resetEditingVariantForm();
    });
  };

  const handleDeleteVariant = async (variantId: string, variantTitle: string) => {
    if (!window.confirm(`"${variantTitle}" 옵션을 삭제하시겠습니까?`)) {
      return;
    }
    await runAction(async () => {
      await deleteVariant.mutateAsync(variantId);
      if (editingVariantId === variantId) {
        resetEditingVariantForm();
      }
      setMessage('옵션을 삭제했습니다.');
    });
  };

  if (projectsLoading || productsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="v2 상품 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectsError || productsError || !projects || !products) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        상품 운영 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 상품 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            상품 목록을 먼저 보고, 필요한 상품을 선택해 기본 정보와 판매 옵션을 정리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent="info" size="md">
            전체 {products.length}개
          </Badge>
          <Button onClick={() => router.push('/admin/v2-catalog/products/new')}>
            새 상품 만들기
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">상품 찾기</h2>
          <p className="text-sm text-gray-500">
            필요한 상품만 빠르게 좁혀 보고, 선택한 뒤 오른쪽에서 상세 운영을 이어가세요.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_220px_220px]">
          <Input
            placeholder="상품명 또는 프로젝트명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProductFilterStatus)}
            options={[
              { value: 'ALL', label: '전체 상태' },
              ...PRODUCT_STATUS_VALUES.map((status) => ({
                value: status,
                label: PRODUCT_STATUS_LABELS[status],
              })),
            ]}
          />
          <Select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value as ProductFilterProject)}
            options={[
              { value: 'ALL', label: '전체 프로젝트' },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
          <Select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as ProductSortKey)}
            options={[
              { value: 'SORT_ASC', label: '정렬 순서' },
              { value: 'UPDATED_DESC', label: '최근 수정순' },
              { value: 'TITLE_ASC', label: '이름순' },
            ]}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">상품 목록</h2>
              <p className="mt-1 text-sm text-gray-500">
                먼저 상품을 선택하면 오른쪽에서 세부 작업을 계속할 수 있습니다.
              </p>
            </div>
            <Badge intent="info">{filteredProducts.length}개 표시</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {filteredProducts.length === 0 ? (
              <EmptyState
                title="조건에 맞는 상품이 없어요"
                description="검색어나 필터를 바꾸거나 새 상품을 만들어 주세요."
                action={
                  <Button onClick={() => router.push('/admin/v2-catalog/products/new')}>
                    새 상품 만들기
                  </Button>
                }
              />
            ) : (
              filteredProducts.map((product) => {
                const isActiveProduct = product.id === activeProductId;
                return (
                  <article
                    key={product.id}
                    className={`rounded-2xl border p-4 transition ${
                      isActiveProduct
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge intent={resolveKindIntent(product.product_kind)}>
                            {PRODUCT_KIND_LABELS[product.product_kind]}
                          </Badge>
                          <Badge intent={resolveProductStatusIntent(product.status)}>
                            {PRODUCT_STATUS_LABELS[product.status]}
                          </Badge>
                          {isActiveProduct && <Badge intent="success">현재 보고 있는 상품</Badge>}
                        </div>

                        <h3 className="mt-3 text-base font-semibold text-gray-900">
                          {product.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {projectNameMap.get(product.project_id) || product.project_id}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-gray-600">
                          {product.short_description || '등록된 한 줄 설명이 없습니다.'}
                        </p>
                        <p className="mt-3 text-xs text-gray-500">
                          /shop/{product.slug} · {formatDateTime(product.updated_at)} 수정
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        intent={isActiveProduct ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => setSelectedProductId(product.id)}
                      >
                        {isActiveProduct ? '선택됨' : '상세 보기'}
                      </Button>
                      <Button
                        intent="neutral"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/v2-catalog/products/${product.id}/edit`)
                        }
                      >
                        기본 정보 수정
                      </Button>
                      <Button
                        intent="danger"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id, product.title)}
                        loading={deleteProduct.isPending}
                      >
                        삭제
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <div className="space-y-6">
          {!activeProduct ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <EmptyState
                title="먼저 상품을 선택해 주세요"
                description="왼쪽 목록에서 상품을 고르면 기본 정보와 판매 옵션을 이어서 관리할 수 있습니다."
              />
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge intent={resolveKindIntent(activeProduct.product_kind)}>
                        {PRODUCT_KIND_LABELS[activeProduct.product_kind]}
                      </Badge>
                      <Badge intent={resolveProductStatusIntent(activeProduct.status)}>
                        {PRODUCT_STATUS_LABELS[activeProduct.status]}
                      </Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-gray-900">
                      {activeProduct.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{activeProjectName}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      intent="neutral"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/v2-catalog/products/${activeProduct.id}/edit`)
                      }
                    >
                      기본 정보 수정
                    </Button>
                    {activeProduct.product_kind === 'BUNDLE' && (
                      <Button
                        intent="neutral"
                        size="sm"
                        onClick={() => router.push('/admin/v2-catalog/bundles')}
                      >
                        번들 구성 관리
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      상품 주소
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      /shop/{activeProduct.slug}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      최근 수정
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      {formatDateTime(activeProduct.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                  <p className="text-sm font-medium text-gray-900">상품 소개</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {activeProduct.description ||
                      activeProduct.short_description ||
                      '아직 상품 설명이 없습니다.'}
                  </p>
                </div>

                {activeProduct.product_kind === 'BUNDLE' && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="text-sm font-semibold text-amber-900">번들 상품 안내</p>
                    <p className="mt-2 text-sm leading-6 text-amber-900/80">
                      번들은 대표 상품 정보를 먼저 저장한 뒤, 별도의 번들 관리 탭에서
                      개별 상품과 옵션을 연결하는 흐름이 가장 직관적입니다.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">판매 옵션 관리</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      옵션 이름만 직접 입력하고, 판매 방식과 상태는 선택으로 정리합니다.
                    </p>
                  </div>
                  <Badge intent="info" size="md">
                    옵션 {variantCount}개
                  </Badge>
                </div>

                <form className="mt-6 space-y-6" onSubmit={handleCreateVariant}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <FormField
                      label="옵션 이름"
                      htmlFor="new-variant-title"
                      required
                      help="고객에게 보이는 실제 구매 옵션 이름입니다."
                    >
                      <Input
                        id="new-variant-title"
                        value={newVariantTitle}
                        onChange={(event) => setNewVariantTitle(event.target.value)}
                        placeholder="예: 디지털 음원 세트"
                        required
                      />
                    </FormField>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-sm font-medium text-gray-900">자동 코드</p>
                      <p className="mt-1 text-sm text-gray-500">
                        SKU는 자동으로 생성되며 직접 입력하지 않아도 됩니다.
                      </p>
                      <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {newVariantSkuPreview || '옵션 이름을 입력하면 자동으로 준비됩니다.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">판매 방식</p>
                        <p className="mt-1 text-sm text-gray-500">
                          파일 제공인지, 실제 배송이 필요한지 선택해 주세요.
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {FULFILLMENT_TYPE_VALUES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleNewFulfillmentTypeChange(type)}
                            className={getChoiceButtonClass(newVariantFulfillmentType === type)}
                          >
                            <p>{FULFILLMENT_TYPE_LABELS[type]}</p>
                            <p className="mt-1 text-xs font-normal text-gray-500">
                              {type === 'DIGITAL'
                                ? '오디오나 디지털 파일을 바로 제공해요.'
                                : '재고와 배송이 필요한 실물 상품이에요.'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">노출 상태</p>
                        <p className="mt-1 text-sm text-gray-500">
                          저장 후 바로 판매할지, 임시 저장으로 둘지 고를 수 있어요.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {VARIANT_STATUS_VALUES.map((status) => (
                          <Button
                            key={status}
                            type="button"
                            size="sm"
                            intent={newVariantStatus === status ? 'primary' : 'neutral'}
                            onClick={() => setNewVariantStatus(status)}
                          >
                            {VARIANT_STATUS_LABELS[status]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {newVariantFulfillmentType === 'PHYSICAL' ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FormField
                        label="무게 (g)"
                        htmlFor="new-variant-weight"
                        help="배송비 계산이나 출고 참고용으로 입력합니다."
                      >
                        <Input
                          id="new-variant-weight"
                          type="number"
                          min="0"
                          step="1"
                          value={newVariantWeightGrams}
                          onChange={(event) => setNewVariantWeightGrams(event.target.value)}
                          placeholder="예: 180"
                        />
                      </FormField>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <p className="text-sm font-medium text-gray-900">재고 추적</p>
                        <p className="mt-1 text-sm text-gray-500">
                          실물 상품은 기본으로 켜집니다. 수량 관리를 하지 않을 때만 꺼 주세요.
                        </p>
                        <div className="mt-4">
                          <Switch
                            checked={newVariantTrackInventory}
                            onChange={(event) =>
                              setNewVariantTrackInventory(event.target.checked)
                            }
                            label={
                              newVariantTrackInventory
                                ? '재고를 추적합니다.'
                                : '재고를 추적하지 않습니다.'
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                      <p className="text-sm font-medium text-blue-900">
                        오디오 파일 업로드 (선택)
                      </p>
                      <p className="mt-1 text-sm text-blue-800/80">
                        파일을 선택하면 옵션 저장과 함께 업로드되어 기본 디지털 에셋으로 연결됩니다.
                      </p>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.flac,.m4a"
                        onChange={(event) =>
                          setNewVariantAudioFile(event.target.files?.[0] || null)
                        }
                        className="mt-4 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        선택 파일: {newVariantAudioFile ? newVariantAudioFile.name : '없음'}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      loading={
                        createVariant.isPending ||
                        uploadMediaAssetFile.isPending ||
                        createDigitalAsset.isPending
                      }
                    >
                      옵션 추가
                    </Button>
                    <Button type="button" intent="neutral" onClick={resetCreateVariantForm}>
                      입력 초기화
                    </Button>
                  </div>
                </form>
              </section>

              {editingVariantId && (
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">옵션 수정</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        옵션 이름과 판매 방식을 다듬고, 고객에게 보이는 상태를 조정합니다.
                      </p>
                    </div>
                    <Button type="button" intent="neutral" size="sm" onClick={resetEditingVariantForm}>
                      닫기
                    </Button>
                  </div>

                  <form className="mt-6 space-y-6" onSubmit={handleUpdateVariant}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                      <FormField
                        label="옵션 이름"
                        htmlFor="editing-variant-title"
                        required
                        help="구매자가 이해하기 쉬운 이름으로 유지해 주세요."
                      >
                        <Input
                          id="editing-variant-title"
                          value={editingVariantTitle}
                          onChange={(event) => setEditingVariantTitle(event.target.value)}
                          placeholder="예: 디지털 음원 세트"
                          required
                        />
                      </FormField>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <p className="text-sm font-medium text-gray-900">현재 코드</p>
                        <p className="mt-1 text-sm text-gray-500">
                          이미 저장된 코드는 그대로 유지됩니다.
                        </p>
                        <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">
                            {editingVariantSku}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">판매 방식</p>
                          <p className="mt-1 text-sm text-gray-500">
                            디지털 제공인지, 실물 배송인지 다시 선택할 수 있습니다.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {FULFILLMENT_TYPE_VALUES.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleEditingFulfillmentTypeChange(type)}
                              className={getChoiceButtonClass(editingVariantFulfillmentType === type)}
                            >
                              <p>{FULFILLMENT_TYPE_LABELS[type]}</p>
                              <p className="mt-1 text-xs font-normal text-gray-500">
                                {type === 'DIGITAL'
                                  ? '배송 없이 제공되는 옵션이에요.'
                                  : '배송과 재고 관리가 필요한 옵션이에요.'}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">노출 상태</p>
                          <p className="mt-1 text-sm text-gray-500">
                            고객에게 지금 보여줄지 정합니다.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {VARIANT_STATUS_VALUES.map((status) => (
                            <Button
                              key={status}
                              type="button"
                              size="sm"
                              intent={editingVariantStatus === status ? 'primary' : 'neutral'}
                              onClick={() => setEditingVariantStatus(status)}
                            >
                              {VARIANT_STATUS_LABELS[status]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {editingVariantFulfillmentType === 'PHYSICAL' && (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <FormField
                          label="무게 (g)"
                          htmlFor="editing-variant-weight"
                          help="실물 배송일 때만 필요합니다."
                        >
                          <Input
                            id="editing-variant-weight"
                            type="number"
                            min="0"
                            step="1"
                            value={editingVariantWeightGrams}
                            onChange={(event) => setEditingVariantWeightGrams(event.target.value)}
                            placeholder="예: 180"
                          />
                        </FormField>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <p className="text-sm font-medium text-gray-900">재고 추적</p>
                          <p className="mt-1 text-sm text-gray-500">
                            재고 수량을 관리할 때만 켜 두세요.
                          </p>
                          <div className="mt-4">
                            <Switch
                              checked={editingVariantTrackInventory}
                              onChange={(event) =>
                                setEditingVariantTrackInventory(event.target.checked)
                              }
                              label={
                                editingVariantTrackInventory
                                  ? '재고를 추적합니다.'
                                  : '재고를 추적하지 않습니다.'
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" loading={updateVariant.isPending}>
                        옵션 저장
                      </Button>
                      <Button
                        type="button"
                        intent="neutral"
                        onClick={resetEditingVariantForm}
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">등록된 옵션</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      저장된 옵션을 카드로 확인하고 필요한 항목만 바로 수정합니다.
                    </p>
                  </div>
                  <Badge intent="info">{variantCount}개</Badge>
                </div>

                <div className="mt-5 space-y-3">
                  {variantsLoading && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                      옵션 목록을 불러오는 중입니다.
                    </div>
                  )}

                  {!variantsLoading && variantsError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
                      옵션 목록을 불러오지 못했습니다.
                    </div>
                  )}

                  {!variantsLoading && !variantsError && variantCount === 0 && (
                    <EmptyState
                      title="아직 판매 옵션이 없어요"
                      description="위에서 옵션 이름과 판매 방식을 선택해 첫 옵션을 만들어 보세요."
                    />
                  )}

                  {!variantsLoading &&
                    !variantsError &&
                    (variants || []).map((variant) => {
                      const optionSummary = formatOptionSummary(variant.option_summary_json);
                      return (
                        <article
                          key={variant.id}
                          className="rounded-2xl border border-gray-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  intent={resolveFulfillmentIntent(variant.fulfillment_type)}
                                >
                                  {FULFILLMENT_TYPE_LABELS[variant.fulfillment_type]}
                                </Badge>
                                <Badge intent={resolveVariantStatusIntent(variant.status)}>
                                  {VARIANT_STATUS_LABELS[variant.status]}
                                </Badge>
                              </div>

                              <h3 className="mt-3 text-base font-semibold text-gray-900">
                                {variant.title}
                              </h3>
                              <p className="mt-1 text-xs text-gray-500">
                                자동 코드 {variant.sku}
                              </p>

                              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    운영 정보
                                  </p>
                                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    {formatVariantDetails(variant).map((detail) => (
                                      <p key={detail}>{detail}</p>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    옵션 요약
                                  </p>
                                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    {optionSummary.length > 0 ? (
                                      optionSummary.map((line) => <p key={line}>{line}</p>)
                                    ) : (
                                      <p>추가 옵션 정보가 없습니다.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <p className="mt-4 text-xs text-gray-500">
                                {formatDateTime(variant.updated_at)} 수정
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Button
                                intent="neutral"
                                size="sm"
                                onClick={() => handleStartEditVariant(variant)}
                              >
                                수정
                              </Button>
                              <Button
                                intent="danger"
                                size="sm"
                                onClick={() => handleDeleteVariant(variant.id, variant.title)}
                                loading={deleteVariant.isPending}
                              >
                                삭제
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
