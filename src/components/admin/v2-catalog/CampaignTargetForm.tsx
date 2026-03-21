'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  V2BundleDefinition,
  V2Campaign,
  V2CampaignTarget,
  V2Product,
  V2Project,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2CampaignTarget,
  useUpdateV2CampaignTarget,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  createSelectionFromTarget,
  getErrorMessage,
  type CampaignTargetSelection,
} from '@/lib/client/utils/v2-campaign-admin';
import { CampaignTargetPicker } from './CampaignTargetPicker';

type CampaignTargetFormProps = {
  mode: 'create' | 'edit';
  campaign: V2Campaign;
  target?: V2CampaignTarget | null;
  projects: V2Project[];
  products: V2Product[];
  bundleDefinitions: V2BundleDefinition[];
  onCancel: () => void;
  onSuccess: () => void | Promise<void>;
};

export function CampaignTargetForm({
  mode,
  campaign,
  target,
  projects,
  products,
  bundleDefinitions,
  onCancel,
  onSuccess,
}: CampaignTargetFormProps) {
  const createTarget = useCreateV2CampaignTarget();
  const updateTarget = useUpdateV2CampaignTarget();

  const initialSelection = useMemo<CampaignTargetSelection[]>(() => {
    if (!target) {
      return [];
    }
    return [
      createSelectionFromTarget(target, {
        projects,
        products,
        bundleDefinitions,
      }),
    ];
  }, [bundleDefinitions, products, projects, target]);

  const [selectedTargets, setSelectedTargets] = useState<CampaignTargetSelection[]>(initialSelection);
  const [isExcluded, setIsExcluded] = useState(target?.is_excluded || false);
  const [variantProductId, setVariantProductId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: variantOptions = [], isLoading: variantOptionsLoading } = useV2AdminVariants(
    variantProductId || null,
  );

  const isSubmitting = createTarget.isPending || updateTarget.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      const selectedTarget = selectedTargets[0];
      if (!selectedTarget) {
        throw new Error('대상을 선택해 주세요.');
      }

      if (mode === 'create') {
        await createTarget.mutateAsync({
          campaignId: campaign.id,
          data: {
            target_type: selectedTarget.targetType,
            target_id: selectedTarget.targetId,
            is_excluded: isExcluded,
          },
        });
      } else {
        if (!target) {
          throw new Error('수정할 타겟 정보를 찾을 수 없습니다.');
        }
        await updateTarget.mutateAsync({
          targetId: target.id,
          data: {
            target_type: selectedTarget.targetType,
            target_id: selectedTarget.targetId,
            is_excluded: isExcluded,
          },
        });
      }

      await onSuccess();
    } catch (submitError) {
      setErrorMessage(getErrorMessage(submitError));
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <CampaignTargetPicker
        mode="single"
        value={selectedTargets}
        onChange={setSelectedTargets}
        projects={projects}
        products={products}
        bundleDefinitions={bundleDefinitions}
        variantOptions={variantOptions}
        variantOptionsLoading={variantOptionsLoading}
        variantProductId={variantProductId}
        onVariantProductIdChange={setVariantProductId}
        title="대상 선택"
        description="프로젝트, 상품, 옵션, 번들 구성 중 필요한 범위를 골라 캠페인에 연결합니다."
        defaultTargetType={target?.target_type || 'PROJECT'}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">적용 방식</h2>
        <p className="mt-1 text-sm text-gray-500">보통은 포함 대상으로 추가하고, 예외만 제외 대상으로 둡니다.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              !isExcluded
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
            onClick={() => setIsExcluded(false)}
          >
            포함 대상
          </button>
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              isExcluded
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
            onClick={() => setIsExcluded(true)}
          >
            제외 대상
          </button>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button intent="neutral" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? '대상 저장' : '대상 수정 저장'}
        </Button>
      </div>
    </form>
  );
}
