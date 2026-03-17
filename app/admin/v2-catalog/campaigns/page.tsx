'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2CampaignStatus,
  V2CampaignTargetType,
  V2CampaignType,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useActivateV2Campaign,
  useCloseV2Campaign,
  useCreateV2Campaign,
  useCreateV2CampaignTarget,
  useDeleteV2CampaignTarget,
  useSuspendV2Campaign,
  useUpdateV2Campaign,
  useUpdateV2CampaignTarget,
  useV2AdminProducts,
  useV2AdminProjects,
  useV2AdminVariants,
  useV2BundleDefinitions,
  useV2CampaignTargets,
  useV2Campaigns,
} from '@/lib/client/hooks/useV2CatalogAdmin';

type CampaignFilterStatus = 'ALL' | V2CampaignStatus;
type CampaignFilterType = 'ALL' | V2CampaignType;
type CampaignPeriodFilter = 'ALL' | 'LIVE' | 'UPCOMING' | 'ENDED' | 'NO_PERIOD';
type CampaignSortKey = 'UPDATED_DESC' | 'START_ASC' | 'END_ASC' | 'NAME_ASC';

const CAMPAIGN_TYPES: V2CampaignType[] = [
  'EVENT',
  'POPUP',
  'SALE',
  'DROP',
  'ALWAYS_ON',
];
const CAMPAIGN_STATUSES: V2CampaignStatus[] = [
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED',
  'ARCHIVED',
];
const TARGET_TYPES: V2CampaignTargetType[] = [
  'PROJECT',
  'PRODUCT',
  'VARIANT',
  'BUNDLE_DEFINITION',
];
const CAMPAIGN_PERIOD_REFERENCE_MS = Date.now();
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

function parseDateTimeLocalInput(value: string, fieldName: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} 형식이 올바르지 않습니다.`);
  }
  return parsed.toISOString();
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const offsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }
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

function parseChannelScopeInput(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function formatChannelScope(raw: unknown[] | undefined): string {
  if (!Array.isArray(raw)) {
    return '-';
  }
  const values = raw.filter((value): value is string => typeof value === 'string');
  if (values.length === 0) {
    return '-';
  }
  return values.join(', ');
}

function formatChannelScopeInput(raw: unknown[] | undefined): string {
  if (!Array.isArray(raw)) {
    return '';
  }
  return raw.filter((value): value is string => typeof value === 'string').join(', ');
}

function getCampaignPeriod(
  startsAt: string | null,
  endsAt: string | null,
  nowMs: number,
): Exclude<CampaignPeriodFilter, 'ALL'> {
  if (!startsAt && !endsAt) {
    return 'NO_PERIOD';
  }
  const startsMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  if (startsMs !== null && Number.isFinite(startsMs) && startsMs > nowMs) {
    return 'UPCOMING';
  }
  if (endsMs !== null && Number.isFinite(endsMs) && endsMs < nowMs) {
    return 'ENDED';
  }
  return 'LIVE';
}

function getCampaignStatusIntent(
  status: V2CampaignStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'SUSPENDED') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  if (status === 'CLOSED') {
    return 'info';
  }
  return 'default';
}

function getPeriodLabel(period: Exclude<CampaignPeriodFilter, 'ALL'>): string {
  if (period === 'LIVE') {
    return '진행중';
  }
  if (period === 'UPCOMING') {
    return '예정';
  }
  if (period === 'ENDED') {
    return '종료';
  }
  return '상시';
}

function getPeriodIntent(
  period: Exclude<CampaignPeriodFilter, 'ALL'>,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (period === 'LIVE') {
    return 'success';
  }
  if (period === 'UPCOMING') {
    return 'warning';
  }
  if (period === 'ENDED') {
    return 'info';
  }
  return 'default';
}

export default function V2CatalogCampaignsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignFilterStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<CampaignFilterType>('ALL');
  const [periodFilter, setPeriodFilter] = useState<CampaignPeriodFilter>('ALL');
  const [sortKey, setSortKey] = useState<CampaignSortKey>('UPDATED_DESC');

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<V2CampaignType>('EVENT');
  const [newStatus, setNewStatus] = useState<V2CampaignStatus>('DRAFT');
  const [newStartsAtInput, setNewStartsAtInput] = useState('');
  const [newEndsAtInput, setNewEndsAtInput] = useState('');
  const [newChannelScopeInput, setNewChannelScopeInput] = useState('');

  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingType, setEditingType] = useState<V2CampaignType>('EVENT');
  const [editingStatus, setEditingStatus] = useState<V2CampaignStatus>('DRAFT');
  const [editingStartsAtInput, setEditingStartsAtInput] = useState('');
  const [editingEndsAtInput, setEditingEndsAtInput] = useState('');
  const [editingChannelScopeInput, setEditingChannelScopeInput] = useState('');

  const [newTargetType, setNewTargetType] = useState<V2CampaignTargetType>('PROJECT');
  const [newTargetProjectId, setNewTargetProjectId] = useState('');
  const [newTargetProductId, setNewTargetProductId] = useState('');
  const [newTargetVariantProductId, setNewTargetVariantProductId] = useState('');
  const [newTargetVariantId, setNewTargetVariantId] = useState('');
  const [newTargetBundleDefinitionId, setNewTargetBundleDefinitionId] = useState('');
  const [newTargetSortOrder, setNewTargetSortOrder] = useState('0');
  const [newTargetExcluded, setNewTargetExcluded] = useState(false);

  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingTargetType, setEditingTargetType] =
    useState<V2CampaignTargetType>('PROJECT');
  const [editingTargetProjectId, setEditingTargetProjectId] = useState('');
  const [editingTargetProductId, setEditingTargetProductId] = useState('');
  const [editingTargetVariantProductId, setEditingTargetVariantProductId] =
    useState('');
  const [editingTargetVariantId, setEditingTargetVariantId] = useState('');
  const [editingTargetBundleDefinitionId, setEditingTargetBundleDefinitionId] =
    useState('');
  const [editingTargetSortOrder, setEditingTargetSortOrder] = useState('0');
  const [editingTargetExcluded, setEditingTargetExcluded] = useState(false);

  const {
    data: campaigns,
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useV2Campaigns();
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
  const { data: bundleDefinitions } = useV2BundleDefinitions();

  const {
    data: newVariantOptions,
    isLoading: newVariantOptionsLoading,
  } = useV2AdminVariants(
    newTargetType === 'VARIANT' ? newTargetVariantProductId : null,
  );
  const {
    data: editingVariantOptions,
    isLoading: editingVariantOptionsLoading,
  } = useV2AdminVariants(
    editingTargetType === 'VARIANT' ? editingTargetVariantProductId : null,
  );

  const activeCampaignId = useMemo(() => {
    if (selectedCampaignId && (campaigns || []).some((campaign) => campaign.id === selectedCampaignId)) {
      return selectedCampaignId;
    }
    return campaigns?.[0]?.id || null;
  }, [campaigns, selectedCampaignId]);

  const activeCampaign = useMemo(
    () => (campaigns || []).find((campaign) => campaign.id === activeCampaignId) || null,
    [campaigns, activeCampaignId],
  );

  const {
    data: campaignTargets,
    isLoading: targetsLoading,
    error: targetsError,
  } = useV2CampaignTargets(activeCampaignId);

  const createCampaign = useCreateV2Campaign();
  const updateCampaign = useUpdateV2Campaign();
  const activateCampaign = useActivateV2Campaign();
  const suspendCampaign = useSuspendV2Campaign();
  const closeCampaign = useCloseV2Campaign();

  const createTarget = useCreateV2CampaignTarget();
  const updateTarget = useUpdateV2CampaignTarget();
  const deleteTarget = useDeleteV2CampaignTarget();

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (projects || []).forEach((project) => map.set(project.id, project.name));
    return map;
  }, [projects]);

  const productNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (products || []).forEach((product) => map.set(product.id, product.title));
    return map;
  }, [products]);

  const bundleLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (bundleDefinitions || []).forEach((definition) => {
      const productLabel = productNameMap.get(definition.bundle_product_id) || definition.bundle_product_id;
      map.set(
        definition.id,
        `${productLabel} / v${definition.version_no} (${definition.status})`,
      );
    });
    return map;
  }, [bundleDefinitions, productNameMap]);

  const variantLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (newVariantOptions || []).forEach((variant) => {
      map.set(variant.id, `${variant.title} (${variant.sku})`);
    });
    (editingVariantOptions || []).forEach((variant) => {
      map.set(variant.id, `${variant.title} (${variant.sku})`);
    });
    return map;
  }, [newVariantOptions, editingVariantOptions]);

  const filteredCampaigns = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    const filtered = (campaigns || []).filter((campaign) => {
      if (statusFilter !== 'ALL' && campaign.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'ALL' && campaign.campaign_type !== typeFilter) {
        return false;
      }
      const period = getCampaignPeriod(
        campaign.starts_at,
        campaign.ends_at,
        CAMPAIGN_PERIOD_REFERENCE_MS,
      );
      if (periodFilter !== 'ALL' && period !== periodFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = `${campaign.code} ${campaign.name} ${campaign.id}`.toLowerCase();
      return haystack.includes(search);
    });

    return filtered.sort((left, right) => {
      if (sortKey === 'NAME_ASC') {
        return left.name.localeCompare(right.name, 'ko');
      }
      if (sortKey === 'START_ASC') {
        const leftValue = left.starts_at ?? '9999-12-31T23:59:59.999Z';
        const rightValue = right.starts_at ?? '9999-12-31T23:59:59.999Z';
        return leftValue.localeCompare(rightValue);
      }
      if (sortKey === 'END_ASC') {
        const leftValue = left.ends_at ?? '9999-12-31T23:59:59.999Z';
        const rightValue = right.ends_at ?? '9999-12-31T23:59:59.999Z';
        return leftValue.localeCompare(rightValue);
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [campaigns, keyword, periodFilter, sortKey, statusFilter, typeFilter]);

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

  const resolveNewTargetId = (): string => {
    if (newTargetType === 'PROJECT') {
      return newTargetProjectId;
    }
    if (newTargetType === 'PRODUCT') {
      return newTargetProductId;
    }
    if (newTargetType === 'VARIANT') {
      return newTargetVariantId;
    }
    return newTargetBundleDefinitionId;
  };

  const resolveEditingTargetId = (): string => {
    if (editingTargetType === 'PROJECT') {
      return editingTargetProjectId;
    }
    if (editingTargetType === 'PRODUCT') {
      return editingTargetProductId;
    }
    if (editingTargetType === 'VARIANT') {
      return editingTargetVariantId;
    }
    return editingTargetBundleDefinitionId;
  };

  const getTargetLabel = (target: { target_type: V2CampaignTargetType; target_id: string }) => {
    if (target.target_type === 'PROJECT') {
      return projectNameMap.get(target.target_id) || target.target_id;
    }
    if (target.target_type === 'PRODUCT') {
      return productNameMap.get(target.target_id) || target.target_id;
    }
    if (target.target_type === 'VARIANT') {
      return variantLabelMap.get(target.target_id) || target.target_id;
    }
    return bundleLabelMap.get(target.target_id) || target.target_id;
  };

  const handleCreateCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(async () => {
      const response = await createCampaign.mutateAsync({
        code: newCode.trim(),
        name: newName.trim(),
        description: newDescription.trim() || null,
        campaign_type: newType,
        status: newStatus,
        starts_at: parseDateTimeLocalInput(newStartsAtInput, '시작일시'),
        ends_at: parseDateTimeLocalInput(newEndsAtInput, '종료일시'),
        channel_scope_json: parseChannelScopeInput(newChannelScopeInput),
      });
      setSelectedCampaignId(response.data.id);
      setMessage('v2 캠페인을 생성했습니다.');
      setNewCode('');
      setNewName('');
      setNewDescription('');
      setNewType('EVENT');
      setNewStatus('DRAFT');
      setNewStartsAtInput('');
      setNewEndsAtInput('');
      setNewChannelScopeInput('');
    });
  };

  const handleStartEditCampaign = (campaign: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    campaign_type: V2CampaignType;
    status: V2CampaignStatus;
    starts_at: string | null;
    ends_at: string | null;
    channel_scope_json: unknown[];
  }) => {
    clearNotice();
    setEditingCampaignId(campaign.id);
    setEditingCode(campaign.code);
    setEditingName(campaign.name);
    setEditingDescription(campaign.description || '');
    setEditingType(campaign.campaign_type);
    setEditingStatus(campaign.status);
    setEditingStartsAtInput(toDateTimeLocalValue(campaign.starts_at));
    setEditingEndsAtInput(toDateTimeLocalValue(campaign.ends_at));
    setEditingChannelScopeInput(formatChannelScopeInput(campaign.channel_scope_json));
  };

  const handleCancelEditCampaign = () => {
    setEditingCampaignId(null);
    setEditingCode('');
    setEditingName('');
    setEditingDescription('');
    setEditingType('EVENT');
    setEditingStatus('DRAFT');
    setEditingStartsAtInput('');
    setEditingEndsAtInput('');
    setEditingChannelScopeInput('');
  };

  const handleUpdateCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCampaignId) {
      return;
    }
    await runAction(async () => {
      await updateCampaign.mutateAsync({
        id: editingCampaignId,
        data: {
          code: editingCode.trim(),
          name: editingName.trim(),
          description: editingDescription.trim() || null,
          campaign_type: editingType,
          status: editingStatus,
          starts_at: parseDateTimeLocalInput(editingStartsAtInput, '시작일시'),
          ends_at: parseDateTimeLocalInput(editingEndsAtInput, '종료일시'),
          channel_scope_json: parseChannelScopeInput(editingChannelScopeInput),
        },
      });
      setMessage('캠페인 정보를 수정했습니다.');
      handleCancelEditCampaign();
    });
  };

  const handleActivateCampaign = async (campaignId: string) => {
    await runAction(async () => {
      await activateCampaign.mutateAsync(campaignId);
      setMessage('캠페인을 ACTIVE로 전환했습니다.');
    });
  };

  const handleSuspendCampaign = async (campaignId: string) => {
    await runAction(async () => {
      await suspendCampaign.mutateAsync(campaignId);
      setMessage('캠페인을 SUSPENDED로 전환했습니다.');
    });
  };

  const handleCloseCampaign = async (campaignId: string) => {
    await runAction(async () => {
      await closeCampaign.mutateAsync(campaignId);
      setMessage('캠페인을 CLOSED로 전환했습니다.');
    });
  };

  const handleCreateTarget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCampaignId) {
      return;
    }
    const targetId = resolveNewTargetId().trim();
    if (!targetId) {
      setErrorMessage('타겟 대상을 선택하세요.');
      return;
    }
    await runAction(async () => {
      await createTarget.mutateAsync({
        campaignId: activeCampaignId,
        data: {
          target_type: newTargetType,
          target_id: targetId,
          sort_order: parseNonNegativeInteger(newTargetSortOrder, 'sort_order'),
          is_excluded: newTargetExcluded,
        },
      });
      setMessage('캠페인 타겟을 추가했습니다.');
      setNewTargetProjectId('');
      setNewTargetProductId('');
      setNewTargetVariantProductId('');
      setNewTargetVariantId('');
      setNewTargetBundleDefinitionId('');
      setNewTargetSortOrder('0');
      setNewTargetExcluded(false);
    });
  };

  const handleStartEditTarget = (target: {
    id: string;
    target_type: V2CampaignTargetType;
    target_id: string;
    sort_order: number;
    is_excluded: boolean;
  }) => {
    clearNotice();
    setEditingTargetId(target.id);
    setEditingTargetType(target.target_type);
    setEditingTargetProjectId(target.target_type === 'PROJECT' ? target.target_id : '');
    setEditingTargetProductId(target.target_type === 'PRODUCT' ? target.target_id : '');
    setEditingTargetVariantProductId('');
    setEditingTargetVariantId(target.target_type === 'VARIANT' ? target.target_id : '');
    setEditingTargetBundleDefinitionId(
      target.target_type === 'BUNDLE_DEFINITION' ? target.target_id : '',
    );
    setEditingTargetSortOrder(String(target.sort_order));
    setEditingTargetExcluded(target.is_excluded);
  };

  const handleCancelEditTarget = () => {
    setEditingTargetId(null);
    setEditingTargetType('PROJECT');
    setEditingTargetProjectId('');
    setEditingTargetProductId('');
    setEditingTargetVariantProductId('');
    setEditingTargetVariantId('');
    setEditingTargetBundleDefinitionId('');
    setEditingTargetSortOrder('0');
    setEditingTargetExcluded(false);
  };

  const handleUpdateTarget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTargetId) {
      return;
    }
    const targetId = resolveEditingTargetId().trim();
    if (!targetId) {
      setErrorMessage('수정할 타겟 대상을 선택하세요.');
      return;
    }
    await runAction(async () => {
      await updateTarget.mutateAsync({
        targetId: editingTargetId,
        data: {
          target_type: editingTargetType,
          target_id: targetId,
          sort_order: parseNonNegativeInteger(editingTargetSortOrder, 'sort_order'),
          is_excluded: editingTargetExcluded,
        },
      });
      setMessage('캠페인 타겟을 수정했습니다.');
      handleCancelEditTarget();
    });
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!window.confirm('이 타겟을 삭제하시겠습니까?')) {
      return;
    }
    await runAction(async () => {
      await deleteTarget.mutateAsync(targetId);
      if (editingTargetId === targetId) {
        handleCancelEditTarget();
      }
      setMessage('캠페인 타겟을 삭제했습니다.');
    });
  };

  if (campaignsLoading || projectsLoading || productsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 캠페인 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (campaignsError || projectsError || productsError || !campaigns || !projects || !products) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        캠페인 운영 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 캠페인 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            기간 판매/이벤트 캠페인과 타겟을 운영합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Badge intent="info" size="md">
            총 {campaigns.length}개
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
        <h2 className="text-lg font-semibold text-gray-900">새 캠페인 등록</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleCreateCampaign}>
          <Input
            placeholder="캠페인 코드 (예: spring-sale-2026)"
            value={newCode}
            onChange={(event) => setNewCode(event.target.value)}
            required
          />
          <Input
            placeholder="캠페인명"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
          />
          <select
            value={newType}
            onChange={(event) => setNewType(event.target.value as V2CampaignType)}
            className={SELECT_CLASS}
          >
            {CAMPAIGN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={newStatus}
            onChange={(event) => setNewStatus(event.target.value as V2CampaignStatus)}
            className={SELECT_CLASS}
          >
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={newStartsAtInput}
            onChange={(event) => setNewStartsAtInput(event.target.value)}
            placeholder="시작일시"
          />
          <Input
            type="datetime-local"
            value={newEndsAtInput}
            onChange={(event) => setNewEndsAtInput(event.target.value)}
            placeholder="종료일시"
          />
          <div className="lg:col-span-3">
            <Input
              placeholder="채널 범위 (쉼표 구분, 예: WEB,APP)"
              value={newChannelScopeInput}
              onChange={(event) => setNewChannelScopeInput(event.target.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <Textarea
              placeholder="설명 (선택)"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="lg:col-span-3">
            <Button type="submit" loading={createCampaign.isPending}>
              캠페인 생성
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="코드/이름 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as CampaignFilterStatus)}
            className={SELECT_CLASS}
          >
            <option value="ALL">전체 상태</option>
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as CampaignFilterType)}
            className={SELECT_CLASS}
          >
            <option value="ALL">전체 타입</option>
            {CAMPAIGN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value as CampaignPeriodFilter)}
            className={SELECT_CLASS}
          >
            <option value="ALL">전체 기간</option>
            <option value="LIVE">진행중</option>
            <option value="UPCOMING">예정</option>
            <option value="ENDED">종료</option>
            <option value="NO_PERIOD">상시</option>
          </select>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as CampaignSortKey)}
            className={SELECT_CLASS}
          >
            <option value="UPDATED_DESC">최근 수정순</option>
            <option value="START_ASC">시작일 빠른순</option>
            <option value="END_ASC">종료일 빠른순</option>
            <option value="NAME_ASC">이름순</option>
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  캠페인
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  타입/상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  기간/채널
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    조회 결과가 없습니다.
                  </td>
                </tr>
              )}
              {filteredCampaigns.map((campaign) => {
                const period = getCampaignPeriod(
                  campaign.starts_at,
                  campaign.ends_at,
                  CAMPAIGN_PERIOD_REFERENCE_MS,
                );
                const isSelected = campaign.id === activeCampaignId;

                return (
                  <tr key={campaign.id} className={isSelected ? 'bg-blue-50/40' : undefined}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{campaign.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{campaign.code}</p>
                      <p className="mt-1 text-xs text-gray-500">{campaign.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge intent="default">{campaign.campaign_type}</Badge>
                        <Badge intent={getCampaignStatusIntent(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        <Badge intent={getPeriodIntent(period)}>{getPeriodLabel(period)}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>시작: {formatDateTime(campaign.starts_at)}</p>
                      <p>종료: {formatDateTime(campaign.ends_at)}</p>
                      <p className="mt-1">채널: {formatChannelScope(campaign.channel_scope_json)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          intent={isSelected ? 'secondary' : 'neutral'}
                          size="sm"
                          onClick={() => setSelectedCampaignId(campaign.id)}
                        >
                          {isSelected ? '선택됨' : '선택'}
                        </Button>
                        <Button
                          intent="neutral"
                          size="sm"
                          onClick={() => handleStartEditCampaign(campaign)}
                        >
                          수정
                        </Button>
                        {campaign.status !== 'ACTIVE' && campaign.status !== 'CLOSED' && (
                          <Button
                            size="sm"
                            onClick={() => handleActivateCampaign(campaign.id)}
                            loading={activateCampaign.isPending}
                          >
                            활성화
                          </Button>
                        )}
                        {campaign.status === 'ACTIVE' && (
                          <Button
                            intent="secondary"
                            size="sm"
                            onClick={() => handleSuspendCampaign(campaign.id)}
                            loading={suspendCampaign.isPending}
                          >
                            일시중지
                          </Button>
                        )}
                        {campaign.status === 'ACTIVE' || campaign.status === 'SUSPENDED' ? (
                          <Button
                            intent="neutral"
                            size="sm"
                            onClick={() => handleCloseCampaign(campaign.id)}
                            loading={closeCampaign.isPending}
                          >
                            종료
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editingCampaignId && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">캠페인 수정</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleUpdateCampaign}>
            <Input
              placeholder="캠페인 코드"
              value={editingCode}
              onChange={(event) => setEditingCode(event.target.value)}
              required
            />
            <Input
              placeholder="캠페인명"
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              required
            />
            <select
              value={editingType}
              onChange={(event) => setEditingType(event.target.value as V2CampaignType)}
              className={SELECT_CLASS}
            >
              {CAMPAIGN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={editingStatus}
              onChange={(event) => setEditingStatus(event.target.value as V2CampaignStatus)}
              className={SELECT_CLASS}
            >
              {CAMPAIGN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Input
              type="datetime-local"
              value={editingStartsAtInput}
              onChange={(event) => setEditingStartsAtInput(event.target.value)}
            />
            <Input
              type="datetime-local"
              value={editingEndsAtInput}
              onChange={(event) => setEditingEndsAtInput(event.target.value)}
            />
            <div className="lg:col-span-3">
              <Input
                placeholder="채널 범위 (쉼표 구분)"
                value={editingChannelScopeInput}
                onChange={(event) => setEditingChannelScopeInput(event.target.value)}
              />
            </div>
            <div className="lg:col-span-3">
              <Textarea
                placeholder="설명"
                value={editingDescription}
                onChange={(event) => setEditingDescription(event.target.value)}
                rows={3}
              />
            </div>
            <div className="lg:col-span-3 flex gap-2">
              <Button type="submit" loading={updateCampaign.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelEditCampaign}>
                취소
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">캠페인 타겟 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              캠페인에 포함/제외할 프로젝트·상품·variant·번들을 지정합니다.
            </p>
            {activeCampaign && (
              <p className="mt-1 text-xs text-gray-500">
                선택 캠페인: {activeCampaign.name} ({activeCampaign.code})
              </p>
            )}
          </div>
          {!activeCampaign && (
            <Badge intent="warning" size="md">
              캠페인을 먼저 선택하세요
            </Badge>
          )}
        </div>

        {activeCampaign && (
          <>
            <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleCreateTarget}>
              <select
                value={newTargetType}
                onChange={(event) => {
                  const nextType = event.target.value as V2CampaignTargetType;
                  setNewTargetType(nextType);
                  setNewTargetProjectId('');
                  setNewTargetProductId('');
                  setNewTargetVariantProductId('');
                  setNewTargetVariantId('');
                  setNewTargetBundleDefinitionId('');
                }}
                className={SELECT_CLASS}
              >
                {TARGET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {newTargetType === 'PROJECT' && (
                <select
                  value={newTargetProjectId}
                  onChange={(event) => setNewTargetProjectId(event.target.value)}
                  className={SELECT_CLASS}
                  required
                >
                  <option value="">프로젝트 선택</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}

              {newTargetType === 'PRODUCT' && (
                <select
                  value={newTargetProductId}
                  onChange={(event) => setNewTargetProductId(event.target.value)}
                  className={SELECT_CLASS}
                  required
                >
                  <option value="">상품 선택</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title} ({product.slug})
                    </option>
                  ))}
                </select>
              )}

              {newTargetType === 'VARIANT' && (
                <>
                  <select
                    value={newTargetVariantProductId}
                    onChange={(event) => {
                      setNewTargetVariantProductId(event.target.value);
                      setNewTargetVariantId('');
                    }}
                    className={SELECT_CLASS}
                    required
                  >
                    <option value="">상품 선택</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTargetVariantId}
                    onChange={(event) => setNewTargetVariantId(event.target.value)}
                    className={SELECT_CLASS}
                    required
                    disabled={!newTargetVariantProductId}
                  >
                    <option value="">
                      {newVariantOptionsLoading ? 'variant 조회 중...' : 'variant 선택'}
                    </option>
                    {(newVariantOptions || []).map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.title} ({variant.sku})
                      </option>
                    ))}
                  </select>
                </>
              )}

              {newTargetType === 'BUNDLE_DEFINITION' && (
                <select
                  value={newTargetBundleDefinitionId}
                  onChange={(event) => setNewTargetBundleDefinitionId(event.target.value)}
                  className={SELECT_CLASS}
                  required
                >
                  <option value="">번들 정의 선택</option>
                  {(bundleDefinitions || []).map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {bundleLabelMap.get(definition.id)}
                    </option>
                  ))}
                </select>
              )}

              <Input
                placeholder="sort_order"
                value={newTargetSortOrder}
                onChange={(event) => setNewTargetSortOrder(event.target.value)}
              />
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newTargetExcluded}
                  onChange={(event) => setNewTargetExcluded(event.target.checked)}
                />
                제외 대상
              </label>
              <div className="lg:col-span-4">
                <Button type="submit" loading={createTarget.isPending}>
                  타겟 추가
                </Button>
              </div>
            </form>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      대상 타입
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      대상
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      설정
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {targetsLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        타겟 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!targetsLoading && targetsError && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">
                        타겟 목록을 불러오지 못했습니다.
                      </td>
                    </tr>
                  )}
                  {!targetsLoading && !targetsError && (campaignTargets || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        등록된 타겟이 없습니다.
                      </td>
                    </tr>
                  )}
                  {!targetsLoading &&
                    !targetsError &&
                    (campaignTargets || []).map((target) => (
                      <tr key={target.id}>
                        <td className="px-4 py-3">
                          <Badge intent="default">{target.target_type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{getTargetLabel(target)}</p>
                          <p className="mt-1 text-xs text-gray-500">{target.target_id}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <p>sort: {target.sort_order}</p>
                          <p>제외 여부: {target.is_excluded ? '예' : '아니오'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              intent="neutral"
                              size="sm"
                              onClick={() => handleStartEditTarget(target)}
                            >
                              수정
                            </Button>
                            <Button
                              intent="danger"
                              size="sm"
                              onClick={() => handleDeleteTarget(target.id)}
                              loading={deleteTarget.isPending}
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

      {editingTargetId && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">타겟 수정</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleUpdateTarget}>
            <select
              value={editingTargetType}
              onChange={(event) => {
                const nextType = event.target.value as V2CampaignTargetType;
                setEditingTargetType(nextType);
                setEditingTargetProjectId('');
                setEditingTargetProductId('');
                setEditingTargetVariantProductId('');
                setEditingTargetVariantId('');
                setEditingTargetBundleDefinitionId('');
              }}
              className={SELECT_CLASS}
            >
              {TARGET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {editingTargetType === 'PROJECT' && (
              <select
                value={editingTargetProjectId}
                onChange={(event) => setEditingTargetProjectId(event.target.value)}
                className={SELECT_CLASS}
                required
              >
                <option value="">프로젝트 선택</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}

            {editingTargetType === 'PRODUCT' && (
              <select
                value={editingTargetProductId}
                onChange={(event) => setEditingTargetProductId(event.target.value)}
                className={SELECT_CLASS}
                required
              >
                <option value="">상품 선택</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title} ({product.slug})
                  </option>
                ))}
              </select>
            )}

            {editingTargetType === 'VARIANT' && (
              <>
                <select
                  value={editingTargetVariantProductId}
                  onChange={(event) => {
                    setEditingTargetVariantProductId(event.target.value);
                    setEditingTargetVariantId('');
                  }}
                  className={SELECT_CLASS}
                >
                  <option value="">상품 선택 (변경 시)</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
                <select
                  value={editingTargetVariantId}
                  onChange={(event) => setEditingTargetVariantId(event.target.value)}
                  className={SELECT_CLASS}
                  required
                >
                  <option value="">
                    {editingVariantOptionsLoading ? 'variant 조회 중...' : 'variant 선택'}
                  </option>
                  {editingTargetVariantId &&
                    !(editingVariantOptions || []).some(
                      (variant) => variant.id === editingTargetVariantId,
                    ) && (
                      <option value={editingTargetVariantId}>
                        현재 대상 유지 ({editingTargetVariantId})
                      </option>
                    )}
                  {(editingVariantOptions || []).map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.title} ({variant.sku})
                    </option>
                  ))}
                </select>
              </>
            )}

            {editingTargetType === 'BUNDLE_DEFINITION' && (
              <select
                value={editingTargetBundleDefinitionId}
                onChange={(event) => setEditingTargetBundleDefinitionId(event.target.value)}
                className={SELECT_CLASS}
                required
              >
                <option value="">번들 정의 선택</option>
                {(bundleDefinitions || []).map((definition) => (
                  <option key={definition.id} value={definition.id}>
                    {bundleLabelMap.get(definition.id)}
                  </option>
                ))}
              </select>
            )}

            <Input
              placeholder="sort_order"
              value={editingTargetSortOrder}
              onChange={(event) => setEditingTargetSortOrder(event.target.value)}
            />
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editingTargetExcluded}
                onChange={(event) => setEditingTargetExcluded(event.target.checked)}
              />
              제외 대상
            </label>
            <div className="lg:col-span-4 flex gap-2">
              <Button type="submit" loading={updateTarget.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelEditTarget}>
                취소
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
