'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import type {
  V2BundleDefinition,
  V2Campaign,
  V2CampaignTargetType,
  V2CampaignType,
  V2Product,
  V2Project,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2Campaign,
  useCreateV2CampaignTarget,
  useUpdateV2Campaign,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  buildCampaignCode,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_TYPES,
  formatChannelScopeInput,
  getCampaignScheduleOverlapWarnings,
  getErrorMessage,
  parseChannelScopeInput,
  parseDateTimeLocalInput,
  toDateTimeLocalValue,
  type CampaignTargetSelection,
} from '@/lib/client/utils/v2-campaign-admin';
import { CampaignTargetPicker } from './CampaignTargetPicker';

const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

function getChoiceButtonClass(active: boolean): string {
  return `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
    active
      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
  }`;
}

type CampaignFormProps = {
  mode: 'create' | 'edit';
  campaign?: V2Campaign | null;
  campaigns: V2Campaign[];
  projects: V2Project[];
  products: V2Product[];
  bundleDefinitions: V2BundleDefinition[];
  initialCampaignType?: V2CampaignType;
  initialTargets?: CampaignTargetSelection[];
  initialTargetType?: V2CampaignTargetType;
  targetPickerMode?: 'single' | 'multiple';
  lockCampaignType?: boolean;
  lockTargetType?: boolean;
  allowAdvancedTargets?: boolean;
  onCancel: () => void;
  onSuccess: (campaignId: string) => void | Promise<void>;
};

export function CampaignForm({
  mode,
  campaign,
  campaigns,
  projects,
  products,
  bundleDefinitions,
  initialCampaignType,
  initialTargets = [],
  initialTargetType = 'PROJECT',
  targetPickerMode = 'multiple',
  lockCampaignType = false,
  lockTargetType = false,
  allowAdvancedTargets = true,
  onCancel,
  onSuccess,
}: CampaignFormProps) {
  const createCampaign = useCreateV2Campaign();
  const updateCampaign = useUpdateV2Campaign();
  const createTarget = useCreateV2CampaignTarget();

  const [name, setName] = useState(campaign?.name || '');
  const [campaignType, setCampaignType] = useState<V2CampaignType>(
    campaign?.campaign_type || initialCampaignType || 'SALE',
  );
  const [description, setDescription] = useState(campaign?.description || '');
  const [startsAtInput, setStartsAtInput] = useState(
    campaign?.starts_at ? toDateTimeLocalValue(campaign.starts_at) : toDateTimeLocalValue(new Date().toISOString()),
  );
  const [hasEndDate, setHasEndDate] = useState(Boolean(campaign?.ends_at));
  const [endsAtInput, setEndsAtInput] = useState(
    campaign?.ends_at ? toDateTimeLocalValue(campaign.ends_at) : '',
  );
  const [channelScopeInput, setChannelScopeInput] = useState(
    formatChannelScopeInput(campaign?.channel_scope_json),
  );
  const [selectedTargets, setSelectedTargets] = useState<CampaignTargetSelection[]>(initialTargets);
  const [variantProductId, setVariantProductId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: variantOptions = [], isLoading: variantOptionsLoading } = useV2AdminVariants(
    variantProductId || null,
  );

  const campaignCodePreview = useMemo(() => buildCampaignCode(name), [name]);
  const overlapWarnings = useMemo(() => {
    return getCampaignScheduleOverlapWarnings({
      campaigns,
      startsAt: startsAtInput ? parseDateTimeLocalInput(startsAtInput, '시작 시점') : null,
      endsAt: hasEndDate && endsAtInput ? parseDateTimeLocalInput(endsAtInput, '종료 시점') : null,
      currentCampaignId: campaign?.id,
    });
  }, [campaign?.id, campaigns, endsAtInput, hasEndDate, startsAtInput]);

  const isSubmitting =
    createCampaign.isPending || updateCampaign.isPending || createTarget.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('캠페인 이름을 입력해 주세요.');
      }
      if (!startsAtInput.trim()) {
        throw new Error('시작 시점을 선택해 주세요.');
      }
      if (mode === 'create' && selectedTargets.length === 0) {
        throw new Error('적용할 프로젝트나 상품을 하나 이상 선택해 주세요.');
      }
      if (mode === 'create' && campaignType === 'ALWAYS_ON') {
        const projectTargets = selectedTargets.filter((target) => target.targetType === 'PROJECT');
        if (projectTargets.length !== 1 || selectedTargets.length !== 1) {
          throw new Error('상시 운영 캠페인은 프로젝트 1개만 대상으로 선택해 주세요.');
        }
      }

      const startsAt = parseDateTimeLocalInput(startsAtInput, '시작 시점');
      const endsAt = hasEndDate ? parseDateTimeLocalInput(endsAtInput, '종료 시점') : null;

      if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
        throw new Error('종료 시점은 시작 시점보다 늦어야 합니다.');
      }

      if (mode === 'create') {
        const created = await createCampaign.mutateAsync({
          code: campaignCodePreview,
          name: trimmedName,
          description: description.trim() || null,
          campaign_type: campaignType,
          status: 'DRAFT',
          starts_at: startsAt,
          ends_at: endsAt,
          channel_scope_json: parseChannelScopeInput(channelScopeInput),
        });

        for (const target of selectedTargets) {
          await createTarget.mutateAsync({
            campaignId: created.data.id,
            data: {
              target_type: target.targetType,
              target_id: target.targetId,
              is_excluded: false,
            },
          });
        }

        await onSuccess(created.data.id);
        return;
      }

      if (!campaign) {
        throw new Error('수정할 캠페인 정보를 찾을 수 없습니다.');
      }

      await updateCampaign.mutateAsync({
        id: campaign.id,
        data: {
          name: trimmedName,
          description: description.trim() || null,
          campaign_type: campaignType,
          starts_at: startsAt,
          ends_at: endsAt,
          channel_scope_json: parseChannelScopeInput(channelScopeInput),
        },
      });

      await onSuccess(campaign.id);
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">1. 캠페인 기본 정보</h2>
            <p className="mt-1 text-sm text-gray-500">운영자가 이해하기 쉬운 이름과 목적부터 정합니다.</p>
          </div>
          {mode === 'edit' && campaign && <Badge intent="default">코드 {campaign.code}</Badge>}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">캠페인 이름</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 4월 봄 드롭" required />
            <p className="mt-2 text-xs text-gray-500">자동 생성 코드: {campaignCodePreview || 'campaign-code'}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">캠페인 유형</label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {CAMPAIGN_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={lockCampaignType}
                  className={getChoiceButtonClass(campaignType === type)}
                  onClick={() => setCampaignType(type)}
                >
                  <p>{CAMPAIGN_TYPE_LABELS[type]}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">설명</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="관리 메모나 운영 목적을 적어두면 나중에 다시 봐도 이해하기 쉽습니다."
              rows={4}
            />
          </div>
        </div>
      </section>

      {mode === 'create' && (
        <CampaignTargetPicker
          mode={targetPickerMode}
          value={selectedTargets}
          onChange={setSelectedTargets}
          projects={projects}
          products={products}
          bundleDefinitions={bundleDefinitions}
          variantOptions={variantOptions}
          variantOptionsLoading={variantOptionsLoading}
          variantProductId={variantProductId}
          onVariantProductIdChange={setVariantProductId}
          defaultTargetType={initialTargetType}
          allowAdvanced={allowAdvancedTargets}
          lockTargetType={lockTargetType}
          title="2. 적용 대상"
          description="프로젝트 전체나 특정 상품처럼 이해하기 쉬운 범위부터 고르세요. 고급 대상도 필요할 때만 펼쳐서 선택할 수 있습니다."
        />
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{mode === 'create' ? '3. 기간 설정' : '2. 기간 설정'}</h2>
          <p className="mt-1 text-sm text-gray-500">판매 기간을 구성하고 겹칠 수 있는 일정은 미리 경고합니다.</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">시작 시점</label>
            <Input type="datetime-local" value={startsAtInput} onChange={(event) => setStartsAtInput(event.target.value)} required />
            <p className="mt-2 text-xs text-gray-500">관리자 화면 기준 타임존으로 예약됩니다.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">종료 시점</label>
              <button
                type="button"
                className="text-xs font-medium text-primary-700"
                onClick={() => {
                  setHasEndDate((current) => !current);
                  if (hasEndDate) {
                    setEndsAtInput('');
                  }
                }}
              >
                {hasEndDate ? '종료 없음으로 변경' : '종료 시점 추가'}
              </button>
            </div>
            {hasEndDate ? (
              <Input type="datetime-local" value={endsAtInput} onChange={(event) => setEndsAtInput(event.target.value)} />
            ) : (
              <div className="flex h-11 items-center rounded-lg border border-dashed border-gray-200 px-4 text-sm text-gray-500">
                종료 시점 없이 계속 운영합니다.
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <details className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-gray-700">고급 설정: 채널 범위</summary>
              <div className="mt-3">
                <Input
                  value={channelScopeInput}
                  onChange={(event) => setChannelScopeInput(event.target.value)}
                  placeholder="예: WEB, APP"
                />
                <p className="mt-2 text-xs text-gray-500">비워두면 전체 채널에 적용됩니다.</p>
              </div>
            </details>
          </div>
        </div>

        {overlapWarnings.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">겹칠 수 있는 일정이 있습니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {overlapWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {mode === 'edit' && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">적용 대상 관리</h2>
          <p className="mt-1 text-sm text-gray-500">
            대상 추가/수정은 상세 페이지에서 별도로 관리합니다. 이 화면은 캠페인 개요와 일정 수정에 집중합니다.
          </p>
        </section>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button intent="neutral" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {mode === 'create' ? '캠페인 저장' : '캠페인 정보 저장'}
        </Button>
      </div>
    </form>
  );
}
