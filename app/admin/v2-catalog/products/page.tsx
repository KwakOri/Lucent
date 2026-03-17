'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2FulfillmentType,
  V2ProductKind,
  V2ProductStatus,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2Product,
  useCreateV2Variant,
  useDeleteV2Product,
  useDeleteV2Variant,
  useUpdateV2Product,
  useUpdateV2Variant,
  useV2AdminProducts,
  useV2AdminProjects,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';

type ProductFilterStatus = 'ALL' | V2ProductStatus;
type ProductFilterProject = 'ALL' | string;
type ProductSortKey = 'SORT_ASC' | 'UPDATED_DESC' | 'TITLE_ASC';

const PRODUCT_STATUS_VALUES: V2ProductStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];
const PRODUCT_KIND_VALUES: V2ProductKind[] = ['STANDARD', 'BUNDLE'];
const VARIANT_STATUS_VALUES: V2VariantStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];
const FULFILLMENT_TYPE_VALUES: V2FulfillmentType[] = ['DIGITAL', 'PHYSICAL'];
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

export default function V2CatalogProductsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductFilterStatus>('ALL');
  const [projectFilter, setProjectFilter] = useState<ProductFilterProject>('ALL');
  const [sortKey, setSortKey] = useState<ProductSortKey>('SORT_ASC');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [newProductProjectId, setNewProductProjectId] = useState('');
  const [newProductTitle, setNewProductTitle] = useState('');
  const [newProductSlug, setNewProductSlug] = useState('');
  const [newProductKind, setNewProductKind] = useState<V2ProductKind>('STANDARD');
  const [newProductStatus, setNewProductStatus] = useState<V2ProductStatus>('DRAFT');
  const [newProductSortOrder, setNewProductSortOrder] = useState('0');
  const [newProductShortDescription, setNewProductShortDescription] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductProjectId, setEditingProductProjectId] = useState('');
  const [editingProductTitle, setEditingProductTitle] = useState('');
  const [editingProductSlug, setEditingProductSlug] = useState('');
  const [editingProductKind, setEditingProductKind] = useState<V2ProductKind>('STANDARD');
  const [editingProductStatus, setEditingProductStatus] =
    useState<V2ProductStatus>('DRAFT');
  const [editingProductSortOrder, setEditingProductSortOrder] = useState('0');
  const [editingProductShortDescription, setEditingProductShortDescription] =
    useState('');
  const [editingProductDescription, setEditingProductDescription] = useState('');

  const [newVariantSku, setNewVariantSku] = useState('');
  const [newVariantTitle, setNewVariantTitle] = useState('');
  const [newVariantFulfillmentType, setNewVariantFulfillmentType] =
    useState<V2FulfillmentType>('DIGITAL');
  const [newVariantStatus, setNewVariantStatus] = useState<V2VariantStatus>('DRAFT');
  const [newVariantRequiresShipping, setNewVariantRequiresShipping] = useState(false);
  const [newVariantTrackInventory, setNewVariantTrackInventory] = useState(false);
  const [newVariantWeightGrams, setNewVariantWeightGrams] = useState('');

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariantSku, setEditingVariantSku] = useState('');
  const [editingVariantTitle, setEditingVariantTitle] = useState('');
  const [editingVariantFulfillmentType, setEditingVariantFulfillmentType] =
    useState<V2FulfillmentType>('DIGITAL');
  const [editingVariantStatus, setEditingVariantStatus] =
    useState<V2VariantStatus>('DRAFT');
  const [editingVariantRequiresShipping, setEditingVariantRequiresShipping] =
    useState(false);
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
  const createProduct = useCreateV2Product();
  const updateProduct = useUpdateV2Product();
  const deleteProduct = useDeleteV2Product();

  const activeProjects = useMemo(
    () => (projects || []).filter((project) => project.status !== 'ARCHIVED'),
    [projects],
  );
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
      const haystack =
        `${product.title} ${product.slug} ${product.id} ${projectName}`.toLowerCase();
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

  const activeProductId = useMemo(() => {
    if (selectedProductId && (products || []).some((product) => product.id === selectedProductId)) {
      return selectedProductId;
    }
    return filteredProducts[0]?.id ?? null;
  }, [selectedProductId, products, filteredProducts]);

  const activeProduct = useMemo(
    () => (products || []).find((product) => product.id === activeProductId) || null,
    [products, activeProductId],
  );

  const {
    data: variants,
    isLoading: variantsLoading,
    error: variantsError,
  } = useV2AdminVariants(activeProductId);
  const createVariant = useCreateV2Variant();
  const updateVariant = useUpdateV2Variant();
  const deleteVariant = useDeleteV2Variant();

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

  const handleCreateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(async () => {
      const response = await createProduct.mutateAsync({
        project_id: newProductProjectId.trim(),
        title: newProductTitle.trim(),
        slug: newProductSlug.trim(),
        product_kind: newProductKind,
        status: newProductStatus,
        sort_order: parseNonNegativeInteger(newProductSortOrder, 'sort_order'),
        short_description: newProductShortDescription.trim() || null,
        description: newProductDescription.trim() || null,
      });
      setSelectedProductId(response.data.id);
      setMessage('v2 상품을 생성했습니다.');
      setNewProductTitle('');
      setNewProductSlug('');
      setNewProductSortOrder('0');
      setNewProductShortDescription('');
      setNewProductDescription('');
      setNewProductStatus('DRAFT');
      setNewProductKind('STANDARD');
    });
  };

  const handleStartEditProduct = (product: {
    id: string;
    project_id: string;
    title: string;
    slug: string;
    product_kind: V2ProductKind;
    status: V2ProductStatus;
    sort_order: number;
    short_description: string | null;
    description: string | null;
  }) => {
    clearNotice();
    setEditingProductId(product.id);
    setEditingProductProjectId(product.project_id);
    setEditingProductTitle(product.title);
    setEditingProductSlug(product.slug);
    setEditingProductKind(product.product_kind);
    setEditingProductStatus(product.status);
    setEditingProductSortOrder(String(product.sort_order));
    setEditingProductShortDescription(product.short_description || '');
    setEditingProductDescription(product.description || '');
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setEditingProductProjectId('');
    setEditingProductTitle('');
    setEditingProductSlug('');
    setEditingProductKind('STANDARD');
    setEditingProductStatus('DRAFT');
    setEditingProductSortOrder('0');
    setEditingProductShortDescription('');
    setEditingProductDescription('');
  };

  const handleUpdateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProductId) {
      return;
    }
    await runAction(async () => {
      await updateProduct.mutateAsync({
        id: editingProductId,
        data: {
          project_id: editingProductProjectId.trim(),
          title: editingProductTitle.trim(),
          slug: editingProductSlug.trim(),
          product_kind: editingProductKind,
          status: editingProductStatus,
          sort_order: parseNonNegativeInteger(editingProductSortOrder, 'sort_order'),
          short_description: editingProductShortDescription.trim() || null,
          description: editingProductDescription.trim() || null,
        },
      });
      setMessage('상품 정보를 수정했습니다.');
      handleCancelEditProduct();
    });
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
      if (editingProductId === productId) {
        handleCancelEditProduct();
      }
      setMessage('상품을 삭제했습니다.');
    });
  };

  const handleCreateVariant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProductId) {
      return;
    }
    await runAction(async () => {
      await createVariant.mutateAsync({
        productId: activeProductId,
        data: {
          sku: newVariantSku.trim(),
          title: newVariantTitle.trim(),
          fulfillment_type: newVariantFulfillmentType,
          status: newVariantStatus,
          requires_shipping:
            newVariantFulfillmentType === 'PHYSICAL' ? newVariantRequiresShipping : false,
          track_inventory: newVariantTrackInventory,
          weight_grams:
            newVariantFulfillmentType === 'PHYSICAL'
              ? parseNullableNonNegativeInteger(newVariantWeightGrams, 'weight_grams')
              : null,
        },
      });
      setMessage('variant를 생성했습니다.');
      setNewVariantSku('');
      setNewVariantTitle('');
      setNewVariantStatus('DRAFT');
      setNewVariantFulfillmentType('DIGITAL');
      setNewVariantRequiresShipping(false);
      setNewVariantTrackInventory(false);
      setNewVariantWeightGrams('');
    });
  };

  const handleStartEditVariant = (variant: {
    id: string;
    sku: string;
    title: string;
    fulfillment_type: V2FulfillmentType;
    status: V2VariantStatus;
    requires_shipping: boolean;
    track_inventory: boolean;
    weight_grams: number | null;
  }) => {
    clearNotice();
    setEditingVariantId(variant.id);
    setEditingVariantSku(variant.sku);
    setEditingVariantTitle(variant.title);
    setEditingVariantFulfillmentType(variant.fulfillment_type);
    setEditingVariantStatus(variant.status);
    setEditingVariantRequiresShipping(variant.requires_shipping);
    setEditingVariantTrackInventory(variant.track_inventory);
    setEditingVariantWeightGrams(variant.weight_grams == null ? '' : String(variant.weight_grams));
  };

  const handleCancelEditVariant = () => {
    setEditingVariantId(null);
    setEditingVariantSku('');
    setEditingVariantTitle('');
    setEditingVariantFulfillmentType('DIGITAL');
    setEditingVariantStatus('DRAFT');
    setEditingVariantRequiresShipping(false);
    setEditingVariantTrackInventory(false);
    setEditingVariantWeightGrams('');
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
          sku: editingVariantSku.trim(),
          title: editingVariantTitle.trim(),
          fulfillment_type: editingVariantFulfillmentType,
          status: editingVariantStatus,
          requires_shipping:
            editingVariantFulfillmentType === 'PHYSICAL'
              ? editingVariantRequiresShipping
              : false,
          track_inventory: editingVariantTrackInventory,
          weight_grams:
            editingVariantFulfillmentType === 'PHYSICAL'
              ? parseNullableNonNegativeInteger(editingVariantWeightGrams, 'weight_grams')
              : null,
        },
      });
      setMessage('variant를 수정했습니다.');
      handleCancelEditVariant();
    });
  };

  const handleDeleteVariant = async (variantId: string, variantTitle: string) => {
    if (!window.confirm(`"${variantTitle}" variant를 삭제하시겠습니까?`)) {
      return;
    }
    await runAction(async () => {
      await deleteVariant.mutateAsync(variantId);
      if (editingVariantId === variantId) {
        handleCancelEditVariant();
      }
      setMessage('variant를 삭제했습니다.');
    });
  };

  if (projectsLoading || productsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
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

  const activeProjectHint = activeProduct
    ? projectNameMap.get(activeProduct.project_id) || activeProduct.project_id
    : null;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 상품 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            상품/variant 등록과 판매 상태를 운영합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Badge intent="info" size="md">
            총 {products.length}개
          </Badge>
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

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">새 상품 등록</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleCreateProduct}>
          <select
            value={newProductProjectId}
            onChange={(event) => setNewProductProjectId(event.target.value)}
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
            value={newProductTitle}
            onChange={(event) => setNewProductTitle(event.target.value)}
            required
          />
          <Input
            placeholder="slug"
            value={newProductSlug}
            onChange={(event) => setNewProductSlug(event.target.value)}
            required
          />
          <select
            value={newProductKind}
            onChange={(event) => setNewProductKind(event.target.value as V2ProductKind)}
            className={SELECT_CLASS}
          >
            {PRODUCT_KIND_VALUES.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <select
            value={newProductStatus}
            onChange={(event) => setNewProductStatus(event.target.value as V2ProductStatus)}
            className={SELECT_CLASS}
          >
            {PRODUCT_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Input
            placeholder="sort_order"
            value={newProductSortOrder}
            onChange={(event) => setNewProductSortOrder(event.target.value)}
          />
          <div className="lg:col-span-3">
            <Input
              placeholder="짧은 설명 (선택)"
              value={newProductShortDescription}
              onChange={(event) => setNewProductShortDescription(event.target.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <Textarea
              placeholder="상세 설명 (선택)"
              value={newProductDescription}
              onChange={(event) => setNewProductDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="lg:col-span-3">
            <Button type="submit" loading={createProduct.isPending}>
              상품 생성
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="상품명/slug/프로젝트 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProductFilterStatus)}
            className={SELECT_CLASS}
          >
            <option value="ALL">전체 상태</option>
            {PRODUCT_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value as ProductFilterProject)}
            className={SELECT_CLASS}
          >
            <option value="ALL">전체 프로젝트</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as ProductSortKey)}
            className={SELECT_CLASS}
          >
            <option value="SORT_ASC">정렬순</option>
            <option value="UPDATED_DESC">최근 수정순</option>
            <option value="TITLE_ASC">이름순</option>
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  상품
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  프로젝트
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  타입/상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  정렬/수정일
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    조회 결과가 없습니다.
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => {
                const isActiveProduct = product.id === activeProductId;
                return (
                  <tr
                    key={product.id}
                    className={isActiveProduct ? 'bg-blue-50/40' : undefined}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{product.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">
                        {projectNameMap.get(product.project_id) || product.project_id}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{product.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge intent={resolveKindIntent(product.product_kind)}>
                          {product.product_kind}
                        </Badge>
                        <Badge intent={resolveProductStatusIntent(product.status)}>
                          {product.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <p>sort: {product.sort_order}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(product.updated_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          intent={isActiveProduct ? 'secondary' : 'neutral'}
                          size="sm"
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          {isActiveProduct ? '선택됨' : '선택'}
                        </Button>
                        <Button
                          intent="neutral"
                          size="sm"
                          onClick={() => handleStartEditProduct(product)}
                        >
                          수정
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editingProductId && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">상품 수정</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleUpdateProduct}>
            <select
              value={editingProductProjectId}
              onChange={(event) => setEditingProductProjectId(event.target.value)}
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
              value={editingProductTitle}
              onChange={(event) => setEditingProductTitle(event.target.value)}
              required
            />
            <Input
              placeholder="slug"
              value={editingProductSlug}
              onChange={(event) => setEditingProductSlug(event.target.value)}
              required
            />
            <select
              value={editingProductKind}
              onChange={(event) => setEditingProductKind(event.target.value as V2ProductKind)}
              className={SELECT_CLASS}
            >
              {PRODUCT_KIND_VALUES.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
            <select
              value={editingProductStatus}
              onChange={(event) =>
                setEditingProductStatus(event.target.value as V2ProductStatus)
              }
              className={SELECT_CLASS}
            >
              {PRODUCT_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Input
              placeholder="sort_order"
              value={editingProductSortOrder}
              onChange={(event) => setEditingProductSortOrder(event.target.value)}
            />
            <div className="lg:col-span-3">
              <Input
                placeholder="짧은 설명 (선택)"
                value={editingProductShortDescription}
                onChange={(event) => setEditingProductShortDescription(event.target.value)}
              />
            </div>
            <div className="lg:col-span-3">
              <Textarea
                placeholder="상세 설명 (선택)"
                value={editingProductDescription}
                onChange={(event) => setEditingProductDescription(event.target.value)}
                rows={3}
              />
            </div>
            <div className="lg:col-span-3 flex gap-2">
              <Button type="submit" loading={updateProduct.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelEditProduct}>
                취소
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">variant 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              선택된 상품의 판매 단위(variant)와 이행 유형을 관리합니다.
            </p>
            {activeProduct && (
              <p className="mt-1 text-xs text-gray-500">
                선택 상품: {activeProduct.title} / {activeProjectHint}
              </p>
            )}
          </div>
          {!activeProduct && (
            <Badge intent="warning" size="md">
              상품을 먼저 선택하세요
            </Badge>
          )}
        </div>

        {activeProduct && (
          <>
            <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleCreateVariant}>
              <Input
                placeholder="SKU"
                value={newVariantSku}
                onChange={(event) => setNewVariantSku(event.target.value)}
                required
              />
              <Input
                placeholder="variant명"
                value={newVariantTitle}
                onChange={(event) => setNewVariantTitle(event.target.value)}
                required
              />
              <select
                value={newVariantFulfillmentType}
                onChange={(event) => {
                  const value = event.target.value as V2FulfillmentType;
                  setNewVariantFulfillmentType(value);
                  if (value === 'DIGITAL') {
                    setNewVariantRequiresShipping(false);
                    setNewVariantWeightGrams('');
                  }
                }}
                className={SELECT_CLASS}
              >
                {FULFILLMENT_TYPE_VALUES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={newVariantStatus}
                onChange={(event) => setNewVariantStatus(event.target.value as V2VariantStatus)}
                className={SELECT_CLASS}
              >
                {VARIANT_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Input
                placeholder="weight_grams (실물만)"
                value={newVariantWeightGrams}
                onChange={(event) => setNewVariantWeightGrams(event.target.value)}
                disabled={newVariantFulfillmentType !== 'PHYSICAL'}
              />
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newVariantRequiresShipping}
                  onChange={(event) => setNewVariantRequiresShipping(event.target.checked)}
                  disabled={newVariantFulfillmentType !== 'PHYSICAL'}
                />
                배송 필요
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newVariantTrackInventory}
                  onChange={(event) => setNewVariantTrackInventory(event.target.checked)}
                />
                재고 추적
              </label>
              <div className="lg:col-span-4">
                <Button type="submit" loading={createVariant.isPending}>
                  variant 생성
                </Button>
              </div>
            </form>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Variant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      이행/상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      옵션
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {variantsLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        variant 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!variantsLoading && variantsError && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">
                        variant 목록을 불러오지 못했습니다.
                      </td>
                    </tr>
                  )}
                  {!variantsLoading && !variantsError && (variants || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        등록된 variant가 없습니다.
                      </td>
                    </tr>
                  )}
                  {!variantsLoading &&
                    !variantsError &&
                    (variants || []).map((variant) => (
                      <tr key={variant.id}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{variant.title}</p>
                          <p className="mt-1 text-xs text-gray-500">{variant.sku}</p>
                          <p className="mt-1 text-xs text-gray-500">{variant.id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge intent={resolveFulfillmentIntent(variant.fulfillment_type)}>
                              {variant.fulfillment_type}
                            </Badge>
                            <Badge intent={resolveVariantStatusIntent(variant.status)}>
                              {variant.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <p>배송 필요: {variant.requires_shipping ? '예' : '아니오'}</p>
                          <p>재고 추적: {variant.track_inventory ? '예' : '아니오'}</p>
                          <p>중량(g): {variant.weight_grams ?? '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
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
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {editingVariantId && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">variant 수정</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleUpdateVariant}>
            <Input
              placeholder="SKU"
              value={editingVariantSku}
              onChange={(event) => setEditingVariantSku(event.target.value)}
              required
            />
            <Input
              placeholder="variant명"
              value={editingVariantTitle}
              onChange={(event) => setEditingVariantTitle(event.target.value)}
              required
            />
            <select
              value={editingVariantFulfillmentType}
              onChange={(event) => {
                const value = event.target.value as V2FulfillmentType;
                setEditingVariantFulfillmentType(value);
                if (value === 'DIGITAL') {
                  setEditingVariantRequiresShipping(false);
                  setEditingVariantWeightGrams('');
                }
              }}
              className={SELECT_CLASS}
            >
              {FULFILLMENT_TYPE_VALUES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={editingVariantStatus}
              onChange={(event) => setEditingVariantStatus(event.target.value as V2VariantStatus)}
              className={SELECT_CLASS}
            >
              {VARIANT_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Input
              placeholder="weight_grams (실물만)"
              value={editingVariantWeightGrams}
              onChange={(event) => setEditingVariantWeightGrams(event.target.value)}
              disabled={editingVariantFulfillmentType !== 'PHYSICAL'}
            />
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editingVariantRequiresShipping}
                onChange={(event) => setEditingVariantRequiresShipping(event.target.checked)}
                disabled={editingVariantFulfillmentType !== 'PHYSICAL'}
              />
              배송 필요
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editingVariantTrackInventory}
                onChange={(event) => setEditingVariantTrackInventory(event.target.checked)}
              />
              재고 추적
            </label>
            <div className="lg:col-span-4 flex gap-2">
              <Button type="submit" loading={updateVariant.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelEditVariant}>
                취소
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
