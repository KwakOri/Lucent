'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  adminInputClass,
  adminSelectClass,
} from '@/src/components/admin/AdminDesignSystem';
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

const pickerSectionClassName =
  'rounded-[22px] border border-[#e7e3d3] bg-white p-5 shadow-none sm:p-6';

function getChoiceButtonClass(active: boolean): string {
  return `rounded-[14px] border px-4 py-3 text-left text-sm font-bold transition ${
    active
      ? 'border-[#1a1a2e] bg-[#f5f3e8] text-[#1a1a2e]'
      : 'border-[#e7e3d3] bg-white text-[#1a1a2e] hover:border-[#d8d1bd] hover:bg-[#faf9f3]'
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
  lockTargetType?: boolean;
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
  lockTargetType = false,
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
    if (lockTargetType) {
      return;
    }
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
    <section className={pickerSectionClassName}>
      <div>
        <h2 className="text-lg font-black text-[#1a1a2e]">{title}</h2>
        <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">{description}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          disabled={lockTargetType}
          className={getChoiceButtonClass(targetType === 'PROJECT')}
          onClick={() => handleTargetTypeChange('PROJECT')}
        >
          <p>프로젝트</p>
          <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">프로젝트 전체를 묶어서 운영</p>
        </button>
        <button
          type="button"
          disabled={lockTargetType}
          className={getChoiceButtonClass(targetType === 'PRODUCT')}
          onClick={() => handleTargetTypeChange('PRODUCT')}
        >
          <p>상품</p>
          <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">특정 상품만 골라 운영</p>
        </button>
        {allowAdvanced && (
          <button
            type="button"
            disabled={lockTargetType}
            className={getChoiceButtonClass(targetType === 'VARIANT')}
            onClick={() => handleTargetTypeChange('VARIANT')}
          >
            <p>고급: 옵션</p>
            <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">특정 옵션만 세밀하게 지정</p>
          </button>
        )}
        {allowAdvanced && (
          <button
            type="button"
            disabled={lockTargetType}
            className={getChoiceButtonClass(targetType === 'BUNDLE_DEFINITION')}
            onClick={() => handleTargetTypeChange('BUNDLE_DEFINITION')}
          >
            <p>고급: 번들 구성</p>
            <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">번들 버전 기준으로 지정</p>
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {targetType === 'VARIANT' && (
          <div>
            <label className="mb-2 block text-sm font-black text-[#1a1a2e]">먼저 상품 선택</label>
            <select
              value={variantProductId}
              onChange={(event) => {
                onVariantProductIdChange(event.target.value);
                onChange([]);
              }}
              className={adminSelectClass}
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
          className={adminInputClass}
        />

        {value.length > 0 && (
          <div className="rounded-[16px] border border-[#eee7d6] bg-[#faf9f3] p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#1a1a2e]/40">선택된 대상</p>
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
                  className="inline-flex items-center gap-2 rounded-full border border-[#e7e3d3] bg-white px-3 py-1 text-sm font-bold text-[#1a1a2e]"
                >
                  <span>{selection.label}</span>
                  <span className="text-[#a35200]">제거</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-[16px] border border-[#e7e3d3] bg-white">
          <div className="flex items-center justify-between border-b border-[#eee7d6] bg-[#faf9f3] px-4 py-3">
            <p className="text-sm font-black text-[#1a1a2e]">선택 후보</p>
            <Badge intent="info" size="sm">
              {filteredOptions.length}개 표시
            </Badge>
          </div>

          {targetType === 'VARIANT' && !variantProductId ? (
            <div className="px-4 py-8 text-sm font-medium text-[#1a1a2e]/55">상품을 먼저 선택하면 해당 상품의 옵션을 고를 수 있습니다.</div>
          ) : targetType === 'VARIANT' && variantOptionsLoading ? (
            <div className="px-4 py-8 text-sm font-medium text-[#1a1a2e]/55">옵션 목록을 불러오는 중입니다.</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-8 text-sm font-medium text-[#1a1a2e]/55">조건에 맞는 대상이 없습니다.</div>
          ) : (
            <div className="max-h-80 divide-y divide-[#eee7d6] overflow-y-auto">
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
                      isSelected ? 'bg-[#f5f3e8]' : 'hover:bg-[#faf9f3]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#1a1a2e]">{option.label}</p>
                      <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">{option.helper}</p>
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
