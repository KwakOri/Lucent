'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  type ListV2AdminDashboardOverviewParams,
  type V2AdminSalesStatsPreset,
} from '@/lib/client/api/v2-admin-ops.api';
import { useV2AdminDashboardOverview } from '@/lib/client/hooks/useV2AdminOps';

type FilterState = {
  preset: V2AdminSalesStatsPreset;
  from: string;
  to: string;
};

type DashboardAlertLevel = 'normal' | 'warning' | 'critical';

const ORDER_STAGE_LABELS: Record<string, string> = {
  PAYMENT_PENDING: '입금 대기',
  PAYMENT_CONFIRMED: '입금 확인',
  PRODUCTION: '제작중',
  READY_TO_SHIP: '배송 대기',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
  CANCELED: '취소',
};

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function resolvePresetRange(preset: V2AdminSalesStatsPreset): { from: string; to: string } {
  const today = toIsoDate(new Date());
  if (preset === 'LAST_30_DAYS') {
    return {
      from: shiftIsoDate(today, -29),
      to: today,
    };
  }
  return {
    from: shiftIsoDate(today, -6),
    to: today,
  };
}

function toDashboardParams(filters: FilterState): ListV2AdminDashboardOverviewParams {
  const params: ListV2AdminDashboardOverviewParams = {
    preset: filters.preset,
  };

  if (filters.preset === 'CUSTOM') {
    params.from = filters.from;
    params.to = filters.to;
  }

  return params;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.max(0, value || 0));
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currencyCode || 'KRW',
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `${formatNumber(value)}원`;
  }
}

function formatPercent(value: number): string {
  return `${(Math.max(0, value || 0) * 100).toFixed(2)}%`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  return '대시보드를 불러오는 중 오류가 발생했습니다.';
}

function resolveAlertLevel(
  value: number,
  threshold: { warning: number; critical: number },
): DashboardAlertLevel {
  if (value > threshold.critical) {
    return 'critical';
  }
  if (value > threshold.warning) {
    return 'warning';
  }
  return 'normal';
}

function resolveMetricAlert(
  key: 'refund_rate' | 'payment_pending_count' | 'ready_to_ship_count' | 'inventory_risk_count' | 'approval_pending_count',
  value: number,
): DashboardAlertLevel {
  if (key === 'refund_rate') {
    return resolveAlertLevel(value, { warning: 0.05, critical: 0.08 });
  }
  if (key === 'payment_pending_count') {
    return resolveAlertLevel(value, { warning: 30, critical: 60 });
  }
  if (key === 'ready_to_ship_count') {
    return resolveAlertLevel(value, { warning: 50, critical: 100 });
  }
  if (key === 'inventory_risk_count') {
    return resolveAlertLevel(value, { warning: 0, critical: 10 });
  }
  return resolveAlertLevel(value, { warning: 10, critical: 20 });
}

function alertBadge(level: DashboardAlertLevel) {
  if (level === 'critical') {
    return <Badge intent="error">위험</Badge>;
  }
  if (level === 'warning') {
    return <Badge intent="warning">주의</Badge>;
  }
  return <Badge intent="success">정상</Badge>;
}

function stageBadgeIntent(stage: string) {
  if (stage === 'PAYMENT_PENDING' || stage === 'READY_TO_SHIP') {
    return 'warning' as const;
  }
  if (stage === 'CANCELED') {
    return 'error' as const;
  }
  if (stage === 'DELIVERED') {
    return 'success' as const;
  }
  return 'default' as const;
}

export default function AdminDashboardPage() {
  const initialRange = resolvePresetRange('LAST_7_DAYS');
  const [draft, setDraft] = useState<FilterState>({
    preset: 'LAST_7_DAYS',
    from: initialRange.from,
    to: initialRange.to,
  });
  const [applied, setApplied] = useState<FilterState>({
    preset: 'LAST_7_DAYS',
    from: initialRange.from,
    to: initialRange.to,
  });

  const params = useMemo(() => toDashboardParams(applied), [applied]);
  const { data, isLoading, isFetching, error, refetch } = useV2AdminDashboardOverview(params);

  const handlePresetApply = (preset: V2AdminSalesStatsPreset) => {
    if (preset === 'CUSTOM') {
      setDraft((prev) => ({ ...prev, preset: 'CUSTOM' }));
      return;
    }
    const range = resolvePresetRange(preset);
    const next = {
      preset,
      from: range.from,
      to: range.to,
    };
    setDraft(next);
    setApplied(next);
  };

  const handleApplyCustomRange = () => {
    setApplied({
      preset: 'CUSTOM',
      from: draft.from,
      to: draft.to,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="운영 대시보드를 불러오는 중입니다." />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-700">대시보드 로드 실패</h1>
        <p className="text-sm text-red-600">{getErrorMessage(error)}</p>
        <div>
          <Button type="button" size="sm" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const currencyCode = data.metadata.currency_code || 'KRW';
  const maxTrendNet = Math.max(
    1,
    ...data.trends.daily.map((row) => Math.max(0, Number(row.net_settlement_amount || 0))),
  );
  const stageTotal = Object.values(data.pipeline.order_stage_counts).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );

  const kpiCards = [
    {
      key: 'orders_count',
      title: '총 주문 수',
      value: formatNumber(data.kpis.orders_count),
      href: '/admin/v2-ops/stats',
      badge: null,
    },
    {
      key: 'order_gross_amount',
      title: '총 매출',
      value: formatCurrency(data.kpis.order_gross_amount, currencyCode),
      href: '/admin/v2-ops/stats',
      badge: null,
    },
    {
      key: 'net_settlement_amount',
      title: '순정산',
      value: formatCurrency(data.kpis.net_settlement_amount, currencyCode),
      href: '/admin/v2-ops/stats',
      badge: null,
    },
    {
      key: 'refund_rate',
      title: '환불률',
      value: formatPercent(data.kpis.refund_rate),
      href: '/admin/refunds',
      badge: alertBadge(resolveMetricAlert('refund_rate', data.kpis.refund_rate)),
    },
    {
      key: 'payment_pending_count',
      title: '입금 대기',
      value: formatNumber(data.kpis.payment_pending_count),
      href: '/admin/orders',
      badge: alertBadge(
        resolveMetricAlert('payment_pending_count', data.kpis.payment_pending_count),
      ),
    },
    {
      key: 'ready_to_ship_count',
      title: '배송 대기',
      value: formatNumber(data.kpis.ready_to_ship_count),
      href: '/admin/orders',
      badge: alertBadge(
        resolveMetricAlert('ready_to_ship_count', data.kpis.ready_to_ship_count),
      ),
    },
    {
      key: 'inventory_risk_count',
      title: '재고 리스크',
      value: formatNumber(data.kpis.inventory_risk_count),
      href: '/admin/production-shipping',
      badge: alertBadge(
        resolveMetricAlert('inventory_risk_count', data.kpis.inventory_risk_count),
      ),
    },
    {
      key: 'approval_pending_count',
      title: '승인 대기',
      value: formatNumber(data.kpis.approval_pending_count),
      href: '/admin/v2-ops',
      badge: alertBadge(
        resolveMetricAlert('approval_pending_count', data.kpis.approval_pending_count),
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">운영 대시보드</h1>
            <p className="text-sm text-gray-600">
              매출, 주문 이행, 재고, 승인 병목을 한 화면에서 확인합니다.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isFetching ? <Badge intent="info">새로고침 중</Badge> : null}
            <span>집계 기준: {formatDateTime(data.generated_at)}</span>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" intent="secondary" onClick={() => handlePresetApply('LAST_7_DAYS')}>
            최근 7일
          </Button>
          <Button type="button" size="sm" intent="secondary" onClick={() => handlePresetApply('LAST_30_DAYS')}>
            최근 30일
          </Button>
          <Button type="button" size="sm" intent="secondary" onClick={() => handlePresetApply('CUSTOM')}>
            커스텀
          </Button>
          <Button type="button" size="sm" intent="neutral" onClick={() => refetch()}>
            새로고침
          </Button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            type="date"
            size="sm"
            value={draft.from}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                preset: 'CUSTOM',
                from: event.target.value,
              }))
            }
          />
          <Input
            type="date"
            size="sm"
            value={draft.to}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                preset: 'CUSTOM',
                to: event.target.value,
              }))
            }
          />
          <Button type="button" size="sm" onClick={handleApplyCustomRange}>
            기간 적용
          </Button>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          현재 범위: {data.range.from} ~ {data.range.to}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              {card.badge}
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{card.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">매출/정산 추세</h2>
            <Link href="/admin/v2-ops/stats" className="text-sm font-semibold text-blue-600">
              상세 통계 보기
            </Link>
          </div>
          <div className="space-y-2">
            {data.trends.daily.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-5 text-center text-sm text-gray-500">
                선택한 기간의 추세 데이터가 없습니다.
              </p>
            ) : (
              data.trends.daily.map((row) => {
                const barWidth = `${Math.max(
                  2,
                  Math.round((Math.max(0, row.net_settlement_amount) / maxTrendNet) * 100),
                )}%`;

                return (
                  <div key={row.date} className="rounded-lg border border-gray-100 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span>{row.date}</span>
                      <span>{formatCurrency(row.net_settlement_amount, currencyCode)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: barWidth }} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <span>매출 {formatNumber(row.order_gross_amount)}</span>
                      <span>캡처 {formatNumber(row.captured_amount)}</span>
                      <span>환불 {formatNumber(row.refund_amount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">주문 단계 퍼널</h2>
            <div className="mt-3 space-y-2">
              {Object.entries(data.pipeline.order_stage_counts).map(([stage, count]) => {
                const ratio = stageTotal > 0 ? Math.round((Number(count || 0) / stageTotal) * 100) : 0;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{ORDER_STAGE_LABELS[stage] || stage}</span>
                      <span>{formatNumber(Number(count || 0))}건</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-slate-500" style={{ width: `${Math.max(2, ratio)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">운영 리스크</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p className="flex items-center justify-between">
                <span>재고 불일치</span>
                <span>{formatNumber(data.risk.inventory.mismatch_count)}건</span>
              </p>
              <p className="flex items-center justify-between">
                <span>저재고</span>
                <span>{formatNumber(data.risk.inventory.low_stock_count)}건</span>
              </p>
              <p className="flex items-center justify-between">
                <span>컷오버 BLOCKED</span>
                <span>{formatNumber(data.risk.cutover.blocked_domains)}건</span>
              </p>
              <p className="flex items-center justify-between">
                <span>실패 액션(24h)</span>
                <span>{formatNumber(data.risk.audit.failed_actions_24h)}건</span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/admin/production-shipping" className="text-xs font-semibold text-blue-600">
                제작/배송 관리
              </Link>
              <Link href="/admin/v2-ops" className="text-xs font-semibold text-blue-600">
                감사/승인 화면
              </Link>
              <Link
                href="/admin/v2-catalog/readiness"
                className="text-xs font-semibold text-blue-600"
              >
                컷오버 점검
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">즉시 처리 주문</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-blue-600">
              주문 운영 열기
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3">주문번호</th>
                  <th className="py-2 pr-3">단계</th>
                  <th className="py-2 pr-3">경과</th>
                  <th className="py-2 pr-3">금액</th>
                  <th className="py-2">기준시각</th>
                </tr>
              </thead>
              <tbody>
                {data.queues.urgent_orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                      즉시 처리 대상 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.queues.urgent_orders.map((order) => (
                    <tr key={`${order.order_id || order.order_no}`} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium text-gray-900">
                        {order.order_id ? (
                          <Link href={`/admin/orders/${order.order_id}`} className="hover:text-blue-600">
                            {order.order_no || order.order_id}
                          </Link>
                        ) : (
                          order.order_no || '-'
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge intent={stageBadgeIntent(order.stage)}>
                          {ORDER_STAGE_LABELS[order.stage] || order.stage}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {order.age_hours === null ? '-' : `${order.age_hours.toFixed(1)}h`}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {formatCurrency(order.grand_total, currencyCode)}
                      </td>
                      <td className="py-2 text-gray-500">
                        {formatDateTime(order.placed_at || order.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">승인 대기</h2>
              <Link href="/admin/v2-ops" className="text-xs font-semibold text-blue-600">
                전체 보기
              </Link>
            </div>
            <ul className="space-y-2">
              {data.queues.pending_approvals.length === 0 ? (
                <li className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                  대기중인 승인 요청이 없습니다.
                </li>
              ) : (
                data.queues.pending_approvals.map((item) => (
                  <li key={item.id} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{item.action_key}</p>
                    <p className="text-xs text-gray-600">
                      role: {item.assignee_role_code || '-'} · 요청: {formatDateTime(item.requested_at)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">최근 실패 액션</h2>
              <Link href="/admin/v2-ops" className="text-xs font-semibold text-blue-600">
                감사 로그 보기
              </Link>
            </div>
            <ul className="space-y-2">
              {data.queues.failed_actions.length === 0 ? (
                <li className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                  최근 실패 액션이 없습니다.
                </li>
              ) : (
                data.queues.failed_actions.map((item) => (
                  <li key={item.id} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{item.action_key}</p>
                    <p className="text-xs text-gray-600">
                      {item.resource_type || '-'} · {item.error_message || '에러 메시지 없음'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateTime(item.created_at)}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">제작 배치 상태</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>DRAFT</span>
              <span>{formatNumber(data.pipeline.production_batch_status_counts.DRAFT)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>ACTIVE</span>
              <span>{formatNumber(data.pipeline.production_batch_status_counts.ACTIVE)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>COMPLETED</span>
              <span>{formatNumber(data.pipeline.production_batch_status_counts.COMPLETED)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>CANCELED</span>
              <span>{formatNumber(data.pipeline.production_batch_status_counts.CANCELED)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-red-700">
              <span>FAILED</span>
              <span>{formatNumber(data.pipeline.production_batch_status_counts.failed_count)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2 text-yellow-700">
              <span>EXCLUDED</span>
              <span>{formatNumber(data.pipeline.production_batch_status_counts.excluded_count)}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">배송 배치 상태</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>DRAFT</span>
              <span>{formatNumber(data.pipeline.shipping_batch_status_counts.DRAFT)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>ACTIVE</span>
              <span>{formatNumber(data.pipeline.shipping_batch_status_counts.ACTIVE)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>DISPATCHED</span>
              <span>{formatNumber(data.pipeline.shipping_batch_status_counts.DISPATCHED)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>COMPLETED</span>
              <span>{formatNumber(data.pipeline.shipping_batch_status_counts.COMPLETED)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-red-700">
              <span>FAILED</span>
              <span>{formatNumber(data.pipeline.shipping_batch_status_counts.failed_count)}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-yellow-50 px-3 py-2 text-yellow-700">
              <span>EXCLUDED</span>
              <span>{formatNumber(data.pipeline.shipping_batch_status_counts.excluded_count)}</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
