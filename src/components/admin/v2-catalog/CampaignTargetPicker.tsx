'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  V2BundleDefinition,
  V2CampaignTargetType,
  V2Product,
  V2Project,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  CAMPAIGN_TARGET_TYPE_LABELS,
  type CampaignTargetSelection,
} from '@/lib/client/utils/v2-campaign-admin';

const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

function getChoiceButtonClass(active: boolean): string {
  return `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
    active
      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
  }`;
}

type CampaignTargetPickerProps = {
  mode: 'single' | 'multiple';
  value: CampaignTargetSelection[];
  onChange: (nextValue: CampaignTargetSelection[]) => void;
  projects: V2Project[];
  products: V2Product[];
  bundleDefinitions: V2BundleDefinition[];
  variantOptions: V2Variant[];
  variantOptionsLoading?: boolean;
  variantProductId: string;
  onVariantProductIdChange: (productId: string) => void;
  title?: string;
  description?: string;
  defaultTargetType?: V2CampaignTargetType;
  allowAdvanced?: boolean;
};

export function CampaignTargetPicker({
  mode,
  value,
  onChange,
  projects,
  products,
  bundleDefinitions,
  variantOptions,
  variantOptionsLoading = false,
  variantProductId,
  onVariantProductIdChange,
  title = '적용 대상',
  description = '프로젝트나 상품처럼 관리자가 이해하기 쉬운 범위부터 선택합니다.',
  defaultTargetType = 'PROJECT',
  allowAdvanced = true,
}: CampaignTargetPickerProps) {
  const [targetType, setTargetType] = useState<V2CampaignTargetType>(defaultTargetType);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTargetType(defaultTargetType);
  }, [defaultTargetType]);

  const productNameMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product.title]));
  }, [products]);

  const bundleOptions = useMemo(() => {
    return bundleDefinitions.map((definition) => ({
      id: definition.id,
      label: `${productNameMap.get(definition.bundle_product_id) || definition.bundle_product_id} / v${definition.version_no}`,
      helper: definition.status,
      targetType: 'BUNDLE_DEFINITION' as const,
    }));
  }, [bundleDefinitions, productNameMap]);

  const candidateOptions = useMemo(() => {
    if (targetType === 'PROJECT') {
      return projects.map((project) => ({
        id: project.id,
        label: project.name,
        helper: project.slug,
        targetType: 'PROJECT' as const,
      }));
    }

    if (targetType === 'PRODUCT') {
      return products.map((product) => ({
        id: product.id,
        label: product.title,
        helper: product.product_kind,
        targetType: 'PRODUCT' as const,
      }));
    }

    if (targetType === 'VARIANT') {
      return variantOptions.map((variant) => ({
        id: variant.id,
        label: variant.title,
        helper: variant.sku,
        targetType: 'VARIANT' as const,
      }));
    }

    return bundleOptions;
  }, [bundleOptions, products, projects, targetType, variantOptions]);

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return candidateOptions.slice(0, 12);
    }
    return candidateOptions
      .filter((option) => `${option.label} ${option.helper}`.toLowerCase().includes(keyword))
      .slice(0, 12);
  }, [candidateOptions, search]);

  const handleTargetTypeChange = (nextTargetType: V2CampaignTargetType) => {
    setTargetType(nextTargetType);
    setSearch('');
    onChange([]);
    if (nextTargetType !== 'VARIANT') {
      onVariantProductIdChange('');
    }
  };

  const toggleSelection = (selection: CampaignTargetSelection) => {
    const exists = value.some(
      (item) => item.targetType === selection.targetType && item.targetId === selection.targetId,
    );

    if (mode === 'single') {
      onChange(exists ? [] : [selection]);
      return;
    }

    if (exists) {
      onChange(
        value.filter(
          (item) => !(item.targetType === selection.targetType && item.targetId === selection.targetId),
        ),
      );
      return;
    }

    onChange([...value, selection]);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          className={getChoiceButtonClass(targetType === 'PROJECT')}
          onClick={() => handleTargetTypeChange('PROJECT')}
        >
          <p>프로젝트</p>
          <p className="mt-1 text-xs text-gray-500">프로젝트 전체를 묶어서 운영</p>
        </button>
        <button
          type="button"
          className={getChoiceButtonClass(targetType === 'PRODUCT')}
          onClick={() => handleTargetTypeChange('PRODUCT')}
        >
          <p>상품</p>
          <p className="mt-1 text-xs text-gray-500">특정 상품만 골라 운영</p>
        </button>
        {allowAdvanced && (
          <button
            type="button"
            className={getChoiceButtonClass(targetType === 'VARIANT')}
            onClick={() => handleTargetTypeChange('VARIANT')}
          >
            <p>고급: 옵션</p>
            <p className="mt-1 text-xs text-gray-500">특정 옵션만 세밀하게 지정</p>
          </button>
        )}
        {allowAdvanced && (
          <button
            type="button"
            className={getChoiceButtonClass(targetType === 'BUNDLE_DEFINITION')}
            onClick={() => handleTargetTypeChange('BUNDLE_DEFINITION')}
          >
            <p>고급: 번들 구성</p>
            <p className="mt-1 text-xs text-gray-500">번들 버전 기준으로 지정</p>
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {targetType === 'VARIANT' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">먼저 상품 선택</label>
            <select
              value={variantProductId}
              onChange={(event) => {
                onVariantProductIdChange(event.target.value);
                onChange([]);
              }}
              className={SELECT_CLASS}
            >
              <option value="">상품을 선택하세요</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`${CAMPAIGN_TARGET_TYPE_LABELS[targetType]} 검색`}
        />

        {value.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">선택된 대상</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {value.map((selection) => (
                <button
                  key={`${selection.targetType}-${selection.targetId}`}
                  type="button"
                  onClick={() =>
                    onChange(
                      value.filter(
                        (item) => !(item.targetType === selection.targetType && item.targetId === selection.targetId),
                      ),
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
                >
                  <span>{selection.label}</span>
                  <span className="text-gray-400">제거</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">선택 후보</p>
            <Badge intent="info" size="sm">
              {filteredOptions.length}개 표시
            </Badge>
          </div>

          {targetType === 'VARIANT' && !variantProductId ? (
            <div className="px-4 py-8 text-sm text-gray-500">상품을 먼저 선택하면 해당 상품의 옵션을 고를 수 있습니다.</div>
          ) : targetType === 'VARIANT' && variantOptionsLoading ? (
            <div className="px-4 py-8 text-sm text-gray-500">옵션 목록을 불러오는 중입니다.</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-500">조건에 맞는 대상이 없습니다.</div>
          ) : (
            <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
              {filteredOptions.map((option) => {
                const isSelected = value.some(
                  (item) => item.targetType === option.targetType && item.targetId === option.id,
                );
                return (
                  <button
                    key={`${option.targetType}-${option.id}`}
                    type="button"
                    onClick={() =>
                      toggleSelection({
                        targetType: option.targetType,
                        targetId: option.id,
                        label: option.label,
                      })
                    }
                    className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition ${
                      isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="mt-1 text-xs text-gray-500">{option.helper}</p>
                    </div>
                    <Badge intent={isSelected ? 'success' : 'default'}>
                      {isSelected ? '선택됨' : '선택'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
