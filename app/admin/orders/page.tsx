'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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

type V2OrderStageTab = 'ALL' | V2AdminOrderLinearStage;

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

function statusBadgeClass(status: string) {
  if (status.includes('FAILED') || status.includes('CANCELED')) {
    return 'bg-red-100 text-red-700';
  }
  if (
    status.includes('PENDING') ||
    status.includes('UNFULFILLED') ||
    status.includes('PARTIAL')
  ) {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-green-100 text-green-700';
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

function resolveLinearStageFromRow(row: V2AdminOrderQueueRow): V2AdminOrderLinearStage {
  const paymentStatus = String(row.payment_status || '').toUpperCase();
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
      return 'DELIVERED';
    }
    return 'PRODUCTION';
  }

  if (row.has_digital && Number(row.active_entitlement_count || 0) === 0) {
    return 'DELIVERED';
  }
  return 'PRODUCTION';
}

const LINEAR_STAGE_TABS: Array<{
  key: V2OrderStageTab;
  label: string;
}> = [
  { key: 'ALL', label: '전체' },
  { key: 'PAYMENT_PENDING', label: linearStageLabel('PAYMENT_PENDING') },
  { key: 'PAYMENT_CONFIRMED', label: linearStageLabel('PAYMENT_CONFIRMED') },
  { key: 'PRODUCTION', label: linearStageLabel('PRODUCTION') },
  { key: 'READY_TO_SHIP', label: linearStageLabel('READY_TO_SHIP') },
  { key: 'IN_TRANSIT', label: linearStageLabel('IN_TRANSIT') },
  { key: 'DELIVERED', label: linearStageLabel('DELIVERED') },
];

export default function AdminOrdersPage() {
  const [stageTab, setStageTab] = useState<V2OrderStageTab>('ALL');
  const [search, setSearch] = useState('');
  const [targetStage, setTargetStage] = useState<V2AdminOrderLinearStage>('PRODUCTION');
  const [transitionReason, setTransitionReason] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [transitionResult, setTransitionResult] =
    useState<V2AdminOrderLinearTransitionResult | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useV2AdminOrderQueue({
    limit: 200,
  });
  const previewTransition = useV2AdminOrderLinearTransitionPreview();
  const executeTransition = useV2AdminOrderLinearTransitionExecute();

  const stageCounts = useMemo(() => {
    const counts: Record<V2OrderStageTab, number> = {
      ALL: 0,
      PAYMENT_PENDING: 0,
      PAYMENT_CONFIRMED: 0,
      PRODUCTION: 0,
      READY_TO_SHIP: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
    };

    for (const item of data?.items || []) {
      const stage = resolveLinearStageFromRow(item);
      counts.ALL += 1;
      counts[stage] += 1;
    }

    return counts;
  }, [data?.items]);

  const rows = useMemo(() => {
    const items = data?.items || [];
    const stageFiltered =
      stageTab === 'ALL'
        ? items
        : items.filter((item) => resolveLinearStageFromRow(item) === stageTab);

    if (!search.trim()) {
      return stageFiltered;
    }
    const keyword = search.trim().toLowerCase();
    return stageFiltered.filter(
      (item) =>
        item.order_no.toLowerCase().includes(keyword) ||
        item.order_id.toLowerCase().includes(keyword),
    );
  }, [data?.items, search, stageTab]);

  useEffect(() => {
    const rowIdSet = new Set(rows.map((row) => row.order_id));
    setSelectedOrderIds((prev) => prev.filter((id) => rowIdSet.has(id)));
  }, [rows]);

  const selectedIdSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);
  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selectedIdSet.has(row.order_id));

  const canSubmitTransition =
    selectedOrderIds.length > 0 && !previewTransition.isPending && !executeTransition.isPending;

  const transitionPayload = {
    order_ids: selectedOrderIds,
    target_stage: targetStage,
    reason: transitionReason.trim() || null,
  };

  async function handlePreviewTransition() {
    if (selectedOrderIds.length === 0) {
      setTransitionMessage('주문을 1건 이상 선택해 주세요.');
      return;
    }

    try {
      const result = await previewTransition.mutateAsync(transitionPayload);
      setTransitionResult(result);
      setTransitionMessage(
        `미리보기 완료: 실행 가능 ${result.summary.executable_order_count}건 / 차단 ${result.summary.blocked_order_count}건`,
      );
    } catch (previewError) {
      setTransitionMessage(
        previewError instanceof Error
          ? previewError.message
          : '미리보기 실행 중 오류가 발생했습니다.',
      );
    }
  }

  async function handleExecuteTransition() {
    if (selectedOrderIds.length === 0) {
      setTransitionMessage('주문을 1건 이상 선택해 주세요.');
      return;
    }

    const confirmed = window.confirm(
      `선택한 ${selectedOrderIds.length}건 주문을 "${linearStageLabel(targetStage)}" 단계로 전환할까요?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      const result = await executeTransition.mutateAsync(transitionPayload);
      setTransitionResult(result);
      setTransitionMessage(
        `실행 완료: 성공 ${result.execute?.succeeded_count ?? 0}건 / 실패 ${result.execute?.failed_count ?? 0}건`,
      );
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
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !rows.some((row) => row.order_id === id)));
      return;
    }

    setSelectedOrderIds((prev) => {
      const merged = new Set(prev);
      for (const row of rows) {
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
          주문 상태 3축과 이행 위험도를 기준으로 운영 대상을 확인합니다.
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
                onClick={() => setStageTab(tab.key)}
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="주문번호 또는 주문 ID 검색"
          />
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600">선형 단계 일괄 전환</p>
          <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-[180px_1fr_auto_auto]">
            <select
              value={targetStage}
              onChange={(event) => setTargetStage(event.target.value as V2AdminOrderLinearStage)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="PAYMENT_PENDING">입금 대기</option>
              <option value="PAYMENT_CONFIRMED">입금 확인</option>
              <option value="PRODUCTION">제작중</option>
              <option value="READY_TO_SHIP">배송 대기</option>
              <option value="IN_TRANSIT">배송 중</option>
              <option value="DELIVERED">배송 완료</option>
            </select>
            <Input
              value={transitionReason}
              onChange={(event) => setTransitionReason(event.target.value)}
              placeholder="전환 사유(선택)"
            />
            <Button
              intent="secondary"
              size="sm"
              loading={previewTransition.isPending}
              disabled={!canSubmitTransition}
              onClick={() => void handlePreviewTransition()}
            >
              미리보기
            </Button>
            <Button
              intent="primary"
              size="sm"
              loading={executeTransition.isPending}
              disabled={!canSubmitTransition}
              onClick={() => void handleExecuteTransition()}
            >
              실행
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            선택 주문: {selectedOrderIds.length}건 · 목표 단계: {linearStageLabel(targetStage)}
          </p>
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
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <EmptyState
            title="조회된 주문이 없습니다"
            description="필터 조건을 변경해 다시 조회해 보세요."
          />
        ) : (
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">상태</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">금액</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">이행 위험도</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">주문시각</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const waitingShipmentCount = Number.isFinite(row.waiting_shipment_count)
                    ? row.waiting_shipment_count
                    : null;
                  const inTransitShipmentCount = Number.isFinite(row.in_transit_shipment_count)
                    ? row.in_transit_shipment_count
                    : null;
                  const deliveredShipmentCount = Number.isFinite(row.delivered_shipment_count)
                    ? row.delivered_shipment_count
                    : null;
                  const hasSplitShipmentCounts =
                    waitingShipmentCount !== null ||
                    inTransitShipmentCount !== null ||
                    deliveredShipmentCount !== null;
                  const hasBundle = row.has_bundle === true;
                  const hasDigital = row.has_digital === true;
                  const hasPhysical = row.has_physical === true;
                  const currentLinearStage = resolveLinearStageFromRow(row);

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
                        <p className="text-xs text-gray-500">{row.order_id}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
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
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              row.order_status,
                            )}`}
                          >
                            주문 {row.order_status}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              row.payment_status,
                            )}`}
                          >
                            결제 {row.payment_status}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              row.fulfillment_status,
                            )}`}
                          >
                            이행 {row.fulfillment_status}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            단계 {linearStageLabel(currentLinearStage)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(row.grand_total)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {hasSplitShipmentCounts ? (
                          <>
                            <p>배송 대기: {waitingShipmentCount ?? 0}</p>
                            <p>배송 중: {inTransitShipmentCount ?? 0}</p>
                            <p>배송 완료: {deliveredShipmentCount ?? 0}</p>
                          </>
                        ) : (
                          <p>배송 진행중: {row.active_shipment_count}</p>
                        )}
                        <p>디지털 진행중: {row.active_entitlement_count}</p>
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
