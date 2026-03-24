'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2AdminProductionBatchStatus,
  V2AdminTransitionResult,
} from '@/lib/client/api/v2-admin-production.api';
import {
  useV2AdminActivateProductionBatch,
  useV2AdminCancelProductionBatch,
  useV2AdminCompleteProductionBatch,
  useV2AdminCreateProductionBatch,
  useV2AdminPreviewProductionBatch,
  useV2AdminProductionBatchDetail,
  useV2AdminProductionBatches,
  useV2AdminProductionCandidates,
} from '@/lib/client/hooks/useV2AdminProduction';
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

function resolveTransitionIntent(status: V2AdminTransitionResult) {
  if (status === 'SUCCEEDED') {
    return 'success' as const;
  }
  if (status === 'FAILED') {
    return 'error' as const;
  }
  if (status === 'PENDING') {
    return 'warning' as const;
  }
  return 'default' as const;
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

const PRODUCTION_CANDIDATE_FILTER_STORAGE_KEY =
  'lucent.admin.production.candidate.saved-filters.v1';
const PRODUCTION_CANDIDATE_LAST_FILTER_STORAGE_KEY =
  'lucent.admin.production.candidate.last-filter.v1';
const MAX_SAVED_PRODUCTION_FILTERS = 12;

type ProductionCandidateFilterValue = {
  keyword: string;
  projectId: string;
  campaignId: string;
  dateFrom: string;
  dateTo: string;
};

type SavedProductionCandidateFilter = {
  id: string;
  name: string;
  createdAt: string;
  values: ProductionCandidateFilterValue;
};

function readSavedProductionCandidateFilters(): SavedProductionCandidateFilter[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const rawSavedFilters = window.localStorage.getItem(
    PRODUCTION_CANDIDATE_FILTER_STORAGE_KEY,
  );
  if (!rawSavedFilters) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawSavedFilters) as SavedProductionCandidateFilter[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((row) => row && typeof row.id === 'string');
  } catch {
    window.localStorage.removeItem(PRODUCTION_CANDIDATE_FILTER_STORAGE_KEY);
    return [];
  }
}

function readLastProductionCandidateFilter(): ProductionCandidateFilterValue {
  const emptyFilter: ProductionCandidateFilterValue = {
    keyword: '',
    projectId: '',
    campaignId: '',
    dateFrom: '',
    dateTo: '',
  };

  if (typeof window === 'undefined') {
    return emptyFilter;
  }

  const rawLastFilter = window.localStorage.getItem(
    PRODUCTION_CANDIDATE_LAST_FILTER_STORAGE_KEY,
  );
  if (!rawLastFilter) {
    return emptyFilter;
  }

  try {
    const parsed = JSON.parse(rawLastFilter) as ProductionCandidateFilterValue;
    return {
      keyword: parsed.keyword || '',
      projectId: parsed.projectId || '',
      campaignId: parsed.campaignId || '',
      dateFrom: parsed.dateFrom || '',
      dateTo: parsed.dateTo || '',
    };
  } catch {
    window.localStorage.removeItem(PRODUCTION_CANDIDATE_LAST_FILTER_STORAGE_KEY);
    return emptyFilter;
  }
}

export default function AdminProductionPage() {
  const initialFilterValues = useMemo(() => readLastProductionCandidateFilter(), []);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keywordInput, setKeywordInput] = useState(initialFilterValues.keyword);
  const [projectIdInput, setProjectIdInput] = useState(initialFilterValues.projectId);
  const [campaignIdInput, setCampaignIdInput] = useState(initialFilterValues.campaignId);
  const [dateFromInput, setDateFromInput] = useState(initialFilterValues.dateFrom);
  const [dateToInput, setDateToInput] = useState(initialFilterValues.dateTo);
  const [savedFilters, setSavedFilters] = useState<SavedProductionCandidateFilter[]>(
    () => readSavedProductionCandidateFilters(),
  );
  const [filterNameInput, setFilterNameInput] = useState('');

  const [keyword, setKeyword] = useState(initialFilterValues.keyword);
  const [projectId, setProjectId] = useState(initialFilterValues.projectId);
  const [campaignId, setCampaignId] = useState(initialFilterValues.campaignId);
  const [dateFrom, setDateFrom] = useState(initialFilterValues.dateFrom);
  const [dateTo, setDateTo] = useState(initialFilterValues.dateTo);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchTitle, setBatchTitle] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  const [batchStatusFilter, setBatchStatusFilter] =
    useState<V2AdminProductionBatchStatus | ''>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchActionReason, setBatchActionReason] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useV2AdminProjects();
  const { data: campaigns = [], isLoading: campaignsLoading } = useV2Campaigns();

  const candidatesQuery = useV2AdminProductionCandidates({
    limit: 300,
    keyword: keyword || undefined,
    project_id: projectId || undefined,
    campaign_id: campaignId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
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

  const previewData = previewMutation.data;
  const candidateRows = candidatesQuery.data?.items || [];
  const detail = batchDetailQuery.data;
  const selectedBatch = detail?.batch || null;

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

  const allCandidateIds = candidateRows.map((row) => row.order_id);
  const allChecked =
    candidateRows.length > 0 &&
    selectedOrderIds.length > 0 &&
    selectedOrderIds.length === allCandidateIds.length;

  const isBusy =
    previewMutation.isPending ||
    createBatchMutation.isPending ||
    activateBatchMutation.isPending ||
    completeBatchMutation.isPending ||
    cancelBatchMutation.isPending;

  const summary = useMemo(() => {
    return {
      candidateCount: candidateRows.length,
      selectedCount: selectedOrderIds.length,
      previewValidCount: previewData?.valid_order_count || 0,
      previewBlockedCount: previewData?.blocked_order_count || 0,
      activeBatchCount:
        (batchesQuery.data?.items || []).filter((row) => row.status === 'ACTIVE')
          .length || 0,
    };
  }, [candidateRows.length, selectedOrderIds.length, previewData, batchesQuery.data?.items]);

  useEffect(() => {
    window.localStorage.setItem(
      PRODUCTION_CANDIDATE_FILTER_STORAGE_KEY,
      JSON.stringify(savedFilters),
    );
  }, [savedFilters]);

  const currentFilterInputValue: ProductionCandidateFilterValue = {
    keyword: keywordInput.trim(),
    projectId: projectIdInput,
    campaignId: campaignIdInput,
    dateFrom: dateFromInput,
    dateTo: dateToInput,
  };

  const applyFilterValues = (values: ProductionCandidateFilterValue) => {
    setKeywordInput(values.keyword);
    setProjectIdInput(values.projectId);
    setCampaignIdInput(values.campaignId);
    setDateFromInput(values.dateFrom);
    setDateToInput(values.dateTo);

    setKeyword(values.keyword.trim());
    setProjectId(values.projectId);
    setCampaignId(values.campaignId);
    setDateFrom(values.dateFrom);
    setDateTo(values.dateTo);
    setSelectedOrderIds([]);
    previewMutation.reset();
  };

  const persistLastFilter = (values: ProductionCandidateFilterValue) => {
    window.localStorage.setItem(
      PRODUCTION_CANDIDATE_LAST_FILTER_STORAGE_KEY,
      JSON.stringify(values),
    );
  };

  const setError = (error: unknown) => {
    setMessage(null);
    setErrorMessage(getErrorMessage(error));
  };

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const toggleSelectAll = () => {
    if (allChecked) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds(allCandidateIds);
  };

  const handleSearchApply = () => {
    clearNotice();
    applyFilterValues(currentFilterInputValue);
    persistLastFilter(currentFilterInputValue);
  };

  const handleSearchReset = () => {
    clearNotice();
    const emptyFilter: ProductionCandidateFilterValue = {
      keyword: '',
      projectId: '',
      campaignId: '',
      dateFrom: '',
      dateTo: '',
    };
    applyFilterValues(emptyFilter);
    persistLastFilter(emptyFilter);
  };

  const handleSaveCurrentFilter = () => {
    clearNotice();
    const hasAnyValue = Object.values(currentFilterInputValue).some(
      (value) => value.trim().length > 0,
    );
    if (!hasAnyValue) {
      setErrorMessage('저장할 필터 조건이 없습니다.');
      return;
    }

    const defaultName = `필터 ${new Date().toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const nextFilter: SavedProductionCandidateFilter = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: filterNameInput.trim() || defaultName,
      createdAt: new Date().toISOString(),
      values: currentFilterInputValue,
    };

    setSavedFilters((prev) => [nextFilter, ...prev].slice(0, MAX_SAVED_PRODUCTION_FILTERS));
    setFilterNameInput('');
    setMessage('현재 필터를 저장했습니다.');
  };

  const handleApplySavedFilter = (savedFilter: SavedProductionCandidateFilter) => {
    clearNotice();
    applyFilterValues(savedFilter.values);
    persistLastFilter(savedFilter.values);
    setMessage(`"${savedFilter.name}" 필터를 적용했습니다.`);
  };

  const handleDeleteSavedFilter = (filterId: string) => {
    setSavedFilters((prev) => prev.filter((row) => row.id !== filterId));
  };

  const handlePreview = async () => {
    clearNotice();
    if (selectedOrderIds.length === 0) {
      setErrorMessage('미리보기할 주문을 먼저 선택해 주세요.');
      return;
    }

    try {
      await previewMutation.mutateAsync({ order_ids: selectedOrderIds });
      setMessage('제작 배치 미리보기를 생성했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleCreateBatch = async () => {
    clearNotice();
    if (!batchTitle.trim()) {
      setErrorMessage('배치 제목을 입력해 주세요.');
      return;
    }
    if (selectedOrderIds.length === 0) {
      setErrorMessage('배치에 포함할 주문을 먼저 선택해 주세요.');
      return;
    }

    try {
      const created = await createBatchMutation.mutateAsync({
        title: batchTitle.trim(),
        order_ids: selectedOrderIds,
        notes: batchNotes.trim() || null,
      });
      const nextBatchId = typeof created.batch?.id === 'string' ? created.batch.id : null;
      if (nextBatchId) {
        setSelectedBatchId(nextBatchId);
      }

      setBatchTitle('');
      setBatchNotes('');
      setSelectedOrderIds([]);
      previewMutation.reset();
      setMessage('제작 배치를 생성했습니다.');
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
          <p className="text-xs text-gray-500">미리보기 통과</p>
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
            PAYMENT_CONFIRMED 주문만 표시됩니다. 선택한 주문으로 제작 배치 미리보기와
            생성을 진행합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <Input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="주문번호/입금자명/프로젝트/캠페인"
            className="md:col-span-2"
          />
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
          <Input
            type="date"
            value={dateFromInput}
            onChange={(event) => setDateFromInput(event.target.value)}
          />
          <Input
            type="date"
            value={dateToInput}
            onChange={(event) => setDateToInput(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button intent="neutral" onClick={handleSearchApply}>
            검색 적용
          </Button>
          <Button intent="neutral" onClick={handleSearchReset}>
            필터 초기화
          </Button>
          <Input
            value={filterNameInput}
            onChange={(event) => setFilterNameInput(event.target.value)}
            placeholder="필터 이름 (예: 미루루 프로젝트)"
            className="w-full sm:max-w-xs"
          />
          <Button intent="neutral" onClick={handleSaveCurrentFilter}>
            현재 필터 저장
          </Button>
        </div>

        {savedFilters.length > 0 && (
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-600">저장된 필터 그룹</p>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((savedFilter) => (
                <div key={savedFilter.id} className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1">
                  <button
                    type="button"
                    className="text-xs font-medium text-gray-700 hover:text-gray-900"
                    onClick={() => handleApplySavedFilter(savedFilter)}
                  >
                    {savedFilter.name}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-red-500"
                    onClick={() => handleDeleteSavedFilter(savedFilter.id)}
                    aria-label={`${savedFilter.name} 필터 삭제`}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          마지막 적용 필터는 자동 저장되며, 다음 접속 시 동일 조건으로 복원됩니다.
        </p>

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
            intent="neutral"
            size="sm"
            onClick={handlePreview}
            disabled={selectedOrderIds.length === 0 || isBusy}
          >
            미리보기 생성
          </Button>
          <Button
            size="sm"
            onClick={handleCreateBatch}
            disabled={selectedOrderIds.length === 0 || !batchTitle.trim() || isBusy}
          >
            선택 주문으로 배치 생성
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Input
            value={batchTitle}
            onChange={(event) => setBatchTitle(event.target.value)}
            placeholder="예: 3월 4주차 응원봉 제작"
          />
          <Textarea
            rows={2}
            value={batchNotes}
            onChange={(event) => setBatchNotes(event.target.value)}
            placeholder="배치 메모(선택)"
          />
        </div>

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
          <h2 className="text-lg font-semibold text-gray-900">2) 배치 미리보기</h2>
          <p className="text-sm text-gray-600">
            옵션(variant) 단위 수량 집계를 확인하고, 차단 주문 여부를 먼저 확인하세요.
          </p>
        </div>

        {!previewData ? (
          <EmptyState
            title="아직 미리보기가 없습니다."
            description="후보 주문을 선택한 뒤 미리보기 생성을 실행해 주세요."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">요청 주문</p>
                <p className="text-xl font-semibold text-gray-900">
                  {previewData.requested_order_count}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-600">통과 주문</p>
                <p className="text-xl font-semibold text-emerald-700">
                  {previewData.valid_order_count}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-600">차단 주문</p>
                <p className="text-xl font-semibold text-red-700">
                  {previewData.blocked_order_count}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">상품</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">옵션</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">수량 합</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      주문 건수
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(previewData.aggregates || []).map((row, index) => (
                    <tr key={`${row.variant_id || 'no-variant'}-${index}`}>
                      <td className="px-3 py-2 text-gray-900">{row.product_name}</td>
                      <td className="px-3 py-2 text-gray-700">{row.variant_name || '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {row.quantity_total.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {row.order_count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(previewData.blocked_rows || []).length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">차단 주문</p>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {previewData.blocked_rows.map((row) => (
                    <li key={`${row.order_id}-${row.reason}`}>
                      {row.order_no || row.order_id}: {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">3) 제작 배치 목록/상세</h2>
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
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Activate
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Complete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(detail.orders || []).map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-900">{row.order_no}</td>
                      <td className="px-3 py-2">
                        <Badge intent={resolveTransitionIntent(row.transition_activate_status)}>
                          {row.transition_activate_status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge intent={resolveTransitionIntent(row.transition_complete_status)}>
                          {row.transition_complete_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
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
