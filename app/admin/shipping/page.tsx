'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2AdminShippingBatchStatus,
  V2AdminTransitionResult,
} from '@/lib/client/api/v2-admin-shipping.api';
import {
  useV2AdminActivateShippingBatch,
  useV2AdminCancelShippingBatch,
  useV2AdminCompleteShippingBatch,
  useV2AdminCreateShippingBatch,
  useV2AdminDispatchShippingBatch,
  useV2AdminPreviewShippingBatch,
  useV2AdminSaveShippingBatchPackages,
  useV2AdminShippingBatchDetail,
  useV2AdminShippingBatches,
  useV2AdminShippingCandidates,
} from '@/lib/client/hooks/useV2AdminShipping';

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

function resolveBatchIntent(status: V2AdminShippingBatchStatus) {
  if (status === 'ACTIVE' || status === 'DISPATCHED') {
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

function readSnapshotText(snapshot: Record<string, unknown> | null, key: string): string {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }
  const value = snapshot[key];
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function buildAddressText(snapshot: Record<string, unknown> | null): string {
  const keys = ['line1', 'line2', 'address', 'address1', 'address_1', 'road_address'];
  const values = keys
    .map((key) => readSnapshotText(snapshot, key))
    .filter((value) => value.length > 0);
  return values.join(' ').trim();
}

type PackageDraftRow = {
  carrier_code: string;
  tracking_no: string;
  notes: string;
};

export default function AdminShippingPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchTitle, setBatchTitle] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  const [batchStatusFilter, setBatchStatusFilter] =
    useState<V2AdminShippingBatchStatus | ''>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchActionReason, setBatchActionReason] = useState('');

  const [packageDrafts, setPackageDrafts] = useState<Record<string, PackageDraftRow>>({});

  const candidatesQuery = useV2AdminShippingCandidates({
    limit: 300,
    keyword: keyword || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });
  const batchesQuery = useV2AdminShippingBatches({
    limit: 100,
    status: batchStatusFilter || undefined,
  });
  const batchDetailQuery = useV2AdminShippingBatchDetail(selectedBatchId);

  const previewMutation = useV2AdminPreviewShippingBatch();
  const createBatchMutation = useV2AdminCreateShippingBatch();
  const activateBatchMutation = useV2AdminActivateShippingBatch();
  const savePackagesMutation = useV2AdminSaveShippingBatchPackages();
  const dispatchBatchMutation = useV2AdminDispatchShippingBatch();
  const completeBatchMutation = useV2AdminCompleteShippingBatch();
  const cancelBatchMutation = useV2AdminCancelShippingBatch();

  const previewData = previewMutation.data;
  const candidateRows = candidatesQuery.data?.items || [];
  const detail = batchDetailQuery.data;
  const selectedBatch = detail?.batch || null;

  const allCandidateIds = candidateRows.map((row) => row.order_id);
  const allChecked =
    candidateRows.length > 0 &&
    selectedOrderIds.length > 0 &&
    selectedOrderIds.length === allCandidateIds.length;

  const isBusy =
    previewMutation.isPending ||
    createBatchMutation.isPending ||
    activateBatchMutation.isPending ||
    savePackagesMutation.isPending ||
    dispatchBatchMutation.isPending ||
    completeBatchMutation.isPending ||
    cancelBatchMutation.isPending;

  useEffect(() => {
    if (!detail?.orders) {
      setPackageDrafts({});
      return;
    }

    const nextDrafts: Record<string, PackageDraftRow> = {};
    const packageByBatchOrderId = new Map<string, any>();

    for (const row of detail.packages || []) {
      if (typeof row.batch_order_id === 'string' && !packageByBatchOrderId.has(row.batch_order_id)) {
        packageByBatchOrderId.set(row.batch_order_id, row);
      }
    }

    for (const orderRow of detail.orders || []) {
      const pkg = packageByBatchOrderId.get(orderRow.id);
      nextDrafts[orderRow.id] = {
        carrier_code: typeof pkg?.carrier_code === 'string' ? pkg.carrier_code : '',
        tracking_no: typeof pkg?.tracking_no === 'string' ? pkg.tracking_no : '',
        notes: typeof pkg?.notes === 'string' ? pkg.notes : '',
      };
    }

    setPackageDrafts(nextDrafts);
  }, [detail?.orders, detail?.packages, selectedBatchId]);

  const summary = useMemo(() => {
    return {
      candidateCount: candidateRows.length,
      selectedCount: selectedOrderIds.length,
      previewValidCount: previewData?.valid_order_count || 0,
      previewBlockedCount: previewData?.blocked_order_count || 0,
      activeBatchCount:
        (batchesQuery.data?.items || []).filter((row) =>
          row.status === 'ACTIVE' || row.status === 'DISPATCHED',
        ).length || 0,
    };
  }, [candidateRows.length, selectedOrderIds.length, previewData, batchesQuery.data?.items]);

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
    setKeyword(keywordInput.trim());
    setSelectedOrderIds([]);
  };

  const handlePreview = async () => {
    clearNotice();
    if (selectedOrderIds.length === 0) {
      setErrorMessage('미리보기할 주문을 먼저 선택해 주세요.');
      return;
    }

    try {
      await previewMutation.mutateAsync({ order_ids: selectedOrderIds });
      setMessage('배송 배치 미리보기를 생성했습니다.');
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
      setMessage('배송 배치를 생성했습니다.');
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
      await activateBatchMutation.mutateAsync(selectedBatchId);
      setMessage('배송 배치를 ACTIVE로 전환했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handlePackageDraftChange = (
    batchOrderId: string,
    key: keyof PackageDraftRow,
    value: string,
  ) => {
    setPackageDrafts((prev) => ({
      ...prev,
      [batchOrderId]: {
        carrier_code: prev[batchOrderId]?.carrier_code || '',
        tracking_no: prev[batchOrderId]?.tracking_no || '',
        notes: prev[batchOrderId]?.notes || '',
        [key]: value,
      },
    }));
  };

  const handleSavePackages = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    const packagesPayload = Object.entries(packageDrafts)
      .map(([batchOrderId, draft]) => ({
        batch_order_id: batchOrderId,
        carrier_code: draft.carrier_code || null,
        tracking_no: draft.tracking_no || null,
        notes: draft.notes || null,
      }))
      .filter((row) => row.tracking_no);

    if (packagesPayload.length === 0) {
      setErrorMessage('저장할 운송장 번호를 1개 이상 입력해 주세요.');
      return;
    }

    try {
      await savePackagesMutation.mutateAsync({
        batchId: selectedBatchId,
        data: { packages: packagesPayload },
      });
      setMessage('운송장 정보를 저장했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleDispatchBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await dispatchBatchMutation.mutateAsync({
        batchId: selectedBatchId,
        data: { reason: batchActionReason.trim() || null },
      });
      setMessage('출고 처리를 완료하고 주문을 배송 중으로 이동했습니다.');
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
      setMessage('배송 완료 처리 후 주문을 완료 단계로 이동했습니다.');
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
      setMessage('선택한 배송 배치를 취소했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">배송 관리</h1>
        <p className="text-sm text-gray-600">
          배송 대기 주문을 배치로 묶어 운송장을 등록하고, 출고/배송 완료를 일괄 처리합니다.
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
          <h2 className="text-lg font-semibold text-gray-900">1) 출고 후보 주문 선택</h2>
          <p className="text-sm text-gray-600">
            READY_TO_SHIP 주문만 표시됩니다. 선택한 주문으로 배송 배치 미리보기와 생성을
            진행합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="주문번호/입금자명/주문ID"
            className="md:col-span-2"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <Button intent="neutral" onClick={handleSearchApply}>
            검색 적용
          </Button>
        </div>

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
            placeholder="예: 3월 4주차 출고 1차"
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
            <Loading text="배송 후보 주문을 불러오는 중입니다." />
          </div>
        ) : candidateRows.length === 0 ? (
          <EmptyState
            title="선택 가능한 배송 후보 주문이 없습니다."
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
            출고 후보 주문의 수취인/주소와 포장 수량을 먼저 확인하세요.
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
                    <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">수취인</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">주소</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">품목 수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(previewData.packing_rows || []).map((row) => (
                    <tr key={row.order_id}>
                      <td className="px-3 py-2 text-gray-900">{row.order_no}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.recipient_name || '-'} / {row.recipient_phone || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.address_summary || '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {row.item_count.toLocaleString()}
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
          <h2 className="text-lg font-semibold text-gray-900">3) 배송 배치 목록/상세</h2>
          <p className="text-sm text-gray-600">
            DRAFT - ACTIVE - DISPATCHED - COMPLETED 흐름으로 관리하며, ACTIVE 배치에서
            운송장을 등록합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600" htmlFor="shipping-status-filter">
            상태 필터
          </label>
          <select
            id="shipping-status-filter"
            className="h-11 rounded-lg border border-gray-200 px-3 text-sm"
            value={batchStatusFilter}
            onChange={(event) =>
              setBatchStatusFilter((event.target.value as V2AdminShippingBatchStatus) || '')
            }
          >
            <option value="">전체</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELED">CANCELED</option>
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
                  <th className="px-3 py-2 text-right font-medium text-gray-600">패키지수</th>
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
                      <Badge intent={resolveBatchIntent(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {row.order_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {row.package_count.toLocaleString()}
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
                description="좌측 목록에서 배치를 선택하면 운송장 등록/출고/완료를 진행할 수 있습니다."
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
                        selectedBatch.status as V2AdminShippingBatchStatus,
                      )}
                    >
                      {String(selectedBatch.status || '-')}
                    </Badge>
                  </div>
                </div>

                <Input
                  value={batchActionReason}
                  onChange={(event) => setBatchActionReason(event.target.value)}
                  placeholder="액션 사유(선택)"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {(selectedBatch.status as V2AdminShippingBatchStatus) === 'DRAFT' && (
                    <Button onClick={handleActivateBatch} disabled={isBusy}>
                      배치 활성화(ACTIVE)
                    </Button>
                  )}
                  {(selectedBatch.status as V2AdminShippingBatchStatus) === 'ACTIVE' && (
                    <>
                      <Button intent="neutral" onClick={handleSavePackages} disabled={isBusy}>
                        운송장 저장
                      </Button>
                      <Button onClick={handleDispatchBatch} disabled={isBusy}>
                        출고 실행(DISPATCHED)
                      </Button>
                    </>
                  )}
                  {(selectedBatch.status as V2AdminShippingBatchStatus) === 'DISPATCHED' && (
                    <Button onClick={handleCompleteBatch} disabled={isBusy}>
                      배송 완료(COMPLETED)
                    </Button>
                  )}
                  {((selectedBatch.status as V2AdminShippingBatchStatus) === 'DRAFT' ||
                    (selectedBatch.status as V2AdminShippingBatchStatus) === 'ACTIVE') && (
                    <Button intent="danger" onClick={handleCancelBatch} disabled={isBusy}>
                      배치 취소
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                  <p>생성일: {formatDate(String(selectedBatch.created_at || ''))}</p>
                  <p>출고일: {formatDate(String(selectedBatch.dispatched_at || ''))}</p>
                  <p>완료일: {formatDate(String(selectedBatch.completed_at || ''))}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {detail && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">수취인</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">주소</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Dispatch</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(detail.orders || []).map((row) => {
                    const address = buildAddressText(
                      row.shipping_address_snapshot as Record<string, unknown> | null,
                    );
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-900">{row.order_no}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.recipient_name || '-'} / {row.recipient_phone || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{address || '-'}</td>
                        <td className="px-3 py-2">
                          <Badge intent={resolveTransitionIntent(row.dispatch_transition_status)}>
                            {row.dispatch_transition_status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge intent={resolveTransitionIntent(row.delivery_transition_status)}>
                            {row.delivery_transition_status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(selectedBatch?.status as V2AdminShippingBatchStatus) === 'ACTIVE' && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">택배사</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">운송장번호</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">메모</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(detail.orders || []).map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-900">{row.order_no}</td>
                        <td className="px-3 py-2">
                          <Input
                            value={packageDrafts[row.id]?.carrier_code || ''}
                            onChange={(event) =>
                              handlePackageDraftChange(
                                row.id,
                                'carrier_code',
                                event.target.value,
                              )
                            }
                            placeholder="POST_OFFICE / CJ ..."
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={packageDrafts[row.id]?.tracking_no || ''}
                            onChange={(event) =>
                              handlePackageDraftChange(
                                row.id,
                                'tracking_no',
                                event.target.value,
                              )
                            }
                            placeholder="운송장 번호"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={packageDrafts[row.id]?.notes || ''}
                            onChange={(event) =>
                              handlePackageDraftChange(row.id, 'notes', event.target.value)
                            }
                            placeholder="메모(선택)"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
