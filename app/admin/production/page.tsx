'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2AdminProductionBatchStatus,
  V2AdminProductionSavedView,
  V2AdminTransitionResult,
} from '@/lib/client/api/v2-admin-production.api';
import {
  useV2AdminActivateProductionBatch,
  useV2AdminCancelProductionBatch,
  useV2AdminCompleteProductionBatch,
  useV2AdminCreateProductionBatch,
  useV2AdminCreateProductionView,
  useV2AdminDeleteProductionView,
  useV2AdminPreviewProductionBatch,
  useV2AdminProductionBatchDetail,
  useV2AdminProductionBatches,
  useV2AdminProductionCandidates,
  useV2AdminProductionViews,
  useV2AdminUpdateProductionView,
} from '@/lib/client/hooks/useV2AdminProduction';
import { useSession } from '@/lib/client/hooks';
import { useV2AdminProjects, useV2Campaigns } from '@/lib/client/hooks/useV2CatalogAdmin';

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

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number | null | undefined): string {
  return `${Math.max(0, Number(amount || 0)).toLocaleString()}원`;
}

function resolveBatchIntent(status: V2AdminProductionBatchStatus) {
  if (status === 'ACTIVE') {
    return 'warning' as const;
  }
  if (status === 'COMPLETED') {
    return 'success' as const;
  }
  if (status === 'CANCELED') {
    return 'error' as const;
  }
  return 'default' as const;
}

function resolveBatchStatusLabel(status: string | null | undefined): string {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'DRAFT') {
    return '준비중';
  }
  if (normalized === 'ACTIVE') {
    return '제작중';
  }
  if (normalized === 'COMPLETED') {
    return '제작 완료';
  }
  if (normalized === 'CANCELED') {
    return '취소됨';
  }
  return status || '-';
}

function resolveTransitionDescription(
  status: V2AdminTransitionResult,
  mode: 'activate' | 'complete',
  errorMessage?: string | null,
): string | null {
  if (status === 'FAILED') {
    return errorMessage || '상태 전이 중 오류가 발생했습니다.';
  }
  if (status === 'SKIPPED') {
    if (mode === 'complete') {
      return '이미 배송 대기 상태여서 변경 없이 처리되었습니다.';
    }
    return '이미 해당 단계가 반영되어 변경 없이 처리되었습니다.';
  }
  return null;
}

function resolveProductionOrderState(row: {
  transition_activate_status: V2AdminTransitionResult;
  transition_complete_status: V2AdminTransitionResult;
  error_message: string | null;
}): {
  label: string;
  intent: 'default' | 'warning' | 'success' | 'error';
  description: string | null;
} {
  if (row.transition_complete_status === 'FAILED') {
    return {
      label: '제작 완료 실패',
      intent: 'error',
      description: resolveTransitionDescription(
        row.transition_complete_status,
        'complete',
        row.error_message,
      ),
    };
  }

  if (row.transition_activate_status === 'FAILED') {
    return {
      label: '제작 시작 실패',
      intent: 'error',
      description: resolveTransitionDescription(
        row.transition_activate_status,
        'activate',
        row.error_message,
      ),
    };
  }

  if (
    row.transition_complete_status === 'SUCCEEDED' ||
    row.transition_complete_status === 'SKIPPED'
  ) {
    return {
      label: '제작 완료',
      intent: 'success',
      description:
        row.transition_complete_status === 'SKIPPED'
          ? resolveTransitionDescription(
              row.transition_complete_status,
              'complete',
              row.error_message,
            )
          : null,
    };
  }

  if (
    row.transition_activate_status === 'SUCCEEDED' ||
    row.transition_activate_status === 'SKIPPED'
  ) {
    return {
      label: '제작중',
      intent: 'warning',
      description:
        row.transition_activate_status === 'SKIPPED'
          ? resolveTransitionDescription(
              row.transition_activate_status,
              'activate',
              row.error_message,
            )
          : null,
    };
  }

  return {
    label: '제작 대기',
    intent: 'default',
    description: null,
  };
}

function resolveComposition(row: {
  has_bundle: boolean;
  has_physical: boolean;
  has_digital: boolean;
}) {
  if (row.has_bundle) {
    return '번들';
  }
  if (row.has_physical && row.has_digital) {
    return '실물+디지털';
  }
  if (row.has_physical) {
    return '실물';
  }
  if (row.has_digital) {
    return '디지털';
  }
  return '기타';
}

function formatAutoBatchTitleDate(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function buildProjectSummary(projectNames: string[]): string {
  const unique = Array.from(new Set(projectNames.filter((name) => name.trim().length > 0)));
  if (unique.length === 0) {
    return '선택 주문 없음';
  }
  if (unique.length === 1) {
    return unique[0];
  }
  return `${unique[0]} 외 ${unique.length - 1}`;
}

function buildSelectionKey(orderIds: string[]): string {
  return orderIds.slice().sort().join(',');
}

type ProductionCandidateFilterValue = {
  projectId: string;
  campaignId: string;
};

const MAX_SAVED_PRODUCTION_FILTERS = 30;

function isSameFilterValues(
  left: ProductionCandidateFilterValue,
  right: ProductionCandidateFilterValue,
): boolean {
  return (
    left.projectId === right.projectId &&
    left.campaignId === right.campaignId
  );
}

function normalizeProductionFilterValues(
  value: Partial<ProductionCandidateFilterValue> | null | undefined,
): ProductionCandidateFilterValue {
  return {
    projectId: value?.projectId || '',
    campaignId: value?.campaignId || '',
  };
}

function toFilterValueFromSavedView(
  view: V2AdminProductionSavedView,
): ProductionCandidateFilterValue {
  return {
    projectId: view.filter.project_id || '',
    campaignId: view.filter.campaign_id || '',
  };
}

export default function AdminProductionPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const ownerAdminId = user?.id || null;

  const initialFilterValues = useMemo(
    () => normalizeProductionFilterValues(null),
    [],
  );

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [projectIdInput, setProjectIdInput] = useState(initialFilterValues.projectId);
  const [campaignIdInput, setCampaignIdInput] = useState(initialFilterValues.campaignId);
  const [selectedViewId, setSelectedViewId] = useState<string>('DEFAULT');
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);
  const [viewNameDraft, setViewNameDraft] = useState('');

  const [projectId, setProjectId] = useState(initialFilterValues.projectId);
  const [campaignId, setCampaignId] = useState(initialFilterValues.campaignId);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchNotes, setBatchNotes] = useState('');
  const [previewSelectionKey, setPreviewSelectionKey] = useState('');
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null);
  const autoPreviewRequestedKeyRef = useRef('');

  const [batchStatusFilter, setBatchStatusFilter] =
    useState<V2AdminProductionBatchStatus | ''>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchActionReason, setBatchActionReason] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useV2AdminProjects();
  const { data: campaigns = [], isLoading: campaignsLoading } = useV2Campaigns();

  const candidatesQuery = useV2AdminProductionCandidates({
    limit: 300,
    project_id: projectId || undefined,
    campaign_id: campaignId || undefined,
  });
  const batchesQuery = useV2AdminProductionBatches({
    limit: 100,
    status: batchStatusFilter || undefined,
  });
  const batchDetailQuery = useV2AdminProductionBatchDetail(selectedBatchId);

  const previewMutation = useV2AdminPreviewProductionBatch();
  const createBatchMutation = useV2AdminCreateProductionBatch();
  const activateBatchMutation = useV2AdminActivateProductionBatch();
  const completeBatchMutation = useV2AdminCompleteProductionBatch();
  const cancelBatchMutation = useV2AdminCancelProductionBatch();
  const productionViewsQuery = useV2AdminProductionViews(ownerAdminId, {
    enabled: !sessionLoading,
  });
  const createViewMutation = useV2AdminCreateProductionView(ownerAdminId);
  const updateViewMutation = useV2AdminUpdateProductionView(ownerAdminId);
  const deleteViewMutation = useV2AdminDeleteProductionView(ownerAdminId);

  const previewData = previewMutation.data;
  const currentSelectionKey = useMemo(
    () => buildSelectionKey(selectedOrderIds),
    [selectedOrderIds],
  );
  const hasFreshPreview =
    currentSelectionKey.length > 0 &&
    previewSelectionKey.length > 0 &&
    currentSelectionKey === previewSelectionKey;
  const candidateRows = useMemo(
    () => candidatesQuery.data?.items || [],
    [candidatesQuery.data?.items],
  );
  const detail = batchDetailQuery.data;
  const selectedBatch = detail?.batch || null;
  const savedFilters = useMemo(
    () => (productionViewsQuery.data?.items || []).slice(0, MAX_SAVED_PRODUCTION_FILTERS),
    [productionViewsQuery.data?.items],
  );

  const selectedCandidateRows = useMemo(() => {
    const selectedIdSet = new Set(selectedOrderIds);
    return candidateRows.filter((row) => selectedIdSet.has(row.order_id));
  }, [candidateRows, selectedOrderIds]);

  const selectedProjectSummary = useMemo(
    () => buildProjectSummary(selectedCandidateRows.map((row) => row.project_name || '')),
    [selectedCandidateRows],
  );

  const autoBatchTitle = useMemo(() => {
    const datePrefix = formatAutoBatchTitleDate(new Date());
    const todaySequences = (batchesQuery.data?.items || [])
      .map((row) => String(row.title || ''))
      .map((title) => {
        const match = title.match(/^(\d{6})(\d{2,})$/);
        if (!match || match[1] !== datePrefix) {
          return 0;
        }
        return Number.parseInt(match[2], 10);
      })
      .filter((value) => Number.isFinite(value));

    const nextSequence = (todaySequences.length > 0 ? Math.max(...todaySequences) : 0) + 1;
    return `${datePrefix}${String(nextSequence).padStart(2, '0')}`;
  }, [batchesQuery.data?.items]);

  const projectOptions = useMemo(
    () =>
      projects
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, 'ko-KR'))
        .map((project) => ({
          value: project.id,
          label: `${project.name} (${project.slug})`,
        })),
    [projects],
  );

  const campaignOptions = useMemo(
    () =>
      campaigns
        .slice()
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
        .map((campaign) => ({
          value: campaign.id,
          label: `${campaign.name} (${campaign.code})`,
        })),
    [campaigns],
  );

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      map.set(project.id, project.name);
    }
    return map;
  }, [projects]);

  const campaignNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const campaign of campaigns) {
      map.set(campaign.id, campaign.name);
    }
    return map;
  }, [campaigns]);

  const selectedSavedView = useMemo(
    () => savedFilters.find((row) => row.id === selectedViewId) || null,
    [savedFilters, selectedViewId],
  );

  const allCandidateIds = candidateRows.map((row) => row.order_id);
  const allChecked =
    candidateRows.length > 0 &&
    selectedOrderIds.length > 0 &&
    selectedOrderIds.length === allCandidateIds.length;

  const isBusy =
    createBatchMutation.isPending ||
    activateBatchMutation.isPending ||
    completeBatchMutation.isPending ||
    cancelBatchMutation.isPending ||
    createViewMutation.isPending ||
    updateViewMutation.isPending ||
    deleteViewMutation.isPending;

  const summary = useMemo(() => {
    return {
      candidateCount: candidateRows.length,
      selectedCount: selectedOrderIds.length,
      previewValidCount:
        hasFreshPreview && previewData ? previewData.valid_order_count : 0,
      previewBlockedCount:
        hasFreshPreview && previewData ? previewData.blocked_order_count : 0,
      activeBatchCount:
        (batchesQuery.data?.items || []).filter((row) => row.status === 'ACTIVE')
          .length || 0,
    };
  }, [
    batchesQuery.data?.items,
    candidateRows.length,
    hasFreshPreview,
    previewData,
    selectedOrderIds.length,
  ]);

  const workflowGuideSteps = useMemo(() => {
    const hasAppliedView =
      selectedViewId !== 'DEFAULT' || Boolean(projectId || campaignId);
    const hasOrderSelection = selectedOrderIds.length > 0;
    const hasBatchCreated = Boolean(selectedBatch?.id);
    const hasTransitionStarted =
      (selectedBatch?.status as V2AdminProductionBatchStatus | undefined) === 'ACTIVE' ||
      (selectedBatch?.status as V2AdminProductionBatchStatus | undefined) === 'COMPLETED';

    return [
      {
        key: 'view',
        title: '1. 뷰/필터 선택',
        description: '뷰 관리에서 프로젝트/캠페인 필터를 적용하거나 저장된 뷰를 불러옵니다.',
        done: hasAppliedView,
        hint: hasAppliedView
          ? '현재 조건이 적용되어 있습니다.'
          : '설정된 뷰/필터 없이 시작 중입니다.',
      },
      {
        key: 'select',
        title: '2. 주문 선택',
        description: '후보 주문을 체크해 이번 제작 스냅샷 대상을 확정합니다.',
        done: hasOrderSelection,
        hint: hasOrderSelection
          ? `${selectedOrderIds.length}건이 선택되었습니다.`
          : '체크박스로 주문을 선택하세요.',
      },
      {
        key: 'batch',
        title: '3. 배치 생성',
        description: '선택한 주문을 스냅샷으로 저장해 DRAFT 배치를 생성합니다.',
        done: hasBatchCreated,
        hint: hasBatchCreated
          ? '배치가 생성되어 상세 확인/전이가 가능합니다.'
          : '주문을 선택한 뒤 배치 생성을 실행하세요.',
      },
      {
        key: 'transition',
        title: '4. 배치 전이',
        description: '준비중 → 제작중 → 제작 완료 순으로 배치를 전이합니다.',
        done: hasTransitionStarted,
        hint: hasTransitionStarted
          ? '선택 배치가 전이 단계에 진입했습니다.'
          : '생성된 배치를 선택해 액션을 실행하세요.',
      },
    ] as const;
  }, [
    campaignId,
    projectId,
    selectedBatch?.id,
    selectedBatch?.status,
    selectedOrderIds.length,
    selectedViewId,
  ]);

  useEffect(() => {
    if (selectedOrderIds.length === 0) {
      previewMutation.reset();
      autoPreviewRequestedKeyRef.current = '';
      return;
    }

    const requestSelectionKey = buildSelectionKey(selectedOrderIds);
    if (!requestSelectionKey) {
      previewMutation.reset();
      autoPreviewRequestedKeyRef.current = '';
      return;
    }
    if (autoPreviewRequestedKeyRef.current === requestSelectionKey) {
      return;
    }
    autoPreviewRequestedKeyRef.current = requestSelectionKey;

    const timeoutId = setTimeout(() => {
      previewMutation.mutate(
        { order_ids: selectedOrderIds },
        {
          onSuccess: () => {
            setPreviewSelectionKey(requestSelectionKey);
            setPreviewErrorMessage(null);
          },
          onError: (error) => {
            setPreviewSelectionKey('');
            setPreviewErrorMessage(getErrorMessage(error));
          },
        },
      );
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [previewMutation, selectedOrderIds]);

  const currentFilterInputValue: ProductionCandidateFilterValue = {
    projectId: projectIdInput,
    campaignId: campaignIdInput,
  };

  const applyFilterValues = (values: ProductionCandidateFilterValue) => {
    setProjectIdInput(values.projectId);
    setCampaignIdInput(values.campaignId);

    setProjectId(values.projectId);
    setCampaignId(values.campaignId);
    setSelectedOrderIds([]);
    setPreviewSelectionKey('');
    setPreviewErrorMessage(null);
  };

  const buildFilterSummaryText = (values: ProductionCandidateFilterValue): string => {
    const projectLabel = values.projectId
      ? projectNameById.get(values.projectId) || '알 수 없는 프로젝트'
      : '전체 프로젝트';
    const campaignLabel = values.campaignId
      ? campaignNameById.get(values.campaignId) || '알 수 없는 캠페인'
      : '전체 캠페인';
    return `${projectLabel} · ${campaignLabel}`;
  };

  const appliedFilterSummaryText =
    !projectId && !campaignId
      ? '설정된 필터 없음'
      : buildFilterSummaryText({ projectId, campaignId });

  const setError = (error: unknown) => {
    setMessage(null);
    setErrorMessage(getErrorMessage(error));
  };

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const toggleOrderSelection = (orderId: string) => {
    setPreviewErrorMessage(null);
    setSelectedOrderIds((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const toggleSelectAll = () => {
    setPreviewErrorMessage(null);
    if (allChecked) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds(allCandidateIds);
  };

  const handleSearchApply = () => {
    clearNotice();
    applyFilterValues(currentFilterInputValue);
    const matchedView = savedFilters.find((row) =>
      isSameFilterValues(toFilterValueFromSavedView(row), currentFilterInputValue),
    );
    setSelectedViewId(matchedView?.id || 'DEFAULT');
  };

  const handleSearchReset = () => {
    clearNotice();
    const emptyFilter: ProductionCandidateFilterValue = normalizeProductionFilterValues(null);
    applyFilterValues(emptyFilter);
    setSelectedViewId('DEFAULT');
  };

  const handleCreateViewFromCurrentFilter = async () => {
    clearNotice();
    const hasAnyValue = Object.values(currentFilterInputValue).some(
      (value) => value.trim().length > 0,
    );
    if (!hasAnyValue) {
      setErrorMessage('저장할 뷰 조건이 없습니다.');
      return;
    }

    if (!viewNameDraft.trim()) {
      setErrorMessage('뷰 이름을 입력해 주세요.');
      return;
    }

    try {
      const created = await createViewMutation.mutateAsync({
        name: viewNameDraft.trim(),
        filter: {
          project_id: currentFilterInputValue.projectId || null,
          campaign_id: currentFilterInputValue.campaignId || null,
        },
      });
      setViewNameDraft('');
      setSelectedViewId(created.id);
      setMessage('현재 조건을 새 뷰로 저장했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleApplySavedFilter = (savedFilter: V2AdminProductionSavedView) => {
    clearNotice();
    applyFilterValues(toFilterValueFromSavedView(savedFilter));
    setSelectedViewId(savedFilter.id);
    setMessage(`"${savedFilter.name}" 뷰를 적용했습니다.`);
  };

  const handleUpdateSelectedView = async () => {
    clearNotice();
    if (!selectedSavedView) {
      setErrorMessage('업데이트할 저장 뷰를 먼저 선택해 주세요.');
      return;
    }

    try {
      await updateViewMutation.mutateAsync({
        viewId: selectedSavedView.id,
        data: {
          filter: {
            project_id: currentFilterInputValue.projectId || null,
            campaign_id: currentFilterInputValue.campaignId || null,
          },
        },
      });
      setMessage(`"${selectedSavedView.name}" 뷰를 현재 조건으로 업데이트했습니다.`);
    } catch (error) {
      setError(error);
    }
  };

  const handleDeleteSavedFilter = async (filterId: string) => {
    clearNotice();
    try {
      await deleteViewMutation.mutateAsync(filterId);
      if (selectedViewId === filterId) {
        setSelectedViewId('DEFAULT');
      }
      setMessage('선택한 뷰를 삭제했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleCreateBatch = async () => {
    clearNotice();
    if (selectedOrderIds.length === 0) {
      setErrorMessage('배치에 포함할 주문을 먼저 선택해 주세요.');
      return;
    }

    try {
      const created = await createBatchMutation.mutateAsync({
        title: autoBatchTitle,
        order_ids: selectedOrderIds,
        notes: batchNotes.trim() || null,
      });
      const nextBatchId = typeof created.batch?.id === 'string' ? created.batch.id : null;
      if (nextBatchId) {
        setSelectedBatchId(nextBatchId);
      }

      setBatchNotes('');
      setSelectedOrderIds([]);
      const createdTitle =
        typeof created.batch?.title === 'string' ? created.batch.title : autoBatchTitle;
      setMessage(`제작 배치를 생성했습니다. (${createdTitle})`);
    } catch (error) {
      setError(error);
    }
  };

  const handleActivateBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await activateBatchMutation.mutateAsync({
        batchId: selectedBatchId,
        data: { reason: batchActionReason.trim() || null },
      });
      setMessage('배치를 제작중으로 전환하고 주문을 제작 단계로 이동했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleCompleteBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await completeBatchMutation.mutateAsync({
        batchId: selectedBatchId,
        data: { reason: batchActionReason.trim() || null },
      });
      setMessage('제작 완료 처리 후 주문을 배송 대기로 이동했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleCancelBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await cancelBatchMutation.mutateAsync({
        batchId: selectedBatchId,
        reason: batchActionReason.trim() || null,
      });
      setMessage('선택한 제작 배치를 취소했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">제작 관리</h1>
        <p className="text-sm text-gray-600">
          입금 확인 주문을 배치로 묶어 제작 수량을 확정하고, 제작 완료 시 배송 대기 단계로
          일괄 전이합니다.
        </p>
      </header>

      {(message || errorMessage) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {errorMessage || message}
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">작업 가이드</h2>
          <p className="text-sm text-slate-600">
            뷰 선택부터 배치 전이까지, 아래 순서대로 진행하면 누락 없이 처리할 수 있습니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          {workflowGuideSteps.map((step) => (
            <div key={step.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <Badge intent={step.done ? 'success' : 'default'}>
                  {step.done ? '완료' : '대기'}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">{step.description}</p>
              <p className="mt-2 text-xs text-slate-500">{step.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">후보 주문</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {summary.candidateCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">선택 주문</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {summary.selectedCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">자동 검증 통과</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {summary.previewValidCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">진행 중 배치</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {summary.activeBatchCount}
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">1) 제작 후보 주문 선택</h2>
          <p className="text-sm text-gray-600">
            PAYMENT_CONFIRMED 주문만 표시됩니다. 선택 즉시 자동 검증이 실행되며, 문제 없으면
            바로 배치를 생성할 수 있습니다.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">설정된 뷰</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedSavedView?.name || '설정된 뷰 없음'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">설정된 필터</p>
                <p className="text-sm font-medium text-gray-900">{appliedFilterSummaryText}</p>
              </div>
            </div>
            <Button
              intent="neutral"
              onClick={() => setIsViewManagerOpen((prev) => !prev)}
            >
              {isViewManagerOpen ? '뷰 관리 닫기' : '뷰 관리 열기'}
            </Button>
          </div>
        </div>

        {isViewManagerOpen && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">필터 관리</p>
              <p className="text-xs text-gray-600">
                제작 후보 조회는 프로젝트/캠페인 필터만 사용합니다.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  className="h-11 rounded-lg border border-gray-200 px-3 text-sm"
                  value={projectIdInput}
                  disabled={projectsLoading}
                  onChange={(event) => setProjectIdInput(event.target.value)}
                >
                  <option value="">전체 프로젝트</option>
                  {projectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-11 rounded-lg border border-gray-200 px-3 text-sm"
                  value={campaignIdInput}
                  disabled={campaignsLoading}
                  onChange={(event) => setCampaignIdInput(event.target.value)}
                >
                  <option value="">전체 캠페인</option>
                  {campaignOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button intent="neutral" onClick={handleSearchApply}>
                  필터 적용
                </Button>
                <Button intent="neutral" onClick={handleSearchReset}>
                  필터 해제
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">뷰 관리</p>
              <p className="text-xs text-gray-600">
                현재 필터를 뷰로 저장하면 반복 작업 시 바로 다시 적용할 수 있습니다.
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={viewNameDraft}
                  onChange={(event) => setViewNameDraft(event.target.value)}
                  placeholder="새 뷰 이름 (예: 미루루-3월4주)"
                />
                <Button intent="neutral" onClick={handleCreateViewFromCurrentFilter}>
                  새 뷰 저장
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  intent={selectedViewId === 'DEFAULT' ? 'secondary' : 'neutral'}
                  size="sm"
                  onClick={() => {
                    clearNotice();
                    setSelectedViewId('DEFAULT');
                    setMessage('뷰 선택을 해제했습니다.');
                  }}
                >
                  뷰 선택 해제
                </Button>
                {selectedSavedView && (
                  <Button intent="neutral" size="sm" onClick={handleUpdateSelectedView}>
                    선택 뷰 업데이트
                  </Button>
                )}
                <Button
                  intent="danger"
                  size="sm"
                  onClick={() =>
                    selectedSavedView ? handleDeleteSavedFilter(selectedSavedView.id) : null
                  }
                  disabled={!selectedSavedView}
                >
                  선택 뷰 삭제
                </Button>
              </div>

              <div className="space-y-2">
                {savedFilters.length === 0 ? (
                  <p className="text-xs text-gray-500">저장된 뷰가 없습니다.</p>
                ) : (
                  savedFilters.map((savedFilter) => (
                    <button
                      key={savedFilter.id}
                      type="button"
                      onClick={() => handleApplySavedFilter(savedFilter)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                        selectedViewId === savedFilter.id
                          ? 'border-blue-200 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <p className="font-medium">{savedFilter.name}</p>
                      <p className="mt-1 text-[11px]">
                        {buildFilterSummaryText(toFilterValueFromSavedView(savedFilter))}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            intent="neutral"
            size="sm"
            onClick={toggleSelectAll}
            disabled={candidateRows.length === 0}
          >
            {allChecked ? '전체 해제' : '전체 선택'}
          </Button>
          <Button
            size="sm"
            onClick={handleCreateBatch}
            disabled={selectedOrderIds.length === 0 || isBusy}
          >
            선택 주문으로 배치 생성
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          {selectedOrderIds.length === 0 ? (
            <p>주문을 선택하면 수량/차단 조건을 자동으로 검증합니다.</p>
          ) : previewMutation.isPending ? (
            <p>선택 주문을 자동 검증 중입니다...</p>
          ) : previewErrorMessage ? (
            <p className="text-red-600">자동 검증 실패: {previewErrorMessage}</p>
          ) : hasFreshPreview ? (
            <p>
              자동 검증 결과: 통과 {summary.previewValidCount}건 · 차단 {summary.previewBlockedCount}
              건
            </p>
          ) : (
            <p>자동 검증 결과를 준비하고 있습니다.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">자동 스냅샷 번호</p>
            <Input
              value={autoBatchTitle}
              readOnly
              placeholder="자동 생성 스냅샷 번호"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">선택 주문 프로젝트 요약(자동)</p>
            <Input
              value={selectedProjectSummary}
              readOnly
              placeholder="선택 주문 없음"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">배치 메모(선택)</p>
            <Textarea
              rows={2}
              value={batchNotes}
              onChange={(event) => setBatchNotes(event.target.value)}
              placeholder="배치 메모(선택)"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          스냅샷 번호는 `YYMMDD + 일일 순번` 형식으로 자동 부여됩니다. (예: 26032401)
        </p>

        {candidatesQuery.isLoading ? (
          <div className="py-8">
            <Loading text="제작 후보 주문을 불러오는 중입니다." />
          </div>
        ) : candidateRows.length === 0 ? (
          <EmptyState
            title="선택 가능한 제작 후보 주문이 없습니다."
            description="필터를 변경하거나 주문 상태를 확인해 주세요."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" checked={allChecked} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">입금자</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">프로젝트</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">캠페인</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">구성</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">주문금액</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">주문일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {candidateRows.map((row) => {
                  const checked = selectedOrderIds.includes(row.order_id);
                  return (
                    <tr key={row.order_id} className={checked ? 'bg-blue-50/60' : ''}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOrderSelection(row.order_id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{row.order_no}</p>
                        <p className="text-xs text-gray-500">{row.order_id}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.depositor_name || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.project_name || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.campaign_name || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{resolveComposition(row)}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatCurrency(row.grand_total)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatDate(row.placed_at || row.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">2) 제작 배치 목록/상세</h2>
          <p className="text-sm text-gray-600">
            준비중 - 제작중 - 제작 완료 흐름으로 관리하며, 상세에서 전이 결과를 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600" htmlFor="production-status-filter">
            상태 필터
          </label>
          <select
            id="production-status-filter"
            className="h-11 rounded-lg border border-gray-200 px-3 text-sm"
            value={batchStatusFilter}
            onChange={(event) =>
              setBatchStatusFilter(
                (event.target.value as V2AdminProductionBatchStatus) || '',
              )
            }
          >
            <option value="">전체</option>
            <option value="DRAFT">준비중</option>
            <option value="ACTIVE">제작중</option>
            <option value="COMPLETED">제작 완료</option>
            <option value="CANCELED">취소됨</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">배치번호</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">상태</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">주문수</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">수량합</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(batchesQuery.data?.items || []).map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer ${selectedBatchId === row.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedBatchId(row.id)}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{row.batch_no}</p>
                      <p className="text-xs text-gray-500">{row.title}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge intent={resolveBatchIntent(row.status)}>
                        {resolveBatchStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {row.order_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {row.item_quantity_total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            {!selectedBatchId ? (
              <EmptyState
                title="배치를 선택해 주세요."
                description="좌측 목록에서 배치를 선택하면 주문 스냅샷과 집계를 확인할 수 있습니다."
              />
            ) : batchDetailQuery.isLoading ? (
              <div className="py-8">
                <Loading text="배치 상세를 불러오는 중입니다." />
              </div>
            ) : !selectedBatch ? (
              <EmptyState title="배치 상세를 불러오지 못했습니다." />
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-500">선택 배치</p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {String(selectedBatch.batch_no || '-')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {String(selectedBatch.title || '-')}
                  </p>
                  <div className="mt-2">
                    <Badge
                      intent={resolveBatchIntent(
                        selectedBatch.status as V2AdminProductionBatchStatus,
                      )}
                    >
                      {resolveBatchStatusLabel(String(selectedBatch.status || '-'))}
                    </Badge>
                  </div>
                </div>

                <Input
                  value={batchActionReason}
                  onChange={(event) => setBatchActionReason(event.target.value)}
                  placeholder="액션 사유(선택)"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {(selectedBatch.status as V2AdminProductionBatchStatus) === 'DRAFT' && (
                    <Button onClick={handleActivateBatch} disabled={isBusy}>
                      배치 시작(제작중)
                    </Button>
                  )}
                  {(selectedBatch.status as V2AdminProductionBatchStatus) === 'ACTIVE' && (
                    <Button onClick={handleCompleteBatch} disabled={isBusy}>
                      제작 완료 처리
                    </Button>
                  )}
                  {((selectedBatch.status as V2AdminProductionBatchStatus) === 'DRAFT' ||
                    (selectedBatch.status as V2AdminProductionBatchStatus) === 'ACTIVE') && (
                    <Button intent="danger" onClick={handleCancelBatch} disabled={isBusy}>
                      배치 취소
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                  <p>생성일: {formatDate(String(selectedBatch.created_at || ''))}</p>
                  <p>활성화일: {formatDate(String(selectedBatch.activated_at || ''))}</p>
                  <p>완료일: {formatDate(String(selectedBatch.completed_at || ''))}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {detail && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(detail.orders || []).map((row) => {
                    const productionState = resolveProductionOrderState({
                      transition_activate_status: row.transition_activate_status,
                      transition_complete_status: row.transition_complete_status,
                      error_message: row.error_message,
                    });

                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-900">{row.order_no}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <Badge intent={productionState.intent}>
                              {productionState.label}
                            </Badge>
                            {productionState.description && (
                              <p
                                className={
                                  productionState.intent === 'error'
                                    ? 'text-xs text-red-600'
                                    : 'text-xs text-gray-500'
                                }
                              >
                                {productionState.description}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">상품</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">옵션</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(detail.aggregates || []).map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-900">{row.product_name}</td>
                      <td className="px-3 py-2 text-gray-700">{row.variant_name || '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {row.quantity_total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
