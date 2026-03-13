'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  useArchiveV2BundleDefinition,
  useCloneV2BundleDefinitionVersion,
  useCreateV2BundleComponent,
  useCreateV2BundleDefinition,
  useDeleteV2BundleComponent,
  usePreviewV2Bundle,
  usePublishV2BundleDefinition,
  useResolveV2Bundle,
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
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newBundleProductId, setNewBundleProductId] = useState('');
  const [newMode, setNewMode] = useState<'FIXED' | 'CUSTOMIZABLE'>('FIXED');
  const [newPricingStrategy, setNewPricingStrategy] = useState<'WEIGHTED' | 'FIXED_AMOUNT'>(
    'WEIGHTED',
  );

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

  const {
    data: definitions,
    isLoading: definitionsLoading,
    error: definitionsError,
  } = useV2BundleDefinitions();
  const activeDefinitionId = selectedDefinitionId ?? definitions?.[0]?.id ?? null;
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
  const deleteComponent = useDeleteV2BundleComponent();

  const validateBundle = useValidateV2BundleDefinition(activeDefinitionId);
  const previewBundle = usePreviewV2Bundle();
  const resolveBundle = useResolveV2Bundle();

  const selectedDefinitionLabel = useMemo(() => {
    if (!selectedDefinition) {
      return '-';
    }
    return `${selectedDefinition.bundle_product_id.slice(0, 8)}… v${selectedDefinition.version_no}`;
  }, [selectedDefinition]);

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
        bundle_product_id: newBundleProductId.trim(),
        mode: newMode,
        pricing_strategy: newPricingStrategy,
      });
      setSelectedDefinitionId(response.data.id);
      setMessage('bundle definition을 생성했습니다.');
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
          component_variant_id: newComponentVariantId.trim(),
          is_required: newComponentRequired,
          min_quantity: parseNonNegativeInteger(newMinQuantity, 'min_quantity'),
          max_quantity: parsePositiveInteger(newMaxQuantity, 'max_quantity'),
          default_quantity: parseNonNegativeInteger(
            newDefaultQuantity,
            'default_quantity',
          ),
          price_allocation_weight: Number(newAllocationWeight),
        },
      });
      setNewComponentVariantId('');
      setMessage('bundle component를 추가했습니다.');
    });
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!window.confirm('이 component를 삭제하시겠습니까?')) {
      return;
    }

    await runWithNotice(async () => {
      await deleteComponent.mutateAsync(componentId);
      setMessage('bundle component를 삭제했습니다.');
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
        <h1 className="text-2xl font-bold text-gray-900">V2 Bundle Builder</h1>
        <p className="mt-1 text-sm text-gray-500">
          definition/component를 관리하고 validate/preview/resolve를 운영자가 직접 실행합니다.
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <form
          className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
          onSubmit={handleCreateDefinition}
        >
          <h2 className="text-base font-semibold text-gray-900">새 Bundle Definition</h2>
          <Input
            value={newBundleProductId}
            onChange={(event) => setNewBundleProductId(event.target.value)}
            placeholder="bundle_product_id (UUID)"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={newMode}
              onChange={(event) => setNewMode(event.target.value as 'FIXED' | 'CUSTOMIZABLE')}
            >
              <option value="FIXED">FIXED</option>
              <option value="CUSTOMIZABLE">CUSTOMIZABLE</option>
            </select>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={newPricingStrategy}
              onChange={(event) =>
                setNewPricingStrategy(event.target.value as 'WEIGHTED' | 'FIXED_AMOUNT')
              }
            >
              <option value="WEIGHTED">WEIGHTED</option>
              <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
            </select>
          </div>
          <Button
            type="submit"
            size="sm"
            loading={createDefinition.isPending}
            disabled={!newBundleProductId.trim()}
          >
            Definition 생성
          </Button>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">선택된 Definition 액션</h2>
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
              Publish
            </Button>
            <Button
              size="sm"
              intent="secondary"
              onClick={handleCloneDefinition}
              loading={cloneDefinition.isPending}
              disabled={!activeDefinitionId}
            >
              Clone Version
            </Button>
            <Button
              size="sm"
              intent="danger"
              onClick={handleArchiveDefinition}
              loading={archiveDefinition.isPending}
              disabled={!activeDefinitionId}
            >
              Archive
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-lg border border-gray-200 bg-white p-4 xl:col-span-4">
          <h2 className="text-base font-semibold text-gray-900">Bundle Definitions</h2>
          <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
            {(definitions || []).map((definition) => {
              const isSelected = activeDefinitionId === definition.id;
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
                  <p className="mt-1 text-xs text-gray-500">{definition.bundle_product_id}</p>
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
          <h2 className="text-base font-semibold text-gray-900">Bundle Components</h2>
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

          <form className="grid grid-cols-1 gap-2 md:grid-cols-6" onSubmit={handleCreateComponent}>
            <Input
              className="md:col-span-2"
              value={newComponentVariantId}
              onChange={(event) => setNewComponentVariantId(event.target.value)}
              placeholder="component_variant_id"
            />
            <Input
              value={newMinQuantity}
              onChange={(event) => setNewMinQuantity(event.target.value)}
              placeholder="min"
              type="number"
              min={0}
            />
            <Input
              value={newDefaultQuantity}
              onChange={(event) => setNewDefaultQuantity(event.target.value)}
              placeholder="default"
              type="number"
              min={0}
            />
            <Input
              value={newMaxQuantity}
              onChange={(event) => setNewMaxQuantity(event.target.value)}
              placeholder="max"
              type="number"
              min={1}
            />
            <Input
              value={newAllocationWeight}
              onChange={(event) => setNewAllocationWeight(event.target.value)}
              placeholder="weight"
              type="number"
              step="0.1"
              min={0}
            />
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={newComponentRequired}
                onChange={(event) => setNewComponentRequired(event.target.checked)}
              />
              required component
            </label>
            <div className="md:col-span-4">
              <Button
                size="sm"
                type="submit"
                loading={createComponent.isPending}
                disabled={!activeDefinitionId || !newComponentVariantId.trim()}
              >
                Component 추가
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Validate / Preview / Resolve</h2>
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
            <Button size="sm" intent="secondary" onClick={runValidation} loading={validateBundle.isPending}>
              Validate
            </Button>
            <Button size="sm" intent="secondary" onClick={runPreview} loading={previewBundle.isPending}>
              Preview
            </Button>
            <Button size="sm" intent="primary" onClick={runResolve} loading={resolveBundle.isPending}>
              Resolve
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
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
        </div>
      </section>
    </div>
  );
}
