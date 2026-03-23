'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import {
  useArchiveV2BundleDefinition,
  useV2AdminProducts,
  useV2AdminVariants,
  useBuildV2BundleCanaryReport,
  useBuildV2BundleOpsContract,
  useCloneV2BundleDefinitionVersion,
  useCreateV2BundleComponent,
  useCreateV2BundleComponentOption,
  useCreateV2BundleDefinition,
  useDeleteV2BundleComponent,
  useDeleteV2BundleComponentOption,
  usePreviewV2Bundle,
  usePublishV2BundleDefinition,
  useResolveV2Bundle,
  useUpdateV2BundleComponent,
  useUpdateV2BundleComponentOption,
  useV2BundleComponents,
  useV2BundleDefinition,
  useV2BundleDefinitions,
  useValidateV2BundleDefinition,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import type {
  V2BundleComponentSelectionData,
  V2BundleStatus,
} from '@/lib/client/api/v2-catalog-admin.api';

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

function parseSelectionInput(raw: string): V2BundleComponentSelectionData[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error('selected_components는 배열(JSON)이어야 합니다.');
  }

  return parsed.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('selected_components 항목 형식이 올바르지 않습니다.');
    }
    const record = item as Record<string, unknown>;
    if (typeof record.component_variant_id !== 'string') {
      throw new Error('component_variant_id는 문자열이어야 합니다.');
    }
    if (!Number.isInteger(record.quantity) || Number(record.quantity) < 0) {
      throw new Error('quantity는 0 이상의 정수여야 합니다.');
    }
    return {
      component_variant_id: record.component_variant_id,
      quantity: Number(record.quantity),
    };
  });
}

function parsePositiveInteger(value: string, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}는 1 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function parseNonNegativeNumber(value: string, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName}는 0 이상의 숫자여야 합니다.`);
  }
  return parsed;
}

function resolveStatusBadgeIntent(status: V2BundleStatus): 'warning' | 'success' | 'default' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  return 'default';
}

export default function V2CatalogBundlesPage() {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newBundleProductId, setNewBundleProductId] = useState('');
  const [newMode, setNewMode] = useState<'FIXED' | 'CUSTOMIZABLE'>('FIXED');
  const [newPricingStrategy, setNewPricingStrategy] = useState<'WEIGHTED' | 'FIXED_AMOUNT'>(
    'WEIGHTED',
  );

  const [newComponentProductId, setNewComponentProductId] = useState('');
  const [newComponentVariantId, setNewComponentVariantId] = useState('');
  const [newComponentRequired, setNewComponentRequired] = useState(true);
  const [newMinQuantity, setNewMinQuantity] = useState('1');
  const [newMaxQuantity, setNewMaxQuantity] = useState('1');
  const [newDefaultQuantity, setNewDefaultQuantity] = useState('1');
  const [newAllocationWeight, setNewAllocationWeight] = useState('1');

  const [selectionJson, setSelectionJson] = useState('');
  const [parentQuantity, setParentQuantity] = useState('1');
  const [parentUnitAmount, setParentUnitAmount] = useState('');

  const [validationResult, setValidationResult] = useState<unknown>(null);
  const [previewResult, setPreviewResult] = useState<unknown>(null);
  const [resolveResult, setResolveResult] = useState<unknown>(null);
  const [opsContractResult, setOpsContractResult] = useState<unknown>(null);
  const [canaryReportResult, setCanaryReportResult] = useState<unknown>(null);

  const {
    data: definitions,
    isLoading: definitionsLoading,
    error: definitionsError,
  } = useV2BundleDefinitions();
  const preferredDraftDefinitionId = useMemo(
    () => (definitions || []).find((definition) => definition.status === 'DRAFT')?.id ?? null,
    [definitions],
  );
  const activeDefinitionId =
    selectedDefinitionId ?? preferredDraftDefinitionId ?? definitions?.[0]?.id ?? null;
  const { data: selectedDefinition } = useV2BundleDefinition(activeDefinitionId);
  const {
    data: components,
    isLoading: componentsLoading,
  } = useV2BundleComponents(activeDefinitionId);

  const createDefinition = useCreateV2BundleDefinition();
  const publishDefinition = usePublishV2BundleDefinition();
  const archiveDefinition = useArchiveV2BundleDefinition();
  const cloneDefinition = useCloneV2BundleDefinitionVersion();

  const createComponent = useCreateV2BundleComponent();
  const updateComponent = useUpdateV2BundleComponent();
  const deleteComponent = useDeleteV2BundleComponent();
  const createComponentOption = useCreateV2BundleComponentOption();
  const updateComponentOption = useUpdateV2BundleComponentOption();
  const deleteComponentOption = useDeleteV2BundleComponentOption();

  const validateBundle = useValidateV2BundleDefinition(activeDefinitionId);
  const previewBundle = usePreviewV2Bundle();
  const resolveBundle = useResolveV2Bundle();
  const buildOpsContract = useBuildV2BundleOpsContract();
  const buildCanaryReport = useBuildV2BundleCanaryReport();

  const { data: products, isLoading: productsLoading } = useV2AdminProducts();
  const activeProducts = useMemo(
    () => (products || []).filter((product) => product.status !== 'ARCHIVED'),
    [products],
  );
  const componentProductIdForQuery =
    newComponentProductId &&
    activeProducts.some((product) => product.id === newComponentProductId)
      ? newComponentProductId
      : activeProducts[0]?.id || '';
  const { data: selectableVariants, isLoading: selectableVariantsLoading } =
    useV2AdminVariants(componentProductIdForQuery || null);

  const bundleProducts = useMemo(
    () => activeProducts.filter((product) => product.product_kind === 'BUNDLE'),
    [activeProducts],
  );
  const bundleProductOptions = useMemo(
    () =>
      bundleProducts.map((product) => ({
        value: product.id,
        label: `${product.title} (${product.slug})`,
      })),
    [bundleProducts],
  );
  const componentProductOptions = useMemo(
    () =>
      activeProducts.map((product) => ({
        value: product.id,
        label: `${product.title} · ${product.product_kind}`,
      })),
    [activeProducts],
  );
  const componentVariantOptions = useMemo(
    () =>
      (selectableVariants || []).map((variant) => ({
        value: variant.id,
        label: `${variant.title} (${variant.sku}) · ${variant.fulfillment_type}`,
      })),
    [selectableVariants],
  );
  const productTitleById = useMemo(
    () => new Map((activeProducts || []).map((product) => [product.id, product.title])),
    [activeProducts],
  );
  const resolvedNewBundleProductId =
    newBundleProductId && bundleProducts.some((product) => product.id === newBundleProductId)
      ? newBundleProductId
      : bundleProducts[0]?.id || '';
  const resolvedNewComponentProductId = componentProductIdForQuery;
  const resolvedNewComponentVariantId =
    newComponentVariantId &&
    componentVariantOptions.some((variant) => variant.value === newComponentVariantId)
      ? newComponentVariantId
      : componentVariantOptions[0]?.value || '';

  const activeComponentId = useMemo(() => {
    const list = components || [];
    if (selectedComponentId && list.some((component) => component.id === selectedComponentId)) {
      return selectedComponentId;
    }
    return list[0]?.id ?? null;
  }, [components, selectedComponentId]);

  const selectedComponent = useMemo(
    () => (components || []).find((component) => component.id === activeComponentId) ?? null,
    [components, activeComponentId],
  );

  const selectedDefinitionLabel = useMemo(() => {
    if (!selectedDefinition) {
      return '-';
    }
    const productTitle =
      productTitleById.get(selectedDefinition.bundle_product_id) ||
      selectedDefinition.bundle_product_id;
    return `${productTitle} · v${selectedDefinition.version_no}`;
  }, [productTitleById, selectedDefinition]);

  const draftDefinitionCount = useMemo(
    () => (definitions || []).filter((definition) => definition.status === 'DRAFT').length,
    [definitions],
  );

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const runWithNotice = async (task: () => Promise<void>) => {
    clearNotice();
    try {
      await task();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleCreateDefinition = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithNotice(async () => {
      const response = await createDefinition.mutateAsync({
        bundle_product_id: resolvedNewBundleProductId,
        mode: newMode,
        status: 'DRAFT',
        pricing_strategy: newPricingStrategy,
      });
      setSelectedDefinitionId(response.data.id);
      setMessage(`DRAFT bundle definition(v${response.data.version_no})을 생성했습니다.`);
    });
  };

  const handlePublishDefinition = async () => {
    if (!activeDefinitionId) {
      return;
    }
    await runWithNotice(async () => {
      await publishDefinition.mutateAsync(activeDefinitionId);
      setMessage('bundle definition을 ACTIVE로 publish했습니다.');
    });
  };

  const handleArchiveDefinition = async () => {
    if (!activeDefinitionId) {
      return;
    }
    await runWithNotice(async () => {
      await archiveDefinition.mutateAsync(activeDefinitionId);
      setMessage('bundle definition을 ARCHIVED로 변경했습니다.');
    });
  };

  const handleCloneDefinition = async () => {
    if (!activeDefinitionId) {
      return;
    }
    await runWithNotice(async () => {
      const response = await cloneDefinition.mutateAsync({
        definitionId: activeDefinitionId,
        data: {},
      });
      setSelectedDefinitionId(response.data.id);
      setMessage(`신규 DRAFT 버전(v${response.data.version_no})을 생성했습니다.`);
    });
  };

  const handleCreateComponent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeDefinitionId) {
      return;
    }

    await runWithNotice(async () => {
      await createComponent.mutateAsync({
        definitionId: activeDefinitionId,
        data: {
          component_variant_id: resolvedNewComponentVariantId,
          is_required: newComponentRequired,
          min_quantity: parseNonNegativeInteger(newMinQuantity, 'min_quantity'),
          max_quantity: parsePositiveInteger(newMaxQuantity, 'max_quantity'),
          default_quantity: parseNonNegativeInteger(
            newDefaultQuantity,
            'default_quantity',
          ),
          price_allocation_weight: parseNonNegativeNumber(
            newAllocationWeight,
            'price_allocation_weight',
          ),
        },
      });
      setNewComponentVariantId('');
      setMessage('bundle component를 추가했습니다.');
    });
  };

  const handleUpdateComponent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedComponent || !activeComponentId) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    await runWithNotice(async () => {
      await updateComponent.mutateAsync({
        componentId: activeComponentId,
        data: {
          component_variant_id: String(formData.get('component_variant_id') || '').trim(),
          is_required: formData.get('is_required') === 'on',
          min_quantity: parseNonNegativeInteger(
            String(formData.get('min_quantity') || ''),
            'min_quantity',
          ),
          max_quantity: parsePositiveInteger(
            String(formData.get('max_quantity') || ''),
            'max_quantity',
          ),
          default_quantity: parseNonNegativeInteger(
            String(formData.get('default_quantity') || ''),
            'default_quantity',
          ),
          sort_order: parseNonNegativeInteger(
            String(formData.get('sort_order') || ''),
            'sort_order',
          ),
          price_allocation_weight: parseNonNegativeNumber(
            String(formData.get('price_allocation_weight') || ''),
            'price_allocation_weight',
          ),
        },
      });
      setMessage('bundle component를 수정했습니다.');
    });
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!window.confirm('이 component를 삭제하시겠습니까?')) {
      return;
    }

    await runWithNotice(async () => {
      await deleteComponent.mutateAsync(componentId);
      if (selectedComponentId === componentId) {
        setSelectedComponentId(null);
      }
      setMessage('bundle component를 삭제했습니다.');
    });
  };

  const handleCreateOption = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeComponentId) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    await runWithNotice(async () => {
      await createComponentOption.mutateAsync({
        componentId: activeComponentId,
        data: {
          option_key: String(formData.get('option_key') || '').trim(),
          option_value: String(formData.get('option_value') || '').trim(),
          sort_order: parseNonNegativeInteger(
            String(formData.get('sort_order') || '0'),
            'sort_order',
          ),
        },
      });
      event.currentTarget.reset();
      setMessage('bundle component option을 추가했습니다.');
    });
  };

  const handleUpdateOption = async (
    optionId: string,
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await runWithNotice(async () => {
      await updateComponentOption.mutateAsync({
        optionId,
        data: {
          option_key: String(formData.get('option_key') || '').trim(),
          option_value: String(formData.get('option_value') || '').trim(),
          sort_order: parseNonNegativeInteger(
            String(formData.get('sort_order') || '0'),
            'sort_order',
          ),
        },
      });
      setMessage('bundle component option을 수정했습니다.');
    });
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!window.confirm('이 option을 삭제하시겠습니까?')) {
      return;
    }

    await runWithNotice(async () => {
      await deleteComponentOption.mutateAsync(optionId);
      setMessage('bundle component option을 삭제했습니다.');
    });
  };

  const runValidation = async () => {
    if (!activeDefinitionId) {
      return;
    }

    await runWithNotice(async () => {
      const selected = parseSelectionInput(selectionJson);
      const result = await validateBundle.mutateAsync({
        selected_components: selected,
      });
      setValidationResult(result);
      setMessage('bundle validation을 실행했습니다.');
    });
  };

  const runPreview = async () => {
    if (!activeDefinitionId) {
      return;
    }

    await runWithNotice(async () => {
      const selected = parseSelectionInput(selectionJson);
      const result = await previewBundle.mutateAsync({
        bundle_definition_id: activeDefinitionId,
        parent_quantity: parsePositiveInteger(parentQuantity, 'parent_quantity'),
        selected_components: selected,
      });
      setPreviewResult(result);
      setMessage('bundle preview를 실행했습니다.');
    });
  };

  const runResolve = async () => {
    if (!activeDefinitionId) {
      return;
    }

    await runWithNotice(async () => {
      const selected = parseSelectionInput(selectionJson);
      const resolvedParentUnitAmount =
        parentUnitAmount.trim() === ''
          ? null
          : parseNonNegativeInteger(parentUnitAmount, 'parent_unit_amount');

      const result = await resolveBundle.mutateAsync({
        bundle_definition_id: activeDefinitionId,
        parent_quantity: parsePositiveInteger(parentQuantity, 'parent_quantity'),
        parent_unit_amount: resolvedParentUnitAmount,
        selected_components: selected,
      });
      setResolveResult(result);
      setMessage('bundle resolve를 실행했습니다.');
    });
  };

  const runOpsContract = async () => {
    if (!activeDefinitionId) {
      return;
    }

    await runWithNotice(async () => {
      const selected = parseSelectionInput(selectionJson);
      const resolvedParentUnitAmount =
        parentUnitAmount.trim() === ''
          ? null
          : parseNonNegativeInteger(parentUnitAmount, 'parent_unit_amount');

      const result = await buildOpsContract.mutateAsync({
        bundle_definition_id: activeDefinitionId,
        parent_quantity: parsePositiveInteger(parentQuantity, 'parent_quantity'),
        parent_unit_amount: resolvedParentUnitAmount,
        selected_components: selected,
      });
      setOpsContractResult(result);
      setMessage('component 기준 CS/환불/재발송 계약을 생성했습니다.');
    });
  };

  const runCanaryReport = async () => {
    await runWithNotice(async () => {
      const resolvedParentUnitAmount =
        parentUnitAmount.trim() === ''
          ? null
          : parseNonNegativeInteger(parentUnitAmount, 'parent_unit_amount');

      const result = await buildCanaryReport.mutateAsync({
        definition_ids: activeDefinitionId ? [activeDefinitionId] : undefined,
        sample_parent_quantity: parsePositiveInteger(parentQuantity, 'parent_quantity'),
        sample_parent_unit_amount: resolvedParentUnitAmount,
      });
      setCanaryReportResult(result);
      setMessage('canary/shadow 검증 리포트를 생성했습니다.');
    });
  };

  if (definitionsLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" text="bundle definition 목록을 불러오는 중입니다" />
      </div>
    );
  }

  if (definitionsError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        bundle definition 목록 조회에 실패했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">번들 버전 관리 (DRAFT 중심)</h1>
        <p className="mt-1 text-sm text-gray-500">
          상품 관리 탭에서 기본 구성을 확정한 뒤, 이 화면에서는 버전별 미세 조정과 검증을 진행합니다.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="text-base font-semibold text-blue-900">운영 가이드</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-900/90">
          <li>대표 번들 상품을 선택해 새 DRAFT 버전을 만듭니다.</li>
          <li>구성품/수량/옵션을 조정하고 Validate로 유효성을 확인합니다.</li>
          <li>문제가 없으면 Publish로 ACTIVE 전환하고, 이전 ACTIVE는 자동으로 DRAFT로 내려갑니다.</li>
        </ol>
        <p className="mt-3 text-xs text-blue-900/80">
          현재 DRAFT 버전 수: {draftDefinitionCount}개
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <form
          className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
          onSubmit={handleCreateDefinition}
        >
          <h2 className="text-base font-semibold text-gray-900">1) 새 DRAFT 버전 생성</h2>
          <Select
            value={resolvedNewBundleProductId}
            onChange={(event) => setNewBundleProductId(event.target.value)}
            options={bundleProductOptions}
            placeholder={productsLoading ? '번들 상품 불러오는 중' : '번들 대표 상품을 선택하세요'}
          />
          {!productsLoading && bundleProductOptions.length === 0 && (
            <p className="text-xs text-amber-700">
              선택 가능한 BUNDLE 상품이 없습니다. 먼저 상품 관리에서 BUNDLE 상품을 생성해 주세요.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={newMode}
              onChange={(event) => setNewMode(event.target.value as 'FIXED' | 'CUSTOMIZABLE')}
              options={[
                { value: 'FIXED', label: 'FIXED' },
                { value: 'CUSTOMIZABLE', label: 'CUSTOMIZABLE' },
              ]}
            />
            <Select
              value={newPricingStrategy}
              onChange={(event) =>
                setNewPricingStrategy(event.target.value as 'WEIGHTED' | 'FIXED_AMOUNT')
              }
              options={[
                { value: 'WEIGHTED', label: 'WEIGHTED' },
                { value: 'FIXED_AMOUNT', label: 'FIXED_AMOUNT' },
              ]}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            loading={createDefinition.isPending}
            disabled={!resolvedNewBundleProductId}
          >
            DRAFT 생성
          </Button>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">2) 선택 버전 액션</h2>
          <p className="text-sm text-gray-500">현재 선택: {selectedDefinitionLabel}</p>
          {selectedDefinition && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge intent={resolveStatusBadgeIntent(selectedDefinition.status)} size="md">
                {selectedDefinition.status}
              </Badge>
              <span className="text-xs text-gray-500">
                mode={selectedDefinition.mode} / pricing={selectedDefinition.pricing_strategy}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              intent="primary"
              onClick={handlePublishDefinition}
              loading={publishDefinition.isPending}
              disabled={!activeDefinitionId}
            >
              ACTIVE Publish
            </Button>
            <Button
              size="sm"
              intent="secondary"
              onClick={handleCloneDefinition}
              loading={cloneDefinition.isPending}
              disabled={!activeDefinitionId}
            >
              DRAFT 복제
            </Button>
            <Button
              size="sm"
              intent="danger"
              onClick={handleArchiveDefinition}
              loading={archiveDefinition.isPending}
              disabled={!activeDefinitionId}
            >
              버전 보관
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-lg border border-gray-200 bg-white p-4 xl:col-span-4">
          <h2 className="text-base font-semibold text-gray-900">3) 버전 목록</h2>
          <p className="mt-1 text-xs text-gray-500">
            기본 선택은 DRAFT 우선입니다. 필요하면 ACTIVE/ARCHIVED 버전을 직접 선택해 수정 이력을 확인하세요.
          </p>
          <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
            {(definitions || []).map((definition) => {
              const isSelected = activeDefinitionId === definition.id;
              const bundleProductLabel =
                productTitleById.get(definition.bundle_product_id) ||
                definition.bundle_product_id;
              return (
                <button
                  key={definition.id}
                  type="button"
                  onClick={() => setSelectedDefinitionId(definition.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">v{definition.version_no}</p>
                    <Badge intent={resolveStatusBadgeIntent(definition.status)}>
                      {definition.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{bundleProductLabel}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{definition.bundle_product_id}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {definition.mode} / {definition.pricing_strategy}
                  </p>
                </button>
              );
            })}
            {(definitions || []).length === 0 && (
              <p className="text-sm text-gray-500">등록된 bundle definition이 없습니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 xl:col-span-8 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">4) 구성품 편집</h2>
          <p className="text-xs text-gray-500">
            상품 관리 탭에서 생성된 기본 구성을 여기서 버전별로 세밀하게 조정합니다.
          </p>
          {componentsLoading && (
            <div className="py-8 flex justify-center">
              <Loading size="md" text="component를 조회하는 중입니다" />
            </div>
          )}
          {!componentsLoading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Variant
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Fulfillment
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Weight
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(components || []).map((component) => (
                    <tr key={component.id}>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        <p className="font-medium">{component.variant?.sku || component.component_variant_id}</p>
                        <p className="text-xs text-gray-500">{component.variant?.title || '-'}</p>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {component.min_quantity} / {component.default_quantity} / {component.max_quantity}
                        <p className="text-xs text-gray-500">
                          {component.is_required ? 'required' : 'optional'}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {component.variant?.fulfillment_type || '-'}
                        <p className="text-xs text-gray-500">
                          shipping={String(component.variant?.requires_shipping ?? false)}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {component.price_allocation_weight}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            intent="secondary"
                            onClick={() => setSelectedComponentId(component.id)}
                          >
                            편집
                          </Button>
                        <Button
                          size="sm"
                          intent="danger"
                          onClick={() => handleDeleteComponent(component.id)}
                          loading={
                            deleteComponent.isPending &&
                            deleteComponent.variables === component.id
                          }
                        >
                          삭제
                        </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(components || []).length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-sm text-gray-500" colSpan={5}>
                        component가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <form
            className="grid grid-cols-1 gap-2 md:grid-cols-12"
            onSubmit={handleCreateComponent}
          >
            <Select
              className="md:col-span-4"
              value={resolvedNewComponentProductId}
              onChange={(event) => setNewComponentProductId(event.target.value)}
              options={componentProductOptions}
              placeholder={productsLoading ? '상품 불러오는 중' : '구성 상품 선택'}
            />
            <Select
              className="md:col-span-8"
              value={resolvedNewComponentVariantId}
              onChange={(event) => setNewComponentVariantId(event.target.value)}
              options={componentVariantOptions}
              placeholder={
                selectableVariantsLoading
                  ? '옵션 불러오는 중'
                  : '포함할 옵션(variant) 선택'
              }
              disabled={!resolvedNewComponentProductId || selectableVariantsLoading}
            />
            <Input
              className="md:col-span-2"
              value={newMinQuantity}
              onChange={(event) => setNewMinQuantity(event.target.value)}
              placeholder="min"
              type="number"
              min={0}
            />
            <Input
              className="md:col-span-2"
              value={newDefaultQuantity}
              onChange={(event) => setNewDefaultQuantity(event.target.value)}
              placeholder="default"
              type="number"
              min={0}
            />
            <Input
              className="md:col-span-2"
              value={newMaxQuantity}
              onChange={(event) => setNewMaxQuantity(event.target.value)}
              placeholder="max"
              type="number"
              min={1}
            />
            <Input
              className="md:col-span-2"
              value={newAllocationWeight}
              onChange={(event) => setNewAllocationWeight(event.target.value)}
              placeholder="weight"
              type="number"
              step="0.1"
              min={0}
            />
            <label className="md:col-span-3 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={newComponentRequired}
                onChange={(event) => setNewComponentRequired(event.target.checked)}
              />
              required component
            </label>
            <div className="md:col-span-3">
              <Button
                size="sm"
                type="submit"
                loading={createComponent.isPending}
                disabled={!activeDefinitionId || !resolvedNewComponentVariantId}
              >
                Component 추가
              </Button>
            </div>
            {!selectableVariantsLoading &&
              resolvedNewComponentProductId &&
              componentVariantOptions.length === 0 && (
                <p className="md:col-span-12 text-xs text-amber-700">
                  선택한 상품에 등록된 옵션이 없습니다. 먼저 상품 상세에서 옵션을 추가해 주세요.
                </p>
              )}
          </form>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">선택 Component 편집</h3>
            {!selectedComponent && (
              <p className="text-sm text-gray-500">편집할 component를 선택해주세요.</p>
            )}
            {selectedComponent && (
              <>
                <p className="text-xs text-gray-500">
                  component_id: {selectedComponent.id}
                </p>
                <form
                  key={`component-edit-${selectedComponent.id}`}
                  className="grid grid-cols-1 gap-2 md:grid-cols-6"
                  onSubmit={handleUpdateComponent}
                >
                  <Input
                    className="md:col-span-2"
                    name="component_variant_id"
                    defaultValue={selectedComponent.component_variant_id}
                    placeholder="component_variant_id"
                  />
                  <Input
                    name="min_quantity"
                    type="number"
                    min={0}
                    defaultValue={selectedComponent.min_quantity}
                    placeholder="min"
                  />
                  <Input
                    name="default_quantity"
                    type="number"
                    min={0}
                    defaultValue={selectedComponent.default_quantity}
                    placeholder="default"
                  />
                  <Input
                    name="max_quantity"
                    type="number"
                    min={1}
                    defaultValue={selectedComponent.max_quantity}
                    placeholder="max"
                  />
                  <Input
                    name="sort_order"
                    type="number"
                    min={0}
                    defaultValue={selectedComponent.sort_order}
                    placeholder="sort"
                  />
                  <Input
                    name="price_allocation_weight"
                    type="number"
                    min={0}
                    step="0.1"
                    defaultValue={selectedComponent.price_allocation_weight}
                    placeholder="weight"
                  />
                  <label className="md:col-span-2 flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      name="is_required"
                      defaultChecked={selectedComponent.is_required}
                    />
                    required component
                  </label>
                  <div className="md:col-span-4">
                    <Button
                      size="sm"
                      type="submit"
                      loading={updateComponent.isPending}
                    >
                      Component 수정
                    </Button>
                  </div>
                </form>

                <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Option 편집</p>
                  {(selectedComponent.options || []).length === 0 && (
                    <p className="text-sm text-gray-500">등록된 option이 없습니다.</p>
                  )}
                  {(selectedComponent.options || []).map((option) => (
                    <form
                      key={option.id}
                      className="grid grid-cols-1 gap-2 md:grid-cols-8"
                      onSubmit={(event) => handleUpdateOption(option.id, event)}
                    >
                      <Input
                        className="md:col-span-3"
                        name="option_key"
                        defaultValue={option.option_key}
                        placeholder="option_key"
                      />
                      <Input
                        className="md:col-span-3"
                        name="option_value"
                        defaultValue={option.option_value}
                        placeholder="option_value"
                      />
                      <Input
                        name="sort_order"
                        type="number"
                        min={0}
                        defaultValue={option.sort_order}
                        placeholder="sort"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          type="submit"
                          intent="secondary"
                          loading={
                            updateComponentOption.isPending &&
                            updateComponentOption.variables?.optionId === option.id
                          }
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          intent="danger"
                          loading={
                            deleteComponentOption.isPending &&
                            deleteComponentOption.variables === option.id
                          }
                          onClick={() => handleDeleteOption(option.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </form>
                  ))}

                  <form className="grid grid-cols-1 gap-2 md:grid-cols-8" onSubmit={handleCreateOption}>
                    <Input
                      className="md:col-span-3"
                      name="option_key"
                      placeholder="새 option_key"
                    />
                    <Input
                      className="md:col-span-3"
                      name="option_value"
                      placeholder="새 option_value"
                    />
                    <Input
                      name="sort_order"
                      type="number"
                      min={0}
                      defaultValue={0}
                      placeholder="sort"
                    />
                    <div>
                      <Button
                        size="sm"
                        type="submit"
                        loading={createComponentOption.isPending}
                        disabled={!activeComponentId}
                      >
                        Option 추가
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <details className="rounded-lg border border-gray-200 bg-white p-4" open={false}>
        <summary className="cursor-pointer text-base font-semibold text-gray-900">
          5) 고급 검증 도구 (Validate / Preview / Resolve)
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-gray-500">
            selected_components 예시:{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">
              [{`{"component_variant_id":"uuid","quantity":1}`}]
            </code>
          </p>
          <Textarea
            value={selectionJson}
            onChange={(event) => setSelectionJson(event.target.value)}
            placeholder='[{"component_variant_id":"...","quantity":1}]'
            rows={4}
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Input
              value={parentQuantity}
              onChange={(event) => setParentQuantity(event.target.value)}
              type="number"
              min={1}
              placeholder="parent_quantity"
            />
            <Input
              value={parentUnitAmount}
              onChange={(event) => setParentUnitAmount(event.target.value)}
              type="number"
              min={0}
              placeholder="parent_unit_amount (resolve only)"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                intent="secondary"
                onClick={runValidation}
                loading={validateBundle.isPending}
              >
                Validate
              </Button>
              <Button
                size="sm"
                intent="secondary"
                onClick={runPreview}
                loading={previewBundle.isPending}
              >
                Preview
              </Button>
              <Button size="sm" intent="primary" onClick={runResolve} loading={resolveBundle.isPending}>
                Resolve
              </Button>
              <Button
                size="sm"
                intent="primary"
                onClick={runOpsContract}
                loading={buildOpsContract.isPending}
              >
                Ops Contract
              </Button>
              <Button
                size="sm"
                intent="primary"
                onClick={runCanaryReport}
                loading={buildCanaryReport.isPending}
              >
                Canary Report
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-700">Validation Result</p>
              <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-700">
                {validationResult ? JSON.stringify(validationResult, null, 2) : '-'}
              </pre>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-700">Preview Result</p>
              <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-700">
                {previewResult ? JSON.stringify(previewResult, null, 2) : '-'}
              </pre>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-700">Resolve Result</p>
              <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-700">
                {resolveResult ? JSON.stringify(resolveResult, null, 2) : '-'}
              </pre>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-700">Ops Contract Result</p>
              <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-700">
                {opsContractResult ? JSON.stringify(opsContractResult, null, 2) : '-'}
              </pre>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-700">Canary Report Result</p>
              <pre className="mt-2 max-h-64 overflow-auto text-xs text-gray-700">
                {canaryReportResult ? JSON.stringify(canaryReportResult, null, 2) : '-'}
              </pre>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
