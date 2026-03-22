'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type {
  V2Product,
  V2ProductStatus,
  V2Variant,
  V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useUpdateV2Product,
  useUpdateV2Variant,
  useV2AdminVariantsMap,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  FULFILLMENT_TYPE_LABELS,
  PRODUCT_STATUS_LABELS,
  VARIANT_STATUS_LABELS,
} from '@/lib/client/utils/v2-product-admin-form';

type ProjectProductsBulkTableProps = {
  products: V2Product[];
  onOpenDetail: (productId: string) => void;
};

type ProductDraft = {
  title: string;
  shortDescription: string;
  status: V2ProductStatus;
};

type VariantDraft = {
  title: string;
  status: V2VariantStatus;
};

type DirtyMap = Record<string, true>;

const PRODUCT_STATUS_VALUES: V2ProductStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const VARIANT_STATUS_VALUES: V2VariantStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];

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

function shouldHideVariantTitleInput(variants: V2Variant[], variant: V2Variant): boolean {
  if (variants.length !== 1) {
    return false;
  }
  return variant.title.trim().toLowerCase() === 'default';
}

function setDirtyFlag(previous: DirtyMap, id: string, isDirty: boolean): DirtyMap {
  if (isDirty) {
    if (previous[id]) {
      return previous;
    }
    return {
      ...previous,
      [id]: true,
    };
  }

  if (!previous[id]) {
    return previous;
  }

  const next = {
    ...previous,
  };
  delete next[id];
  return next;
}

export function ProjectProductsBulkTable({
  products,
  onOpenDetail,
}: ProjectProductsBulkTableProps) {
  const [expandedProducts, setExpandedProducts] = useState<DirtyMap>({});
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({});
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [dirtyProductIds, setDirtyProductIds] = useState<DirtyMap>({});
  const [dirtyVariantIds, setDirtyVariantIds] = useState<DirtyMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const {
    variantsByProductId,
    isLoading: variantsLoading,
    isFetching: variantsFetching,
    isError: variantsError,
  } = useV2AdminVariantsMap(productIds);

  const updateProduct = useUpdateV2Product();
  const updateVariant = useUpdateV2Variant();

  const productsById = useMemo(() => {
    const map = new Map<string, V2Product>();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const variantMetaById = useMemo(() => {
    const map = new Map<string, { variant: V2Variant; productId: string; siblings: V2Variant[] }>();
    Object.entries(variantsByProductId).forEach(([productId, variants]) => {
      variants.forEach((variant) => {
        map.set(variant.id, {
          variant,
          productId,
          siblings: variants,
        });
      });
    });
    return map;
  }, [variantsByProductId]);

  useEffect(() => {
    if (products.length === 0) {
      return;
    }
    setProductDrafts((previous) => {
      let hasChanges = false;
      const next = {
        ...previous,
      };
      products.forEach((product) => {
        if (next[product.id]) {
          return;
        }
        hasChanges = true;
        next[product.id] = {
          title: product.title,
          shortDescription: product.short_description || '',
          status: product.status,
        };
      });
      return hasChanges ? next : previous;
    });
  }, [products]);

  useEffect(() => {
    if (variantMetaById.size === 0) {
      return;
    }
    setVariantDrafts((previous) => {
      let hasChanges = false;
      const next = {
        ...previous,
      };
      variantMetaById.forEach(({ variant }) => {
        if (next[variant.id]) {
          return;
        }
        hasChanges = true;
        next[variant.id] = {
          title: variant.title,
          status: variant.status,
        };
      });
      return hasChanges ? next : previous;
    });
  }, [variantMetaById]);

  const pendingProductCount = Object.keys(dirtyProductIds).length;
  const pendingVariantCount = Object.keys(dirtyVariantIds).length;
  const pendingCount = pendingProductCount + pendingVariantCount;

  const handleProductDraftChange = (
    product: V2Product,
    patch: Partial<ProductDraft>,
  ) => {
    setMessage(null);
    setErrorMessage(null);

    setProductDrafts((previous) => {
      const base = previous[product.id] || {
        title: product.title,
        shortDescription: product.short_description || '',
        status: product.status,
      };
      const nextDraft: ProductDraft = {
        ...base,
        ...patch,
      };

      const normalizedTitle = nextDraft.title.trim();
      const normalizedShortDescription = nextDraft.shortDescription.trim();
      const originShortDescription = (product.short_description || '').trim();
      const hasChanges =
        normalizedTitle !== product.title ||
        normalizedShortDescription !== originShortDescription ||
        nextDraft.status !== product.status;

      setDirtyProductIds((previousDirty) =>
        setDirtyFlag(previousDirty, product.id, hasChanges),
      );

      return {
        ...previous,
        [product.id]: nextDraft,
      };
    });
  };

  const handleVariantDraftChange = (
    variantId: string,
    patch: Partial<VariantDraft>,
  ) => {
    const meta = variantMetaById.get(variantId);
    if (!meta) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);

    setVariantDrafts((previous) => {
      const base = previous[variantId] || {
        title: meta.variant.title,
        status: meta.variant.status,
      };

      const nextDraft: VariantDraft = {
        ...base,
        ...patch,
      };

      const hideTitleInput = shouldHideVariantTitleInput(meta.siblings, meta.variant);
      const normalizedTitle = hideTitleInput ? 'default' : nextDraft.title.trim();
      const hasChanges =
        normalizedTitle !== meta.variant.title ||
        nextDraft.status !== meta.variant.status;

      setDirtyVariantIds((previousDirty) =>
        setDirtyFlag(previousDirty, variantId, hasChanges),
      );

      return {
        ...previous,
        [variantId]: nextDraft,
      };
    });
  };

  const handleSaveAll = async () => {
    const pendingProductIds = Object.keys(dirtyProductIds);
    const pendingVariantIds = Object.keys(dirtyVariantIds);

    if (pendingProductIds.length === 0 && pendingVariantIds.length === 0) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      for (const productId of pendingProductIds) {
        const product = productsById.get(productId);
        const draft = productDrafts[productId];
        if (!product || !draft) {
          continue;
        }

        const nextTitle = draft.title.trim();
        if (!nextTitle) {
          throw new Error('상품명은 비워둘 수 없습니다.');
        }

        await updateProduct.mutateAsync({
          id: product.id,
          data: {
            title: nextTitle,
            short_description: draft.shortDescription.trim() || null,
            status: draft.status,
          },
        });
      }

      for (const variantId of pendingVariantIds) {
        const meta = variantMetaById.get(variantId);
        const draft = variantDrafts[variantId];
        if (!meta || !draft) {
          continue;
        }

        const hideTitleInput = shouldHideVariantTitleInput(meta.siblings, meta.variant);
        const nextTitle = hideTitleInput ? 'default' : draft.title.trim();
        if (!nextTitle) {
          throw new Error('옵션 이름은 비워둘 수 없습니다.');
        }

        await updateVariant.mutateAsync({
          variantId,
          data: {
            title: nextTitle,
            status: draft.status,
          },
        });
      }

      setDirtyProductIds({});
      setDirtyVariantIds({});
      setMessage(`상품 ${pendingProductIds.length}건, 옵션 ${pendingVariantIds.length}건을 저장했습니다.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">일괄 편집 모드</p>
            <p className="mt-1 text-xs text-gray-500">
              표에서 여러 상품/옵션을 수정한 뒤 한 번에 저장합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge intent={pendingCount > 0 ? 'warning' : 'info'}>
              변경 {pendingCount}건
            </Badge>
            <Button onClick={handleSaveAll} disabled={pendingCount === 0} loading={isSaving}>
              변경 일괄 저장
            </Button>
          </div>
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
      {variantsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          옵션 정보를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">상품</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">상품명</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">상태</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">한 줄 설명</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">옵션</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {products.map((product) => {
              const productVariants = variantsByProductId[product.id] || [];
              const productDraft = productDrafts[product.id] || {
                title: product.title,
                shortDescription: product.short_description || '',
                status: product.status,
              };
              const isExpanded = Boolean(expandedProducts[product.id]);
              const isProductDirty = Boolean(dirtyProductIds[product.id]);
              const dirtyVariantCount = productVariants.filter((variant) => dirtyVariantIds[variant.id]).length;

              return (
                <Fragment key={product.id}>
                  <tr className="align-top">
                    <td className="px-3 py-3">
                      <div className="min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-primary-700 hover:underline"
                            onClick={() =>
                              setExpandedProducts((previous) => {
                                const isOpen = Boolean(previous[product.id]);
                                if (isOpen) {
                                  const next = {
                                    ...previous,
                                  };
                                  delete next[product.id];
                                  return next;
                                }
                                return {
                                  ...previous,
                                  [product.id]: true,
                                };
                              })
                            }
                          >
                            {isExpanded ? '옵션 접기' : '옵션 펼치기'}
                          </button>
                          {isProductDirty && <Badge intent="warning" size="sm">저장 대기</Badge>}
                        </div>
                        <p className="mt-1 font-semibold text-gray-900">{product.title}</p>
                        <p className="mt-1 text-xs text-gray-500">/{product.slug}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="min-w-[240px]">
                        <Input
                          value={productDraft.title}
                          onChange={(event) =>
                            handleProductDraftChange(product, {
                              title: event.target.value,
                            })
                          }
                          placeholder="상품명"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="min-w-[150px]">
                        <Select
                          value={productDraft.status}
                          onChange={(event) =>
                            handleProductDraftChange(product, {
                              status: event.target.value as V2ProductStatus,
                            })
                          }
                          options={PRODUCT_STATUS_VALUES.map((status) => ({
                            value: status,
                            label: PRODUCT_STATUS_LABELS[status],
                          }))}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="min-w-[260px]">
                        <Input
                          value={productDraft.shortDescription}
                          onChange={(event) =>
                            handleProductDraftChange(product, {
                              shortDescription: event.target.value,
                            })
                          }
                          placeholder="한 줄 설명"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-[120px] items-center gap-2">
                        <Badge intent="info" size="sm">{productVariants.length}개</Badge>
                        {dirtyVariantCount > 0 && (
                          <Badge intent="warning" size="sm">변경 {dirtyVariantCount}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Button size="sm" intent="neutral" onClick={() => onOpenDetail(product.id)}>
                        고급 상세
                      </Button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 px-3 py-3">
                        {variantsLoading || variantsFetching ? (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                            옵션 정보를 불러오는 중입니다.
                          </div>
                        ) : productVariants.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                            등록된 옵션이 없습니다. 고급 상세에서 옵션을 추가해 주세요.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">옵션명</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">옵션 상태</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">SKU / 타입</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">변경</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {productVariants.map((variant) => {
                                  const draft = variantDrafts[variant.id] || {
                                    title: variant.title,
                                    status: variant.status,
                                  };
                                  const hideTitleInput = shouldHideVariantTitleInput(productVariants, variant);
                                  const isVariantDirty = Boolean(dirtyVariantIds[variant.id]);

                                  return (
                                    <tr key={variant.id}>
                                      <td className="px-3 py-2">
                                        {hideTitleInput ? (
                                          <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
                                            default
                                          </div>
                                        ) : (
                                          <Input
                                            value={draft.title}
                                            onChange={(event) =>
                                              handleVariantDraftChange(variant.id, {
                                                title: event.target.value,
                                              })
                                            }
                                            placeholder="옵션명"
                                          />
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Select
                                          value={draft.status}
                                          onChange={(event) =>
                                            handleVariantDraftChange(variant.id, {
                                              status: event.target.value as V2VariantStatus,
                                            })
                                          }
                                          options={VARIANT_STATUS_VALUES.map((status) => ({
                                            value: status,
                                            label: VARIANT_STATUS_LABELS[status],
                                          }))}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600">
                                        <p>{variant.sku}</p>
                                        <p className="mt-1">{FULFILLMENT_TYPE_LABELS[variant.fulfillment_type]}</p>
                                      </td>
                                      <td className="px-3 py-2">
                                        {isVariantDirty ? (
                                          <Badge intent="warning" size="sm">저장 대기</Badge>
                                        ) : (
                                          <span className="text-xs text-gray-400">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
