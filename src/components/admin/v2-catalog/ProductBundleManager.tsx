'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import type {
  V2BundleComponent,
  V2BundleMode,
  V2BundlePricingStrategy,
  V2BundleStatus,
  V2Product,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2BundleComponent,
  useCreateV2BundleDefinition,
  useDeleteV2BundleComponent,
  useUpdateV2BundleComponent,
  useUpdateV2BundleDefinition,
  useV2AdminProducts,
  useV2AdminVariantsMap,
  useV2BundleComponents,
  useV2BundleDefinitions,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { queryKeys } from '@/lib/client/hooks/query-keys';

type ProductBundleManagerProps = {
  bundleProduct: V2Product;
};

type DesiredBundleComponent = {
  variantId: string;
  isRequired: boolean;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  sortOrder: number;
};

type BundleQuantityPolicy = 'INHERIT_PARENT' | 'FIXED_PER_PARENT';

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

function resolveDefinitionStatusIntent(
  status: V2BundleStatus,
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
  return 'default';
}

function sortProducts(left: V2Product, right: V2Product): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }
  return left.title.localeCompare(right.title, 'ko-KR');
}

function sortVariants(left: V2Variant, right: V2Variant): number {
  return left.title.localeCompare(right.title, 'ko-KR');
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function ProductBundleManager({ bundleProduct }: ProductBundleManagerProps) {
  const queryClient = useQueryClient();
  const [preferredDefinitionId, setPreferredDefinitionId] = useState<string | null>(
    null,
  );
  const [draftSelectedProductIds, setDraftSelectedProductIds] = useState<string[]>(
    [],
  );
  const [isSelectionDirty, setIsSelectionDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: definitions,
    isLoading: definitionsLoading,
    error: definitionsError,
  } = useV2BundleDefinitions({
    bundleProductId: bundleProduct.id,
  });

  const sortedDefinitions = useMemo(
    () => [...(definitions || [])].sort((left, right) => right.version_no - left.version_no),
    [definitions],
  );
  const defaultDefinition = useMemo(
    () => sortedDefinitions.find((definition) => definition.status === 'DRAFT') || sortedDefinitions[0] || null,
    [sortedDefinitions],
  );
  const activeDefinition = useMemo(() => {
    if (!preferredDefinitionId) {
      return defaultDefinition;
    }
    return (
      sortedDefinitions.find((definition) => definition.id === preferredDefinitionId) ||
      defaultDefinition
    );
  }, [defaultDefinition, preferredDefinitionId, sortedDefinitions]);
  const activeDefinitionId = activeDefinition?.id ?? null;

  const {
    data: components,
    isLoading: componentsLoading,
    error: componentsError,
  } = useV2BundleComponents(activeDefinitionId);

  const {
    data: projectProducts,
    isLoading: productsLoading,
    error: productsError,
  } = useV2AdminProducts({ projectId: bundleProduct.project_id });

  const selectableProducts = useMemo(
    () =>
      (projectProducts || [])
        .filter(
          (product) =>
            product.id !== bundleProduct.id &&
            product.product_kind === 'STANDARD' &&
            product.status !== 'ARCHIVED',
        )
        .sort(sortProducts),
    [bundleProduct.id, projectProducts],
  );

  const selectableProductIds = useMemo(
    () => selectableProducts.map((product) => product.id),
    [selectableProducts],
  );

  const {
    variantsByProductId,
    isLoading: variantsLoading,
    isError: variantsError,
  } = useV2AdminVariantsMap(selectableProductIds);

  const selectableVariantsByProductId = useMemo(() => {
    return selectableProducts.reduce<Record<string, V2Variant[]>>((accumulator, product) => {
      accumulator[product.id] = (variantsByProductId[product.id] || [])
        .filter((variant) => variant.status !== 'INACTIVE')
        .sort(sortVariants);
      return accumulator;
    }, {});
  }, [selectableProducts, variantsByProductId]);

  const manageableVariantIdSet = useMemo(() => {
    const variantIds = Object.values(selectableVariantsByProductId).flatMap((variants) =>
      variants.map((variant) => variant.id),
    );
    return new Set(variantIds);
  }, [selectableVariantsByProductId]);

  const variantIdToProductId = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(selectableVariantsByProductId).forEach(([productId, variants]) => {
      variants.forEach((variant) => {
        map.set(variant.id, productId);
      });
    });
    return map;
  }, [selectableVariantsByProductId]);

  const selectedProductIdsFromDefinition = useMemo(() => {
    const selected = new Set<string>();
    (components || []).forEach((component) => {
      const productId = variantIdToProductId.get(component.component_variant_id);
      if (productId) {
        selected.add(productId);
      }
    });
    return Array.from(selected);
  }, [components, variantIdToProductId]);

  const selectedProductIds = useMemo(
    () => (isSelectionDirty ? draftSelectedProductIds : selectedProductIdsFromDefinition),
    [draftSelectedProductIds, isSelectionDirty, selectedProductIdsFromDefinition],
  );

  const inferredQuantityPolicy = useMemo<BundleQuantityPolicy>(() => {
    const policy = activeDefinition?.metadata?.product_editor_policy;
    if (!policy || typeof policy !== 'object') {
      return 'INHERIT_PARENT';
    }

    const quantityPolicy = (policy as { quantity_policy?: unknown }).quantity_policy;
    return quantityPolicy === 'FIXED_PER_PARENT'
      ? 'FIXED_PER_PARENT'
      : 'INHERIT_PARENT';
  }, [activeDefinition?.metadata]);

  const inferredFixedQuantity = useMemo(() => {
    const policy = activeDefinition?.metadata?.product_editor_policy;
    if (!policy || typeof policy !== 'object') {
      return '1';
    }

    const quantityPerParent = (policy as { quantity_per_parent?: unknown })
      .quantity_per_parent;
    if (
      typeof quantityPerParent !== 'number' ||
      !Number.isInteger(quantityPerParent) ||
      quantityPerParent <= 0
    ) {
      return '1';
    }
    return String(quantityPerParent);
  }, [activeDefinition?.metadata]);

  const [draftQuantityPolicy, setDraftQuantityPolicy] =
    useState<BundleQuantityPolicy>('INHERIT_PARENT');
  const [draftFixedQuantity, setDraftFixedQuantity] = useState('1');
  const [isPolicyDirty, setIsPolicyDirty] = useState(false);

  const selectedQuantityPolicy = isPolicyDirty
    ? draftQuantityPolicy
    : inferredQuantityPolicy;
  const selectedFixedQuantity =
    selectedQuantityPolicy === 'INHERIT_PARENT'
      ? 1
      : parsePositiveInteger(isPolicyDirty ? draftFixedQuantity : inferredFixedQuantity);

  const createDefinition = useCreateV2BundleDefinition();
  const updateDefinition = useUpdateV2BundleDefinition();
  const createComponent = useCreateV2BundleComponent();
  const updateComponent = useUpdateV2BundleComponent();
  const deleteComponent = useDeleteV2BundleComponent();

  const isSaving =
    createDefinition.isPending ||
    updateDefinition.isPending ||
    createComponent.isPending ||
    updateComponent.isPending ||
    deleteComponent.isPending;

  const runWithNotice = async (task: () => Promise<void>) => {
    setMessage(null);
    setErrorMessage(null);

    try {
      await task();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleToggleProduct = (productId: string, checked: boolean) => {
    const baseSelectedProductIds = isSelectionDirty
      ? draftSelectedProductIds
      : selectedProductIdsFromDefinition;

    setIsSelectionDirty(true);
    setDraftSelectedProductIds(() => {
      if (checked) {
        return Array.from(new Set([...baseSelectedProductIds, productId]));
      }
      return baseSelectedProductIds.filter((id) => id !== productId);
    });
  };

  const ensureEditableDefinition = async (): Promise<{
    definitionId: string;
    mode: V2BundleMode;
    metadata: Record<string, unknown>;
    existingComponents: V2BundleComponent[];
    isNewVersion: boolean;
    versionNo: number;
  }> => {
    if (activeDefinition && activeDefinition.status === 'DRAFT') {
      return {
        definitionId: activeDefinition.id,
        mode: activeDefinition.mode,
        metadata: activeDefinition.metadata || {},
        existingComponents: components || [],
        isNewVersion: false,
        versionNo: activeDefinition.version_no,
      };
    }

    const pricingStrategy: V2BundlePricingStrategy =
      activeDefinition?.pricing_strategy || 'WEIGHTED';
    const response = await createDefinition.mutateAsync({
      bundle_product_id: bundleProduct.id,
      mode: 'CUSTOMIZABLE',
      pricing_strategy: pricingStrategy,
      skipInvalidate: true,
    });
    setPreferredDefinitionId(response.data.id);

    return {
      definitionId: response.data.id,
      mode: response.data.mode,
      metadata: response.data.metadata || {},
      existingComponents: [],
      isNewVersion: true,
      versionNo: response.data.version_no,
    };
  };

  const buildDesiredComponents = (): DesiredBundleComponent[] => {
    let sortOrder = 0;
    const selectedSet = new Set(selectedProductIds);
    const orderedSelectedProducts = selectableProducts.filter((product) =>
      selectedSet.has(product.id),
    );

    return orderedSelectedProducts.flatMap((product) => {
      const selectableVariants = selectableVariantsByProductId[product.id] || [];
      if (selectableVariants.length === 0) {
        return [];
      }

      if (selectableVariants.length === 1) {
        const onlyVariant = selectableVariants[0];
        const desiredComponent: DesiredBundleComponent = {
          variantId: onlyVariant.id,
          isRequired: true,
          minQuantity: 1,
          maxQuantity: 1,
          defaultQuantity: 1,
          sortOrder,
        };
        sortOrder += 1;
        return [desiredComponent];
      }

      const desiredComponents = selectableVariants.map((variant) => {
        const desiredComponent: DesiredBundleComponent = {
          variantId: variant.id,
          isRequired: false,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
          sortOrder,
        };
        sortOrder += 1;
        return desiredComponent;
      });

      return desiredComponents;
    });
  };

  const handleSave = async () => {
    if (definitionsLoading || productsLoading || variantsLoading) {
      return;
    }

    if (selectedQuantityPolicy === 'FIXED_PER_PARENT' && !selectedFixedQuantity) {
      setMessage(null);
      setErrorMessage('고정 수량은 1 이상의 정수여야 합니다.');
      return;
    }

    await runWithNotice(async () => {
      const editableDefinition = await ensureEditableDefinition();
      const quantityPerParent =
        selectedQuantityPolicy === 'INHERIT_PARENT' ? 1 : selectedFixedQuantity!;
      const desiredComponents = buildDesiredComponents();
      const desiredByVariantId = new Map(
        desiredComponents.map((component) => [component.variantId, component]),
      );
      const existingByVariantId = new Map(
        editableDefinition.existingComponents.map((component) => [
          component.component_variant_id,
          component,
        ]),
      );

      await updateDefinition.mutateAsync({
        definitionId: editableDefinition.definitionId,
        data: {
          mode: editableDefinition.mode === 'CUSTOMIZABLE' ? undefined : 'CUSTOMIZABLE',
          metadata: {
            ...editableDefinition.metadata,
            product_editor_policy: {
              variant_inclusion: 'MIXED',
              quantity_policy: selectedQuantityPolicy,
              quantity_per_parent: quantityPerParent,
              configured_at: new Date().toISOString(),
            },
          },
        },
        skipInvalidate: true,
      });

      const componentsToDelete = editableDefinition.existingComponents.filter(
        (component) =>
          manageableVariantIdSet.has(component.component_variant_id) &&
          !desiredByVariantId.has(component.component_variant_id),
      );
      const componentsToCreate = desiredComponents.filter(
        (component) => !existingByVariantId.has(component.variantId),
      );
      const componentsToUpdate = editableDefinition.existingComponents
        .map((component) => ({
          component,
          desired: desiredByVariantId.get(component.component_variant_id),
        }))
        .filter(
          (
            entry,
          ): entry is { component: V2BundleComponent; desired: DesiredBundleComponent } =>
            Boolean(entry.desired),
        )
        .filter(({ component, desired }) => {
          return (
            component.is_required !== desired.isRequired ||
            component.min_quantity !== desired.minQuantity ||
            component.max_quantity !== desired.maxQuantity ||
            component.default_quantity !== desired.defaultQuantity ||
            component.sort_order !== desired.sortOrder
          );
        });

      for (const component of componentsToDelete) {
        await deleteComponent.mutateAsync({
          componentId: component.id,
          skipInvalidate: true,
        });
      }

      for (const component of componentsToCreate) {
        await createComponent.mutateAsync({
          definitionId: editableDefinition.definitionId,
          data: {
            component_variant_id: component.variantId,
            is_required: component.isRequired,
            min_quantity: component.minQuantity,
            max_quantity: component.maxQuantity,
            default_quantity: component.defaultQuantity,
            sort_order: component.sortOrder,
            price_allocation_weight: 1,
          },
          skipInvalidate: true,
        });
      }

      for (const { component, desired } of componentsToUpdate) {
        await updateComponent.mutateAsync({
          componentId: component.id,
          data: {
            is_required: desired.isRequired,
            min_quantity: desired.minQuantity,
            max_quantity: desired.maxQuantity,
            default_quantity: desired.defaultQuantity,
            sort_order: desired.sortOrder,
          },
          skipInvalidate: true,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2CatalogAdmin.bundles.definitions.all,
      });

      setIsSelectionDirty(false);
      setDraftSelectedProductIds(selectedProductIds);
      setIsPolicyDirty(false);
      setDraftQuantityPolicy(selectedQuantityPolicy);
      setDraftFixedQuantity(String(quantityPerParent));
      setMessage(
        editableDefinition.isNewVersion
          ? `DRAFT v${editableDefinition.versionNo}을 생성하고 번들 구성 상품을 저장했습니다.`
          : '번들 구성 상품을 저장했습니다.',
      );
    });
  };

  const hasCriticalLoadError =
    Boolean(definitionsError) || Boolean(productsError) || variantsError;
  const hasInvalidFixedQuantity =
    selectedQuantityPolicy === 'FIXED_PER_PARENT' && !selectedFixedQuantity;

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-900">번들 구성 상품</h2>
          <p className="mt-1 text-sm text-blue-900/80">
            같은 프로젝트 상품을 고르면 번들 구성에 반영됩니다. 옵션은 구매 시점에 소비자가 선택합니다.
          </p>
          <p className="mt-2 text-xs text-blue-900/80">
            옵션이 1개인 상품은 자동 포함되고, 옵션이 2개 이상인 상품은 선택형으로 저장됩니다.
          </p>
          {activeDefinition && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-blue-900/80">
              <Badge intent={resolveDefinitionStatusIntent(activeDefinition.status)} size="sm">
                v{activeDefinition.version_no} · {activeDefinition.status}
              </Badge>
              <span>
                mode={activeDefinition.mode} / pricing={activeDefinition.pricing_strategy}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge intent="info">{selectedProductIds.length}개 선택</Badge>
          <Button
            intent="neutral"
            loading={isSaving}
            disabled={
              definitionsLoading ||
              componentsLoading ||
              productsLoading ||
              variantsLoading ||
              hasCriticalLoadError ||
              hasInvalidFixedQuantity
            }
            onClick={handleSave}
          >
            번들 구성 저장
          </Button>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-blue-200 bg-white px-4 py-4">
        <p className="text-sm font-semibold text-blue-900">수량 정책</p>
        <p className="mt-1 text-xs text-blue-900/80">
          번들 편집 시 사용한 수량 정책을 metadata에 기록합니다. 현재 화면의 구성 방식은 기존과 동일합니다.
        </p>
        <div className="mt-3 space-y-2">
          <label className="flex items-start gap-2 rounded-lg border border-blue-100 px-3 py-2">
            <input
              type="radio"
              name="bundle-quantity-policy"
              checked={selectedQuantityPolicy === 'INHERIT_PARENT'}
              onChange={() => {
                setIsPolicyDirty(true);
                setDraftQuantityPolicy('INHERIT_PARENT');
              }}
            />
            <span className="text-sm text-gray-700">
              부모 수량 상속(`INHERIT_PARENT`): 부모 1개당 기본 수량 정책을 사용합니다.
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-blue-100 px-3 py-2">
            <input
              type="radio"
              name="bundle-quantity-policy"
              checked={selectedQuantityPolicy === 'FIXED_PER_PARENT'}
              onChange={() => {
                setIsPolicyDirty(true);
                setDraftQuantityPolicy('FIXED_PER_PARENT');
                setDraftFixedQuantity(inferredFixedQuantity);
              }}
            />
            <span className="text-sm text-gray-700">
              고정 수량(`FIXED_PER_PARENT`): 부모 1개당 고정 배수를 기록합니다.
            </span>
          </label>
          {selectedQuantityPolicy === 'FIXED_PER_PARENT' && (
            <div className="flex items-center gap-2 pl-6">
              <label
                htmlFor="bundle-fixed-quantity"
                className="text-xs font-medium text-gray-600"
              >
                부모 1개당 고정 수량
              </label>
              <input
                id="bundle-fixed-quantity"
                type="number"
                min={1}
                className="h-9 w-24 rounded-md border border-gray-300 px-2 text-sm"
                value={isPolicyDirty ? draftFixedQuantity : inferredFixedQuantity}
                onChange={(event) => {
                  setIsPolicyDirty(true);
                  setDraftFixedQuantity(event.target.value);
                }}
              />
            </div>
          )}
        </div>
        {hasInvalidFixedQuantity && (
          <p className="mt-3 text-xs text-red-600">
            고정 수량은 1 이상의 정수만 입력할 수 있습니다.
          </p>
        )}
      </div>

      {definitionsLoading || componentsLoading || productsLoading || variantsLoading ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-white px-4 py-8">
          <Loading size="md" text="번들 구성 가능한 상품을 불러오는 중입니다." />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {hasCriticalLoadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              번들 구성 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          )}
          {!hasCriticalLoadError && componentsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              기존 번들 구성 조회에 실패했습니다. 저장 시 새 구성으로 덮어씁니다.
            </div>
          )}

          {!hasCriticalLoadError && selectableProducts.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              선택 가능한 일반 상품이 없습니다. 같은 프로젝트에 STANDARD 상품을 먼저 만들어 주세요.
            </div>
          )}

          {!hasCriticalLoadError &&
            selectableProducts.map((product) => {
              const variants = selectableVariantsByProductId[product.id] || [];
              const variantCount = variants.length;
              const checked = selectedProductIds.includes(product.id);
              const disabled = variantCount === 0;
              const optionSummary =
                variantCount <= 1
                  ? '옵션 1개(자동 포함)'
                  : `옵션 ${variantCount}개(구매 시 소비자 선택)`;

              return (
                <label
                  key={product.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                    checked
                      ? 'border-blue-300 bg-white'
                      : 'border-blue-100 bg-white/80 hover:border-blue-200'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) =>
                      handleToggleProduct(product.id, event.target.checked)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                      <Badge intent="default" size="sm">
                        {optionSummary}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">/shop/{product.slug}</p>
                    {disabled ? (
                      <p className="mt-1 text-xs text-amber-700">
                        선택 가능한 옵션이 없어 번들에 추가할 수 없습니다.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-600">
                        {variantCount === 1
                          ? '관리자가 옵션을 고를 필요가 없습니다.'
                          : '소비자가 구매 시 원하는 옵션을 선택합니다.'}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
        </div>
      )}
    </section>
  );
}
