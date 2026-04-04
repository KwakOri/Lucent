'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2AdminOrderLinearStage,
  V2AdminOrderLinearTransitionResult,
} from '@/lib/client/api/v2-admin-ops.api';
import {
  useV2AdminOrderLinearTransitionExecute,
  useV2AdminOrderLinearTransitionPreview,
  useV2AdminOrderQueue,
} from '@/lib/client/hooks/useV2AdminOps';
import {
  compositionBadgeClass,
  formatCurrency,
  formatDate,
  isCanceledOrder,
  resolveLinearStageFromRow,
  truncateMiddle,
} from '@/app/admin/orders/order-stage';

type TransitionExecuteLog = Record<string, unknown>;
type TransitionPlan = {
  orderIds: string[];
  targetStage: V2AdminOrderLinearStage;
  reason: string | null;
};

type PaymentConfirmationContentProps = {
  embedded?: boolean;
};

const ORDER_PAGE_SIZE = 10;

function mergeTransitionResults(
  results: V2AdminOrderLinearTransitionResult[],
): V2AdminOrderLinearTransitionResult {
  if (results.length === 0) {
    throw new Error('전환 결과가 없습니다.');
  }
  if (results.length === 1) {
    return results[0];
  }

  const mode = results[0].mode;
  const merged: V2AdminOrderLinearTransitionResult = {
    mode,
    requested_at: new Date().toISOString(),
    target_stage: results[results.length - 1].target_stage,
    summary: {
      requested_order_count: 0,
      found_order_count: 0,
      executable_order_count: 0,
      blocked_order_count: 0,
      total_action_count: 0,
    },
    rows: [],
  };

  for (const result of results) {
    merged.summary.requested_order_count += Number(
      result.summary.requested_order_count || 0,
    );
    merged.summary.found_order_count += Number(result.summary.found_order_count || 0);
    merged.summary.executable_order_count += Number(
      result.summary.executable_order_count || 0,
    );
    merged.summary.blocked_order_count += Number(
      result.summary.blocked_order_count || 0,
    );
    merged.summary.total_action_count += Number(result.summary.total_action_count || 0);
    merged.rows.push(...result.rows);
  }

  if (mode === 'EXECUTE') {
    merged.execute = {
      attempted_action_count: 0,
      succeeded_count: 0,
      pending_approval_count: 0,
      failed_count: 0,
      logs: [],
    };
    for (const result of results) {
      if (!result.execute) {
        continue;
      }
      merged.execute.attempted_action_count += Number(
        result.execute.attempted_action_count || 0,
      );
      merged.execute.succeeded_count += Number(result.execute.succeeded_count || 0);
      merged.execute.pending_approval_count += Number(
        result.execute.pending_approval_count || 0,
      );
      merged.execute.failed_count += Number(result.execute.failed_count || 0);
      merged.execute.logs.push(...(result.execute.logs || []));
    }
  }

  return merged;
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

export function PaymentConfirmationContent({
  embedded = false,
}: PaymentConfirmationContentProps = {}) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionResult, setTransitionResult] =
    useState<V2AdminOrderLinearTransitionResult | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useV2AdminOrderQueue({
    limit: 1000,
  });
  const previewTransition = useV2AdminOrderLinearTransitionPreview();
  const executeTransition = useV2AdminOrderLinearTransitionExecute();

  const pendingRows = useMemo(() => {
    return (data?.items || []).filter(
      (row) => !isCanceledOrder(row) && resolveLinearStageFromRow(row) === 'PAYMENT_PENDING',
    );
  }, [data?.items]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) {
      return pendingRows;
    }

    const keyword = search.trim().toLowerCase();
    return pendingRows.filter(
      (item) =>
        item.order_no.toLowerCase().includes(keyword) ||
        String(item.depositor_name || '')
          .toLowerCase()
          .includes(keyword) ||
        item.order_id.toLowerCase().includes(keyword),
    );
  }, [pendingRows, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / ORDER_PAGE_SIZE)),
    [filteredRows.length],
  );

  const currentPageClamped = Math.min(currentPage, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPageClamped - 1) * ORDER_PAGE_SIZE;
    return filteredRows.slice(start, start + ORDER_PAGE_SIZE);
  }, [currentPageClamped, filteredRows]);

  const visibleOrderIdSet = useMemo(
    () => new Set(pagedRows.map((row) => row.order_id)),
    [pagedRows],
  );
  const visibleRowByOrderId = useMemo(
    () => new Map(pagedRows.map((row) => [row.order_id, row])),
    [pagedRows],
  );

  const effectiveSelectedOrderIds = useMemo(
    () => selectedOrderIds.filter((id) => visibleOrderIdSet.has(id)),
    [selectedOrderIds, visibleOrderIdSet],
  );

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

  const summary = useMemo(() => {
    return {
      pendingCount: pendingRows.length,
      selectedCount: effectiveSelectedOrderIds.length,
      executableCount: transitionResult?.summary.executable_order_count || 0,
      blockedCount: transitionResult?.summary.blocked_order_count || 0,
    };
  }, [effectiveSelectedOrderIds.length, pendingRows.length, transitionResult]);

  function buildTransitionPlans(): TransitionPlan[] {
    const reason = transitionReason.trim() || null;
    const paymentConfirmedOrderIds: string[] = [];
    const deliveredOrderIds: string[] = [];

    for (const orderId of effectiveSelectedOrderIds) {
      const row = visibleRowByOrderId.get(orderId);
      const isDigitalOnly = row?.has_digital === true && row?.has_physical !== true;
      if (isDigitalOnly) {
        deliveredOrderIds.push(orderId);
        continue;
      }
      paymentConfirmedOrderIds.push(orderId);
    }

    const plans: TransitionPlan[] = [];
    if (paymentConfirmedOrderIds.length > 0) {
      plans.push({
        orderIds: paymentConfirmedOrderIds,
        targetStage: 'PAYMENT_CONFIRMED',
        reason,
      });
    }
    if (deliveredOrderIds.length > 0) {
      plans.push({
        orderIds: deliveredOrderIds,
        targetStage: 'DELIVERED',
        reason,
      });
    }

    return plans;
  }

  function buildTransitionPayload(plan: TransitionPlan) {
    return {
      order_ids: plan.orderIds,
      target_stage: plan.targetStage,
      reason: plan.reason,
    };
  }

  async function previewTransitionByPlans(
    plans: TransitionPlan[],
  ): Promise<V2AdminOrderLinearTransitionResult> {
    const results: V2AdminOrderLinearTransitionResult[] = [];
    for (const plan of plans) {
      if (plan.orderIds.length === 0) {
        continue;
      }
      const result = await previewTransition.mutateAsync(buildTransitionPayload(plan));
      results.push(result);
    }
    return mergeTransitionResults(results);
  }

  async function executeTransitionByPlans(
    plans: TransitionPlan[],
  ): Promise<V2AdminOrderLinearTransitionResult> {
    const results: V2AdminOrderLinearTransitionResult[] = [];
    for (const plan of plans) {
      if (plan.orderIds.length === 0) {
        continue;
      }
      const result = await executeTransition.mutateAsync(buildTransitionPayload(plan));
      results.push(result);
    }
    return mergeTransitionResults(results);
  }

  async function handlePreviewTransition() {
    if (effectiveSelectedOrderIds.length === 0) {
      setTransitionMessage('주문을 1건 이상 선택해 주세요.');
      return;
    }

    try {
      const plans = buildTransitionPlans();
      const result = await previewTransitionByPlans(plans);
      setTransitionResult(result);
      setTransitionMessage(
        `미리보기 완료: 실행 가능 ${result.summary.executable_order_count}건 / 차단 ${result.summary.blocked_order_count}건`,
      );
    } catch (previewError) {
      setTransitionMessage(getErrorMessage(previewError));
    }
  }

  async function handleExecuteTransition() {
    if (effectiveSelectedOrderIds.length === 0) {
      setTransitionMessage('주문을 1건 이상 선택해 주세요.');
      return;
    }

    const confirmed = window.confirm(
      `선택한 ${effectiveSelectedOrderIds.length}건 주문을 입금 확인 처리할까요?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      const plans = buildTransitionPlans();
      const result = await executeTransitionByPlans(plans);
      setTransitionResult(result);

      const executeLogs = result.execute?.logs || [];
      const failedLogs = executeLogs.filter(
        (log) => readLogString(log, 'status') === 'FAILED',
      );

      if (failedLogs.length > 0) {
        setTransitionMessage(
          `실행 완료: 성공 ${result.execute?.succeeded_count ?? 0}건 / 실패 ${result.execute?.failed_count ?? 0}건 · 첫 실패 ${summarizeFailedLog(failedLogs[0])}`,
        );
      } else {
        setTransitionMessage(
          `실행 완료: 성공 ${result.execute?.succeeded_count ?? 0}건 / 실패 ${result.execute?.failed_count ?? 0}건`,
        );
      }

      await refetch();
      setSelectedOrderIds([]);
    } catch (executeError) {
      setTransitionMessage(getErrorMessage(executeError));
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh]">
        <EmptyState
          title="입금 확인 대기 주문을 불러오지 못했습니다"
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
      {!embedded && (
        <header>
          <h2 className="text-xl font-bold text-gray-900">입금 확인</h2>
          <p className="mt-1 text-sm text-gray-500">
            입금 대기 주문을 선별해 입금 확인 처리합니다.
          </p>
        </header>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">입금 대기 주문</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">선택 주문</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.selectedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">실행 가능</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.executableCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">차단</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.blockedCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="주문번호 / 주문 ID / 입금자명 검색"
          />
          <Button intent="secondary" onClick={toggleAllVisible} disabled={pagedRows.length === 0}>
            {allVisibleSelected ? '현재 페이지 전체 해제' : '현재 페이지 전체 선택'}
          </Button>
          <Button
            intent="secondary"
            loading={previewTransition.isPending}
            disabled={!canSubmitTransition}
            onClick={() => void handlePreviewTransition()}
          >
            미리보기
          </Button>
          <Button
            intent="primary"
            loading={executeTransition.isPending}
            disabled={!canSubmitTransition}
            onClick={() => void handleExecuteTransition()}
          >
            입금 확인 실행
          </Button>
        </div>

        <div className="mt-3">
          <Input
            value={transitionReason}
            onChange={(event) => setTransitionReason(event.target.value)}
            placeholder="전환 사유(선택)"
          />
        </div>

        {transitionMessage ? (
          <p className="mt-3 text-xs font-medium text-gray-700">{transitionMessage}</p>
        ) : null}
      </section>

      {transitionResult ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800">
            전환 {transitionResult.mode === 'PREVIEW' ? '미리보기' : '실행'} 결과
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            요청 {transitionResult.summary.requested_order_count}건 · 실행 가능{' '}
            {transitionResult.summary.executable_order_count}건 · 액션{' '}
            {transitionResult.summary.total_action_count}건
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {filteredRows.length === 0 ? (
          <EmptyState
            title="입금 확인 대상 주문이 없습니다"
            description="검색 조건을 변경해 다시 조회해 보세요."
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
                        <td className="px-4 py-3 text-gray-700">{row.depositor_name || '-'}</td>
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
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  다음
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
