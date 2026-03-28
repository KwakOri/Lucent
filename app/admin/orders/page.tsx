'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import type {
  V2AdminOrderLinearStage,
  V2AdminOrderLinearTransitionResult,
  V2AdminOrderQueueRow,
} from '@/lib/client/api/v2-admin-ops.api';
import {
  useV2AdminOrderLinearTransitionExecute,
  useV2AdminOrderLinearTransitionPreview,
  useV2AdminOrderQueue,
} from '@/lib/client/hooks/useV2AdminOps';

type V2OrderStageTab = 'ALL' | 'CANCELED' | V2AdminOrderLinearStage;
type V2OrderRowStage = 'CANCELED' | V2AdminOrderLinearStage;

type TransitionExecuteLog = Record<string, unknown>;

function formatCurrency(amount: number): string {
  return `${Math.max(0, amount).toLocaleString()}원`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateMiddle(value: string, front = 8, back = 4): string {
  if (value.length <= front + back + 1) {
    return value;
  }
  return `${value.slice(0, front)}...${value.slice(-back)}`;
}

function compositionBadgeClass(type: 'BUNDLE' | 'DIGITAL' | 'PHYSICAL') {
  if (type === 'BUNDLE') {
    return 'bg-indigo-100 text-indigo-700';
  }
  if (type === 'DIGITAL') {
    return 'bg-sky-100 text-sky-700';
  }
  return 'bg-orange-100 text-orange-700';
}

function linearStageLabel(stage: V2AdminOrderLinearStage): string {
  if (stage === 'PAYMENT_PENDING') {
    return '입금 대기';
  }
  if (stage === 'PAYMENT_CONFIRMED') {
    return '입금 확인';
  }
  if (stage === 'PRODUCTION') {
    return '제작중';
  }
  if (stage === 'READY_TO_SHIP') {
    return '배송 대기';
  }
  if (stage === 'IN_TRANSIT') {
    return '배송 중';
  }
  return '배송 완료';
}

function orderStageTabLabel(stage: V2OrderStageTab): string {
  if (stage === 'ALL') {
    return '전체';
  }
  if (stage === 'CANCELED') {
    return '취소';
  }
  return linearStageLabel(stage);
}

function isCanceledStatus(status: string): boolean {
  return status.toUpperCase().includes('CANCEL');
}

function isCanceledOrder(row: V2AdminOrderQueueRow): boolean {
  return (
    isCanceledStatus(String(row.order_status || '')) ||
    isCanceledStatus(String(row.payment_status || '')) ||
    isCanceledStatus(String(row.fulfillment_status || ''))
  );
}

function resolveLinearStageFromRow(row: V2AdminOrderQueueRow): V2AdminOrderLinearStage {
  const orderStatus = String(row.order_status || '').toUpperCase();
  const paymentStatus = String(row.payment_status || '').toUpperCase();
  const fulfillmentStatus = String(row.fulfillment_status || '').toUpperCase();
  if (paymentStatus === 'AUTHORIZED') {
    return 'PAYMENT_CONFIRMED';
  }
  const isPaymentCaptured = ['CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(paymentStatus);
  if (!isPaymentCaptured) {
    return 'PAYMENT_PENDING';
  }

  if (row.has_physical) {
    const waiting = Number(row.waiting_shipment_count || 0);
    const inTransit = Number(row.in_transit_shipment_count || 0);
    const delivered = Number(row.delivered_shipment_count || 0);

    if (inTransit > 0) {
      return 'IN_TRANSIT';
    }
    if (waiting > 0) {
      return 'READY_TO_SHIP';
    }
    if (delivered > 0 && waiting === 0 && inTransit === 0) {
      const isOrderOrFulfillmentCompleted =
        orderStatus === 'COMPLETED' || fulfillmentStatus === 'FULFILLED';
      if (row.has_digital && !isOrderOrFulfillmentCompleted) {
        return 'IN_TRANSIT';
      }
      return 'DELIVERED';
    }
    if (orderStatus === 'COMPLETED' || fulfillmentStatus === 'FULFILLED') {
      return 'DELIVERED';
    }
    return 'PRODUCTION';
  }

  if (row.has_digital) {
    if (orderStatus === 'COMPLETED' || fulfillmentStatus === 'FULFILLED') {
      return 'DELIVERED';
    }
    return 'PRODUCTION';
  }

  if (orderStatus === 'COMPLETED') {
    return 'DELIVERED';
  }

  return 'PRODUCTION';
}

function resolveStageTabFromRow(row: V2AdminOrderQueueRow): V2OrderRowStage {
  if (isCanceledOrder(row)) {
    return 'CANCELED';
  }
  return resolveLinearStageFromRow(row);
}

function getNextLinearStage(stage: V2AdminOrderLinearStage): V2AdminOrderLinearStage | null {
  if (stage === 'PAYMENT_PENDING') {
    return 'PAYMENT_CONFIRMED';
  }
  if (stage === 'PAYMENT_CONFIRMED') {
    return 'PRODUCTION';
  }
  if (stage === 'PRODUCTION') {
    return 'READY_TO_SHIP';
  }
  if (stage === 'READY_TO_SHIP') {
    return 'IN_TRANSIT';
  }
  if (stage === 'IN_TRANSIT') {
    return 'DELIVERED';
  }
  return null;
}

function linearStageIndex(stage: V2AdminOrderLinearStage): number {
  return LINEAR_STAGE_OPTIONS.indexOf(stage);
}

function readLogString(log: TransitionExecuteLog, key: string): string | null {
  const value = log[key];
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function summarizeFailedLog(log: TransitionExecuteLog): string {
  const errorCode = readLogString(log, 'error_code') || 'UNKNOWN_ERROR';
  const errorMessage = readLogString(log, 'error_message') || '상세 메시지 없음';
  return `${errorCode}: ${errorMessage}`;
}

const LINEAR_STAGE_OPTIONS: V2AdminOrderLinearStage[] = [
  'PAYMENT_PENDING',
  'PAYMENT_CONFIRMED',
  'PRODUCTION',
  'READY_TO_SHIP',
  'IN_TRANSIT',
  'DELIVERED',
];

const LINEAR_STAGE_TABS: Array<{
  key: V2OrderStageTab;
  label: string;
}> = [
  { key: 'PAYMENT_PENDING', label: orderStageTabLabel('PAYMENT_PENDING') },
  { key: 'PAYMENT_CONFIRMED', label: orderStageTabLabel('PAYMENT_CONFIRMED') },
  { key: 'PRODUCTION', label: orderStageTabLabel('PRODUCTION') },
  { key: 'READY_TO_SHIP', label: orderStageTabLabel('READY_TO_SHIP') },
  { key: 'IN_TRANSIT', label: orderStageTabLabel('IN_TRANSIT') },
  { key: 'DELIVERED', label: orderStageTabLabel('DELIVERED') },
  { key: 'CANCELED', label: orderStageTabLabel('CANCELED') },
  { key: 'ALL', label: orderStageTabLabel('ALL') },
];

const ORDER_PAGE_SIZE = 10;

export default function AdminOrdersPage() {
  const [stageTab, setStageTab] = useState<V2OrderStageTab>('PAYMENT_PENDING');
  const [showManualTransition, setShowManualTransition] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [targetStage, setTargetStage] = useState<V2AdminOrderLinearStage>('PRODUCTION');
  const [transitionReason, setTransitionReason] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [transitionResult, setTransitionResult] =
    useState<V2AdminOrderLinearTransitionResult | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useV2AdminOrderQueue({
    limit: 1000,
  });
  const previewTransition = useV2AdminOrderLinearTransitionPreview();
  const executeTransition = useV2AdminOrderLinearTransitionExecute();

  const stageCounts = useMemo(() => {
    const counts: Record<V2OrderStageTab, number> = {
      ALL: 0,
      CANCELED: 0,
      PAYMENT_PENDING: 0,
      PAYMENT_CONFIRMED: 0,
      PRODUCTION: 0,
      READY_TO_SHIP: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
    };

    for (const item of data?.items || []) {
      const stage = resolveStageTabFromRow(item);
      counts.ALL += 1;
      counts[stage] += 1;
    }

    return counts;
  }, [data?.items]);

  const filteredRows = useMemo(() => {
    const items = data?.items || [];
    const stageFiltered =
      stageTab === 'ALL'
        ? items
        : items.filter((item) => resolveStageTabFromRow(item) === stageTab);

    if (!search.trim()) {
      return stageFiltered;
    }
    const keyword = search.trim().toLowerCase();
    return stageFiltered.filter(
      (item) =>
        item.order_no.toLowerCase().includes(keyword) ||
        String(item.depositor_name || '')
          .toLowerCase()
          .includes(keyword) ||
        item.order_id.toLowerCase().includes(keyword),
    );
  }, [data?.items, search, stageTab]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / ORDER_PAGE_SIZE)),
    [filteredRows.length],
  );

  const currentPageClamped = Math.min(currentPage, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPageClamped - 1) * ORDER_PAGE_SIZE;
    return filteredRows.slice(start, start + ORDER_PAGE_SIZE);
  }, [currentPageClamped, filteredRows]);

  const visibleOrderIdSet = useMemo(() => new Set(pagedRows.map((row) => row.order_id)), [pagedRows]);
  const effectiveSelectedOrderIds = useMemo(
    () => selectedOrderIds.filter((id) => visibleOrderIdSet.has(id)),
    [selectedOrderIds, visibleOrderIdSet],
  );

  const recommendedNextStage = useMemo(() => {
    if (stageTab === 'ALL' || stageTab === 'CANCELED') {
      return null;
    }
    return getNextLinearStage(stageTab);
  }, [stageTab]);

  function handleStageTabChange(nextTab: V2OrderStageTab) {
    setStageTab(nextTab);
    setCurrentPage(1);
    const nextStage =
      nextTab === 'ALL' || nextTab === 'CANCELED' ? null : getNextLinearStage(nextTab);
    if (nextStage) {
      setTargetStage(nextStage);
    }
  }

  const selectedIdSet = useMemo(
    () => new Set(effectiveSelectedOrderIds),
    [effectiveSelectedOrderIds],
  );
  const allVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedIdSet.has(row.order_id));

  const canSubmitTransition =
    effectiveSelectedOrderIds.length > 0 &&
    !previewTransition.isPending &&
    !executeTransition.isPending;
  const canRunNextStage = canSubmitTransition && recommendedNextStage !== null;

  function buildTransitionPayload(stage: V2AdminOrderLinearStage) {
    return {
      order_ids: effectiveSelectedOrderIds,
      target_stage: stage,
      reason: transitionReason.trim() || null,
    };
  }

  async function handlePreviewTransition(stage: V2AdminOrderLinearStage = targetStage) {
    if (effectiveSelectedOrderIds.length === 0) {
      setTransitionMessage('주문을 1건 이상 선택해 주세요.');
      return;
    }

    try {
      const result = await previewTransition.mutateAsync(buildTransitionPayload(stage));
      setTransitionResult(result);
      setTransitionMessage(
        `미리보기 완료(${linearStageLabel(stage)}): 실행 가능 ${result.summary.executable_order_count}건 / 차단 ${result.summary.blocked_order_count}건`,
      );
    } catch (previewError) {
      setTransitionMessage(
        previewError instanceof Error
          ? previewError.message
          : '미리보기 실행 중 오류가 발생했습니다.',
      );
    }
  }

  async function handleExecuteTransition(stage: V2AdminOrderLinearStage = targetStage) {
    if (effectiveSelectedOrderIds.length === 0) {
      setTransitionMessage('주문을 1건 이상 선택해 주세요.');
      return;
    }

    try {
      const payload = buildTransitionPayload(stage);
      const hasBackwardSelection = pagedRows.some((row) => {
        if (!effectiveSelectedOrderIds.includes(row.order_id)) {
          return false;
        }
        const currentStage = resolveStageTabFromRow(row);
        if (currentStage === 'CANCELED') {
          return false;
        }
        return linearStageIndex(stage) < linearStageIndex(currentStage);
      });

      if (hasBackwardSelection) {
        const previewForWarning = await previewTransition.mutateAsync(payload);
        setTransitionResult(previewForWarning);

        const warningRows = previewForWarning.rows.filter(
          (row) => row.warning_reasons.length > 0,
        );
        if (warningRows.length > 0) {
          const warningLines = warningRows
            .slice(0, 5)
            .map((row) => `${row.order_no || row.order_id}: ${row.warning_reasons.join(' / ')}`)
            .join('\n');

          window.alert(
            `강제 롤백 경고\n\n${warningLines}\n\n위 이력이 있어도 강제 롤백이 진행됩니다.`,
          );
        }
      }

      const confirmed = window.confirm(
        `선택한 ${effectiveSelectedOrderIds.length}건 주문을 "${linearStageLabel(stage)}" 단계로 전환할까요?`,
      );
      if (!confirmed) {
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.info('[admin/orders] transition execute payload', payload);
      }

      const result = await executeTransition.mutateAsync(payload);
      setTransitionResult(result);

      const executeLogs = result.execute?.logs || [];
      const failedLogs = executeLogs.filter(
        (log) => readLogString(log, 'status') === 'FAILED',
      );

      if (process.env.NODE_ENV !== 'production') {
        console.info('[admin/orders] transition execute result', {
          target_stage: stage,
          summary: result.summary,
          execute: result.execute,
          failed_logs: failedLogs,
        });
      }

      const firstBlockedReason =
        result.rows.find((row) => row.blocked_reasons.length > 0)?.blocked_reasons[0] || null;
      const hasBlockedWithoutExecution =
        (result.execute?.attempted_action_count ?? 0) === 0 &&
        result.summary.blocked_order_count > 0;
      const hasNoopWithoutBlock =
        (result.execute?.attempted_action_count ?? 0) === 0 &&
        result.summary.blocked_order_count === 0;

      if (failedLogs.length > 0) {
        setTransitionMessage(
          `실행 완료(${linearStageLabel(stage)}): 성공 ${result.execute?.succeeded_count ?? 0}건 / 실패 ${result.execute?.failed_count ?? 0}건 · 첫 실패 ${summarizeFailedLog(failedLogs[0])}`,
        );
      } else if (hasBlockedWithoutExecution) {
        setTransitionMessage(
          `실행 대상 없음(${linearStageLabel(stage)}): 실행 가능 주문이 없습니다. ${firstBlockedReason ? `차단 사유: ${firstBlockedReason}` : ''}`,
        );
      } else if (hasNoopWithoutBlock) {
        setTransitionMessage(
          `실행 대상 없음(${linearStageLabel(stage)}): 선택한 주문이 이미 목표 단계이거나 변경이 필요하지 않습니다.`,
        );
      } else {
        setTransitionMessage(
          `실행 완료(${linearStageLabel(stage)}): 성공 ${result.execute?.succeeded_count ?? 0}건 / 실패 ${result.execute?.failed_count ?? 0}건`,
        );
      }
      await refetch();
    } catch (executeError) {
      setTransitionMessage(
        executeError instanceof Error
          ? executeError.message
          : '전환 실행 중 오류가 발생했습니다.',
      );
    }
  }

  function toggleOrderSelection(orderId: string) {
    setSelectedOrderIds((prev) => {
      const visibleSelected = prev.filter((id) => visibleOrderIdSet.has(id));
      return visibleSelected.includes(orderId)
        ? visibleSelected.filter((id) => id !== orderId)
        : [...visibleSelected, orderId];
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleOrderIdSet.has(id)));
      return;
    }

    setSelectedOrderIds((prev) => {
      const merged = new Set(prev.filter((id) => visibleOrderIdSet.has(id)));
      for (const row of pagedRows) {
        merged.add(row.order_id);
      }
      return Array.from(merged);
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh]">
        <EmptyState
          title="주문 큐를 불러오지 못했습니다"
          description={error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'}
          action={
            <Button
              intent="primary"
              size="sm"
              onClick={() => {
                void refetch();
              }}
            >
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">주문 운영 큐 (v2)</h1>
        <p className="mt-1 text-sm text-gray-500">
          단계와 상품 종류 중심으로 운영 대상을 확인합니다.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {LINEAR_STAGE_TABS.map((tab) => {
            const isActive = stageTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStageTabChange(tab.key)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {stageCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="주문번호 / 주문 ID / 입금자명 검색"
          />
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600">선형 단계 일괄 전환</p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              intent="primary"
              size="md"
              loading={executeTransition.isPending}
              disabled={!canRunNextStage}
              onClick={() => {
                if (!recommendedNextStage) {
                  return;
                }
                void handleExecuteTransition(recommendedNextStage);
              }}
            >
              {recommendedNextStage
                ? `다음 단계 실행 (${linearStageLabel(recommendedNextStage)})`
                : '다음 단계 없음'}
            </Button>
            <Button
              intent="secondary"
              size="md"
              className="ml-auto"
              onClick={() => setShowManualTransition((prev) => !prev)}
            >
              {showManualTransition ? '임의 단계 변경 닫기' : '임의 단계 변경'}
            </Button>
          </div>
          {showManualTransition ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[180px_1fr_auto_auto]">
                <select
                  value={targetStage}
                  onChange={(event) =>
                    setTargetStage(event.target.value as V2AdminOrderLinearStage)
                  }
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                >
                  {LINEAR_STAGE_OPTIONS.map((stage) => (
                    <option key={stage} value={stage}>
                      {linearStageLabel(stage)}
                    </option>
                  ))}
                </select>
                <Input
                  value={transitionReason}
                  onChange={(event) => setTransitionReason(event.target.value)}
                  placeholder="전환 사유(선택, 기본값은 현재 탭의 다음 단계)"
                />
                <Button
                  intent="secondary"
                  size="sm"
                  loading={previewTransition.isPending}
                  disabled={!canSubmitTransition}
                  onClick={() => void handlePreviewTransition(targetStage)}
                >
                  미리보기
                </Button>
                <Button
                  intent="secondary"
                  size="sm"
                  loading={executeTransition.isPending}
                  disabled={!canSubmitTransition}
                  onClick={() => void handleExecuteTransition(targetStage)}
                >
                  선택 단계 실행
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                선택 주문: {effectiveSelectedOrderIds.length}건 · 목표 단계:{' '}
                {linearStageLabel(targetStage)}
              </p>
            </>
          ) : null}
          {transitionMessage ? (
            <p className="mt-2 text-xs font-medium text-gray-700">{transitionMessage}</p>
          ) : null}
        </div>
      </section>

      {transitionResult ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-800">
            전환 {transitionResult.mode === 'PREVIEW' ? '미리보기' : '실행'} 결과
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            요청 {transitionResult.summary.requested_order_count}건 · 실행 가능{' '}
            {transitionResult.summary.executable_order_count}건 · 액션{' '}
            {transitionResult.summary.total_action_count}건
          </p>
          {transitionResult.execute ? (
            <p className="mt-1 text-xs text-gray-600">
              실행 요약: 성공 {transitionResult.execute.succeeded_count} · 실패{' '}
              {transitionResult.execute.failed_count} · 승인대기{' '}
              {transitionResult.execute.pending_approval_count}
            </p>
          ) : null}
          {transitionResult.execute?.logs?.length ? (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700">실행 로그</p>
              <div className="mt-2 space-y-1">
                {transitionResult.execute.logs.map((log, index) => {
                  const status = readLogString(log, 'status') || 'UNKNOWN';
                  const actionKey = readLogString(log, 'action_key') || '-';
                  const orderNo =
                    readLogString(log, 'order_no') ||
                    readLogString(log, 'order_id') ||
                    '-';
                  const errorCode = readLogString(log, 'error_code');
                  const errorMessage = readLogString(log, 'error_message');

                  return (
                    <div
                      key={`${actionKey}-${orderNo}-${index}`}
                      className={`rounded border px-2 py-1 text-[11px] ${
                        status === 'FAILED'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : status === 'PENDING_APPROVAL'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      [{status}] {orderNo} · {actionKey}
                      {errorCode || errorMessage
                        ? ` · ${errorCode || 'ERROR'}${errorMessage ? `: ${errorMessage}` : ''}`
                        : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {filteredRows.length === 0 ? (
          <EmptyState
            title="조회된 주문이 없습니다"
            description="필터 조건을 변경해 다시 조회해 보세요."
          />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">주문</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">입금자명</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">단계</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">금액</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">상품 종류</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">주문시각</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.map((row) => {
                  const hasBundle = row.has_bundle === true;
                  const hasDigital = row.has_digital === true;
                  const hasPhysical = row.has_physical === true;
                  const currentStageTab = resolveStageTabFromRow(row);
                  const stageBadgeClassName =
                    currentStageTab === 'CANCELED'
                      ? 'rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700'
                      : 'rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700';

                  return (
                    <tr key={row.order_id}>
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIdSet.has(row.order_id)}
                          onChange={() => toggleOrderSelection(row.order_id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{row.order_no}</p>
                        <p className="text-xs text-gray-500" title={row.order_id}>
                          {truncateMiddle(row.order_id)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.depositor_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={stageBadgeClassName}>
                          {orderStageTabLabel(currentStageTab)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(row.grand_total)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {hasBundle ? (
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${compositionBadgeClass(
                                'BUNDLE',
                              )}`}
                            >
                              번들
                            </span>
                          ) : null}
                          {hasDigital ? (
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${compositionBadgeClass(
                                'DIGITAL',
                              )}`}
                            >
                              디지털
                            </span>
                          ) : null}
                          {hasPhysical ? (
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${compositionBadgeClass(
                                'PHYSICAL',
                              )}`}
                            >
                              실물
                            </span>
                          ) : null}
                          {!hasBundle && !hasDigital && !hasPhysical ? (
                            <span className="text-xs text-gray-500">-</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(row.placed_at || row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/orders/${row.order_id}`}>
                          <Button intent="secondary" size="sm">
                            상세 보기
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
            <p className="text-gray-600">
              총 {filteredRows.length}건 · {currentPageClamped}/{totalPages} 페이지
            </p>
            <div className="flex items-center gap-2">
              <Button
                intent="secondary"
                size="sm"
                disabled={currentPageClamped <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </Button>
              <Button
                intent="secondary"
                size="sm"
                disabled={currentPageClamped >= totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
              >
                다음
              </Button>
            </div>
          </div>
          </>
        )}
      </section>

      {transitionResult ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800">주문별 전환 계획</h3>
          <div className="mt-3 space-y-2">
            {transitionResult.rows.map((row) => (
              <div key={`${row.order_id}-${row.target_stage}`} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-semibold text-gray-900">
                  {row.order_no || row.order_id}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {row.current_stage ? linearStageLabel(row.current_stage) : '-'} →{' '}
                  {linearStageLabel(row.target_stage)} · 액션 {row.action_count}건
                </p>
                {row.blocked_reasons.length > 0 ? (
                  <p className="mt-1 text-xs text-red-600">
                    차단 사유: {row.blocked_reasons.join(' / ')}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-emerald-700">실행 가능</p>
                )}
                {row.warning_reasons.length > 0 ? (
                  <p className="mt-1 text-xs text-amber-700">
                    경고: {row.warning_reasons.join(' / ')}
                  </p>
                ) : null}
                {row.actions.length > 0 ? (
                  <p className="mt-1 text-xs text-gray-600">
                    액션: {row.actions.map((action) => action.action_key).join(', ')}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
