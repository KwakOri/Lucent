'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  Clock3,
  Package as PackageIcon,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { useAdminFeedback } from '@/src/components/admin/AdminFeedback';
import {
  type ListV2AdminDashboardOverviewParams,
  type V2AdminDashboardUrgentOrder,
  type V2AdminDashboardOrderStage,
  type V2AdminSalesStatsPreset,
} from '@/lib/client/api/v2-admin-ops.api';
import { type V2Campaign } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2AdminDashboardOverview,
  useV2AdminOrderLinearTransitionExecute,
} from '@/lib/client/hooks/useV2AdminOps';
import { useV2Campaigns } from '@/lib/client/hooks/useV2CatalogAdmin';

type FilterState = {
  preset: V2AdminSalesStatsPreset;
  from: string;
  to: string;
};

type DashboardAlertLevel = 'normal' | 'warning' | 'critical';

type KpiCard = {
  key: string;
  title: string;
  value: string;
  unit?: string;
  href: string;
  icon: LucideIcon;
  caption: string;
  primary?: boolean;
  badge?: ReactNode;
};

type OrderProductOverlayState = {
  order: V2AdminDashboardUrgentOrder;
  top: number;
  left: number;
};

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

function resolvePresetRange(preset: V2AdminSalesStatsPreset): {
  from: string;
  to: string;
} {
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

function toDashboardParams(
  filters: FilterState,
): ListV2AdminDashboardOverviewParams {
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

function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(
    value.includes('T') ? value : `${value}T00:00:00.000Z`,
  );
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
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
  key:
    | 'refund_rate'
    | 'payment_pending_count'
    | 'ready_to_ship_count'
    | 'inventory_risk_count'
    | 'approval_pending_count',
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

function getStageTone(stage: string): {
  label: string;
  dot: string;
  className: string;
} {
  if (stage === 'PAYMENT_PENDING') {
    return {
      label: ORDER_STAGE_LABELS[stage] || stage,
      dot: '#f9ab00',
      className: 'bg-[#fff4d5] text-[#a35200]',
    };
  }
  if (
    stage === 'READY_TO_SHIP' ||
    stage === 'IN_TRANSIT' ||
    stage === 'PRODUCTION'
  ) {
    return {
      label: ORDER_STAGE_LABELS[stage] || stage,
      dot: '#66B5F3',
      className: 'bg-[#f0f7ff] text-[#4a88b9]',
    };
  }
  if (stage === 'DELIVERED' || stage === 'PAYMENT_CONFIRMED') {
    return {
      label: ORDER_STAGE_LABELS[stage] || stage,
      dot: '#34a853',
      className: 'bg-[#eafaea] text-[#297c3b]',
    };
  }
  if (stage === 'CANCELED') {
    return {
      label: ORDER_STAGE_LABELS[stage] || stage,
      dot: '#ca2a30',
      className: 'bg-[#fff0f0] text-[#ca2a30]',
    };
  }
  return {
    label: ORDER_STAGE_LABELS[stage] || stage,
    dot: '#9b9788',
    className: 'bg-[#f4f2e6] text-[#6f6b5e]',
  };
}

function StagePill({ stage }: { stage: string }) {
  const tone = getStageTone(stage);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[11px] font-bold ${tone.className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tone.dot }}
        aria-hidden
      />
      {tone.label}
    </span>
  );
}

function getOrderProductQuantity(order: V2AdminDashboardUrgentOrder): number {
  return Math.max(
    0,
    Number(order.item_quantity_total || order.item_line_count || 0),
  );
}

function OrderProductSummaryCell({
  order,
  onOpen,
  onClose,
}: {
  order: V2AdminDashboardUrgentOrder;
  onOpen: (order: V2AdminDashboardUrgentOrder, trigger: HTMLElement) => void;
  onClose: () => void;
}) {
  const quantity = getOrderProductQuantity(order);

  return (
    <button
      type="button"
      className="rounded-[10px] bg-[#fff4d5] px-2.5 py-1 text-xs font-black text-[#a35200] transition hover:bg-[#ffe8a3] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/35"
      aria-label={`${order.order_no || '주문'} 상품 상세 보기`}
      onMouseEnter={(event) => onOpen(order, event.currentTarget)}
      onFocus={(event) => onOpen(order, event.currentTarget)}
      onMouseLeave={onClose}
      onBlur={onClose}
    >
      {quantity > 0 ? `상품 ${formatNumber(quantity)}개` : '상품 정보 없음'}
    </button>
  );
}

function OrderProductFloatingOverlay({
  overlay,
  currencyCode,
}: {
  overlay: OrderProductOverlayState;
  currencyCode: string;
}) {
  const { order, top, left } = overlay;
  const quantity = getOrderProductQuantity(order);
  const items = order.items || [];
  const visibleItems = items.slice(0, 4);
  const hiddenItemCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div
      className="pointer-events-none fixed z-[90] w-80 max-w-[calc(100vw-1.5rem)] rounded-[16px] border border-[#e7e3d3] bg-white p-4 text-left shadow-[0_18px_44px_rgba(26,26,46,0.14)]"
      style={{ top, left }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#1a1a2e]">
            {order.order_no || order.order_id || '주문번호 없음'}
          </p>
          <p className="mt-1 text-xs text-[#1a1a2e]/45">
            {order.depositor_name || '입금자명 없음'} ·{' '}
            {formatDateTime(order.placed_at || order.created_at)}
          </p>
        </div>
        <StagePill stage={order.stage} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-[12px] bg-[#f9f9ed] px-3 py-2">
        <div>
          <p className="text-[11px] font-semibold text-[#1a1a2e]/45">
            상품 수량
          </p>
          <p className="mt-0.5 text-sm font-black text-[#1a1a2e]">
            {formatNumber(quantity)}개
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[#1a1a2e]/45">
            결제 금액
          </p>
          <p className="mt-0.5 text-sm font-black text-[#1a1a2e]">
            {formatCurrency(order.grand_total, currencyCode)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <div
              key={`${item.order_item_id || item.product_name}-${index}`}
              className="flex items-start justify-between gap-3 border-t border-[#f1eee2] pt-2 first:border-t-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#1a1a2e]">
                  {item.product_name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#1a1a2e]/45">
                  {item.variant_name || '옵션 없음'}
                </p>
              </div>
              <span className="shrink-0 text-xs font-black text-[#a35200]">
                x {formatNumber(item.quantity)}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-[12px] bg-[#f9f9ed] px-3 py-3 text-center text-xs text-[#1a1a2e]/45">
            상품 상세가 없습니다.
          </p>
        )}
        {hiddenItemCount > 0 ? (
          <p className="text-[11px] font-semibold text-[#1a1a2e]/45">
            외 {formatNumber(hiddenItemCount)}개 상품
          </p>
        ) : null}
      </div>
    </div>
  );
}

function resolveOrderProductOverlayPosition(
  order: V2AdminDashboardUrgentOrder,
  trigger: HTMLElement,
): Pick<OrderProductOverlayState, 'top' | 'left'> {
  const rect = trigger.getBoundingClientRect();
  const margin = 12;
  const overlayWidth = 320;
  const rowCount = Math.min((order.items || []).length, 4);
  const estimatedHeight = Math.min(360, 160 + rowCount * 46);
  const maxLeft = Math.max(margin, window.innerWidth - overlayWidth - margin);
  const preferredTop = rect.bottom + 10;
  const top =
    preferredTop + estimatedHeight > window.innerHeight - margin
      ? Math.max(margin, rect.top - estimatedHeight - 10)
      : preferredTop;

  return {
    top,
    left: Math.min(Math.max(margin, rect.left), maxLeft),
  };
}

function getPresetButtonClass(isActive: boolean): string {
  return isActive
    ? '!border-[#1a1a2e] !bg-[#1a1a2e] !text-white hover:!bg-[#1a1a2e]'
    : 'border-[#e7e3d3] bg-[#f5f3e8] text-[#1a1a2e] hover:bg-[#ece8d9]';
}

function isCampaignLive(campaign: V2Campaign, now: Date): boolean {
  const startsAt = campaign.starts_at ? new Date(campaign.starts_at) : null;
  const endsAt = campaign.ends_at ? new Date(campaign.ends_at) : null;

  if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt > now) {
    return false;
  }
  if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt < now) {
    return false;
  }
  return true;
}

function sortCampaignsByStartDate(left: V2Campaign, right: V2Campaign): number {
  const leftTime = left.starts_at ? Date.parse(left.starts_at) : 0;
  const rightTime = right.starts_at ? Date.parse(right.starts_at) : 0;
  return rightTime - leftTime;
}

export default function AdminDashboardPage() {
  const { confirm, notify } = useAdminFeedback();
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
  const { data, isLoading, isFetching, error, refetch } =
    useV2AdminDashboardOverview(params);
  const confirmPayment = useV2AdminOrderLinearTransitionExecute();
  const { data: activePopupCampaigns, isLoading: popupsLoading } =
    useV2Campaigns({ status: 'ACTIVE', campaignType: 'POPUP' });
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(
    null,
  );
  const [productOverlay, setProductOverlay] =
    useState<OrderProductOverlayState | null>(null);

  useEffect(() => {
    if (!productOverlay) {
      return;
    }

    const closeOverlay = () => setProductOverlay(null);
    window.addEventListener('scroll', closeOverlay, true);
    window.addEventListener('resize', closeOverlay);

    return () => {
      window.removeEventListener('scroll', closeOverlay, true);
      window.removeEventListener('resize', closeOverlay);
    };
  }, [productOverlay]);

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

  const handleConfirmPayment = async (order: V2AdminDashboardUrgentOrder) => {
    if (!order.order_id || order.stage !== 'PAYMENT_PENDING') {
      return;
    }

    const confirmed = await confirm({
      title: '입금 확인 처리',
      message: `${order.order_no || order.order_id} 주문을 입금 확인 처리할까요?`,
      description: '디지털 전용 주문은 완료 단계로, 실물 포함 주문은 입금 확인 단계로 이동합니다.',
      confirmText: '처리',
      tone: 'warning',
    });
    if (!confirmed) {
      return;
    }

    setConfirmingOrderId(order.order_id);
    try {
      await confirmPayment.mutateAsync({
        order_ids: [order.order_id],
        target_stage:
          order.has_digital && !order.has_physical
            ? 'DELIVERED'
            : 'PAYMENT_CONFIRMED',
        reason: '관리자 대시보드 처리 우선 주문에서 입금 확인',
      });
      await refetch();
    } catch (confirmError) {
      notify(getErrorMessage(confirmError), { type: 'error' });
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleOpenProductOverlay = (
    order: V2AdminDashboardUrgentOrder,
    trigger: HTMLElement,
  ) => {
    const position = resolveOrderProductOverlayPosition(order, trigger);
    setProductOverlay({ order, ...position });
  };

  const handleCloseProductOverlay = () => {
    setProductOverlay(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="운영 대시보드를 불러오는 중입니다." />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="space-y-4 rounded-[18px] border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-700">
          대시보드 로드 실패
        </h1>
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
  const orderStageEntries = Object.entries(
    data.pipeline.order_stage_counts,
  ).filter(([stage]) => stage !== 'DELIVERED');
  const stageTotal = orderStageEntries.reduce(
    (sum, [, value]) => sum + Number(value || 0),
    0,
  );

  const currentPopup = (() => {
    const popups = activePopupCampaigns || [];
    const livePopups = popups.filter((campaign) =>
      isCampaignLive(campaign, new Date()),
    );
    return (
      [...(livePopups.length > 0 ? livePopups : popups)].sort(
        sortCampaignsByStartDate,
      )[0] || null
    );
  })();

  const kpiCards: KpiCard[] = [
    {
      key: 'orders_count',
      title: '기간 주문',
      value: formatNumber(data.kpis.orders_count),
      unit: '건',
      href: '/admin/v2-ops/stats',
      icon: ShoppingCart,
      caption: `${formatDateLabel(data.range.from)} ~ ${formatDateLabel(data.range.to)}`,
      primary: true,
    },
    {
      key: 'ready_to_ship_count',
      title: '배송 대기',
      value: formatNumber(data.kpis.ready_to_ship_count),
      unit: '건',
      href: '/admin/orders?stage=READY_TO_SHIP',
      icon: Truck,
      caption: '출고 준비 필요',
      badge: alertBadge(
        resolveMetricAlert(
          'ready_to_ship_count',
          data.kpis.ready_to_ship_count,
        ),
      ),
    },
    {
      key: 'payment_pending_count',
      title: '입금 대기',
      value: formatNumber(data.kpis.payment_pending_count),
      unit: '건',
      href: '/admin/orders?stage=PAYMENT_PENDING',
      icon: Clock3,
      caption: '확인 대기 주문',
      badge: alertBadge(
        resolveMetricAlert(
          'payment_pending_count',
          data.kpis.payment_pending_count,
        ),
      ),
    },
    {
      key: 'approval_pending_count',
      title: '승인 대기',
      value: formatNumber(data.kpis.approval_pending_count),
      unit: '건',
      href: '/admin/v2-ops',
      icon: ShieldCheck,
      caption: '관리자 액션 승인',
      badge: alertBadge(
        resolveMetricAlert(
          'approval_pending_count',
          data.kpis.approval_pending_count,
        ),
      ),
    },
  ];

  const salesSummaries = [
    {
      label: '총 매출',
      value: formatCurrency(data.kpis.order_gross_amount, currencyCode),
    },
    {
      label: '상품 매출',
      value: formatCurrency(data.kpis.item_gross_amount, currencyCode),
    },
    {
      label: '순정산',
      value: formatCurrency(data.kpis.net_settlement_amount, currencyCode),
    },
  ];

  const riskItems = [
    {
      key: 'refund_rate',
      label: '환불률',
      value: formatPercent(data.kpis.refund_rate),
      detail: formatCurrency(data.kpis.refund_amount, currencyCode),
      href: '/admin/refunds',
      icon: AlertTriangle,
      badge: alertBadge(
        resolveMetricAlert('refund_rate', data.kpis.refund_rate),
      ),
    },
    {
      key: 'inventory_risk_count',
      label: '재고 리스크',
      value: `${formatNumber(data.kpis.inventory_risk_count)}건`,
      detail: `저재고 ${formatNumber(data.risk.inventory.low_stock_count)}건`,
      href: '/admin/production-shipping',
      icon: PackageIcon,
      badge: alertBadge(
        resolveMetricAlert(
          'inventory_risk_count',
          data.kpis.inventory_risk_count,
        ),
      ),
    },
    {
      key: 'failed_actions_24h',
      label: '실패 액션(24h)',
      value: `${formatNumber(data.risk.audit.failed_actions_24h)}건`,
      detail: `컷오버 BLOCKED ${formatNumber(data.risk.cutover.blocked_domains)}건`,
      href: '/admin/v2-ops',
      icon: BarChart3,
      badge: alertBadge(
        resolveMetricAlert(
          'approval_pending_count',
          data.risk.audit.failed_actions_24h,
        ),
      ),
    },
  ];

  const batchGroups = [
    {
      title: '제작 배치',
      href: '/admin/production',
      total: data.pipeline.production_batch_status_counts.total,
      rows: [
        ['DRAFT', data.pipeline.production_batch_status_counts.DRAFT],
        ['ACTIVE', data.pipeline.production_batch_status_counts.ACTIVE],
        ['COMPLETED', data.pipeline.production_batch_status_counts.COMPLETED],
        ['FAILED', data.pipeline.production_batch_status_counts.failed_count],
      ],
    },
    {
      title: '배송 배치',
      href: '/admin/shipping',
      total: data.pipeline.shipping_batch_status_counts.total,
      rows: [
        ['DRAFT', data.pipeline.shipping_batch_status_counts.DRAFT],
        ['ACTIVE', data.pipeline.shipping_batch_status_counts.ACTIVE],
        ['DISPATCHED', data.pipeline.shipping_batch_status_counts.DISPATCHED],
        ['FAILED', data.pipeline.shipping_batch_status_counts.failed_count],
      ],
    },
  ];

  const presetButtons: Array<{
    preset: V2AdminSalesStatsPreset;
    label: string;
  }> = [
    { preset: 'LAST_7_DAYS', label: '최근 7일' },
    { preset: 'LAST_30_DAYS', label: '최근 30일' },
    { preset: 'CUSTOM', label: '커스텀' },
  ];
  const isCustomRangeVisible = draft.preset === 'CUSTOM';

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_1.7fr]">
        <section className="overflow-hidden rounded-[22px] bg-[#1a1a2e] p-5 text-white shadow-[0_16px_34px_rgba(26,26,46,0.22)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-white/60">
                이번 달 총 매출
              </p>
              <h1 className="mt-3 text-2xl font-black sm:text-3xl">
                운영 대시보드
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
                매출, 주문 이행, 재고, 승인 병목을 한 화면에서 확인합니다.
              </p>
            </div>
            <Link
              href="/admin/v2-ops/stats"
              className="inline-flex items-center gap-1.5 rounded-[11px] bg-[#ffcd27] px-3 py-2 text-xs font-black text-[#1a1a2e] transition hover:bg-[#ffd84d]"
            >
              상세 통계
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {salesSummaries.map((item) => (
              <div key={item.label} className="border-t border-white/30 pt-3">
                <p className="text-xs font-medium text-white/70">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-white/75">
            {isFetching ? <Badge intent="info">새로고침 중</Badge> : null}
            <span>집계 기준 {formatDateTime(data.generated_at)}</span>
            <span>
              현재 범위 {data.range.from} ~ {data.range.to}
            </span>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                href={card.href}
                className={`group rounded-[18px] border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(26,26,46,0.08)] ${
                  card.primary
                    ? 'border-[#f59e0b] bg-[#f59e0b] text-white shadow-[0_14px_28px_rgba(245,158,11,0.20)]'
                    : 'border-[#e7e3d3] bg-white text-[#1a1a2e]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${
                      card.primary
                        ? 'bg-white/20 text-white'
                        : 'bg-[#fff4d5] text-[#a35200]'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {!card.primary ? card.badge : null}
                </div>
                <p
                  className={`mt-4 text-[13px] font-semibold ${
                    card.primary ? 'text-white/80' : 'text-[#1a1a2e]/55'
                  }`}
                >
                  {card.title}
                </p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-3xl font-black">{card.value}</span>
                  {card.unit ? (
                    <span
                      className={`pb-1 text-sm font-bold ${
                        card.primary ? 'text-white/70' : 'text-[#1a1a2e]/45'
                      }`}
                    >
                      {card.unit}
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-2 text-xs ${
                    card.primary ? 'text-white/70' : 'text-[#1a1a2e]/45'
                  }`}
                >
                  {card.caption}
                </p>
              </Link>
            );
          })}
        </section>
      </div>

      <section className="rounded-[20px] border border-[#e7e3d3] bg-white px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {presetButtons.map((item) => (
              <Button
                key={item.preset}
                type="button"
                size="sm"
                intent="neutral"
                className={`rounded-[11px] ${getPresetButtonClass(draft.preset === item.preset)}`}
                onClick={() => handlePresetApply(item.preset)}
              >
                {item.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              intent="neutral"
              className="rounded-[11px] border-[#e7e3d3] bg-white text-[#1a1a2e] hover:bg-[#f5f3e8]"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              새로고침
            </Button>
          </div>

          {isCustomRangeVisible ? (
            <div className="grid gap-2 sm:grid-cols-[10rem_10rem_auto]">
              <Input
                type="date"
                size="sm"
                value={draft.from}
                className="rounded-[11px] border-[#e7e3d3] bg-[#fdfcf4]"
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
                className="rounded-[11px] border-[#e7e3d3] bg-[#fdfcf4]"
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    preset: 'CUSTOM',
                    to: event.target.value,
                  }))
                }
              />
              <Button
                type="button"
                size="sm"
                intent="neutral"
                className="rounded-[11px] !border-[#f59e0b] !bg-[#f59e0b] !text-white hover:!bg-[#d97706]"
                onClick={handleApplyCustomRange}
              >
                기간 적용
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.78fr)]">
        <div className="space-y-5">
          <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1a1a2e]">
                  처리 우선 주문
                </h2>
                <p className="mt-1 text-sm text-[#1a1a2e]/50">
                  입금 확인과 배송 전환이 필요한 주문입니다.
                </p>
              </div>
              <Link
                href="/admin/orders?stage=PAYMENT_PENDING"
                className="inline-flex items-center gap-1.5 rounded-[11px] border border-[#e7e3d3] bg-white px-3 py-2 text-xs font-bold text-[#1a1a2e] transition hover:bg-[#f5f3e8]"
              >
                주문 운영
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 pb-3 text-xs font-semibold text-[#1a1a2e]/45">
                      입금자명
                    </th>
                    <th className="px-3 pb-3 text-xs font-semibold text-[#1a1a2e]/45">
                      상품 수
                    </th>
                    <th className="px-3 pb-3 text-xs font-semibold text-[#1a1a2e]/45">
                      금액
                    </th>
                    <th className="px-3 pb-3 text-xs font-semibold text-[#1a1a2e]/45">
                      기준시각
                    </th>
                    <th className="px-3 pb-3 text-right text-xs font-semibold text-[#1a1a2e]/45">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.queues.urgent_orders.length === 0 ? (
                    <tr className="border-t border-[#f1eee2]">
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-sm text-[#1a1a2e]/45"
                      >
                        즉시 처리 대상 주문이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    data.queues.urgent_orders.map((order, index) => {
                      const canConfirmPayment =
                        Boolean(order.order_id) &&
                        order.stage === 'PAYMENT_PENDING';
                      const isConfirming =
                        confirmingOrderId === order.order_id &&
                        confirmPayment.isPending;

                      return (
                        <tr
                          key={`${order.order_id || order.order_no || 'order'}-${index}`}
                          className="border-t border-[#f1eee2]"
                        >
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-[#1a1a2e]">
                            {order.depositor_name || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#1a1a2e]/70">
                            <OrderProductSummaryCell
                              order={order}
                              onOpen={handleOpenProductOverlay}
                              onClose={handleCloseProductOverlay}
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-[#1a1a2e]">
                            {formatCurrency(order.grand_total, currencyCode)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-[#1a1a2e]/45">
                            {formatDateTime(
                              order.placed_at || order.created_at,
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right">
                            <Button
                              type="button"
                              size="sm"
                              intent="neutral"
                              disabled={
                                !canConfirmPayment || confirmPayment.isPending
                              }
                              className="rounded-[10px] !border-[#f59e0b] !bg-[#f59e0b] !text-white hover:!bg-[#d97706] disabled:!border-[#e7e3d3] disabled:!bg-[#f5f3e8] disabled:!text-[#9b9788]"
                              onClick={() => handleConfirmPayment(order)}
                            >
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden
                              />
                              {isConfirming ? '처리중' : '입금 확인'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {productOverlay ? (
            createPortal(
              <OrderProductFloatingOverlay
                overlay={productOverlay}
                currencyCode={currencyCode}
              />,
              document.body,
            )
          ) : null}

          <section className="rounded-[22px] border border-[#cde0f3] bg-[#f0f7ff] p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1a1a2e]">
                  현재 진행중인 팝업
                </h2>
                <p className="mt-1 text-sm text-[#1a1a2e]/50">
                  활성화된 팝업 캠페인의 운영 기간과 상태를 확인합니다.
                </p>
              </div>
              <span className="rounded-[8px] bg-[#66B5F3] px-2.5 py-1 text-[11px] font-black text-white">
                진행중
              </span>
            </div>

            {popupsLoading ? (
              <p className="rounded-[16px] border border-dashed border-[#cde0f3] bg-white/70 px-3 py-8 text-center text-sm text-[#1a1a2e]/50">
                팝업 정보를 불러오는 중입니다.
              </p>
            ) : currentPopup ? (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-[#1a1a2e]">
                    {currentPopup.name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#4a88b9]">
                    {formatDateLabel(currentPopup.starts_at)} ~{' '}
                    {formatDateLabel(currentPopup.ends_at)}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#1a1a2e]/60">
                    {currentPopup.description || '등록된 설명이 없습니다.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:min-w-72">
                  <div>
                    <p className="text-[11px] font-semibold text-[#1a1a2e]/50">
                      캠페인 코드
                    </p>
                    <p className="mt-1 truncate text-lg font-black text-[#1a1a2e]">
                      {currentPopup.code || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-[#1a1a2e]/50">
                      최근 수정
                    </p>
                    <p className="mt-1 text-lg font-black text-[#1a1a2e]">
                      {formatDateLabel(currentPopup.updated_at)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/admin/v2-catalog/campaigns/${currentPopup.id}`}
                  className="inline-flex w-fit items-center gap-1.5 rounded-[11px] bg-[#1a1a2e] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2c2c43] md:col-span-2"
                >
                  팝업 상세 보기
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-[#cde0f3] bg-white/70 px-3 py-8 text-center">
                <p className="text-sm font-bold text-[#1a1a2e]">
                  진행중인 팝업이 없습니다.
                </p>
                <Link
                  href="/admin/v2-catalog/campaigns"
                  className="mt-2 inline-flex text-xs font-bold text-[#4a88b9]"
                >
                  캠페인 관리로 이동
                </Link>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#1a1a2e]">주문 단계</h2>
              <span className="text-xs font-bold text-[#1a1a2e]/45">
                {formatNumber(stageTotal)}건
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {orderStageEntries.map(([stage, count]) => {
                const numericCount = Number(count || 0);
                const ratio =
                  stageTotal > 0
                    ? Math.round((numericCount / stageTotal) * 100)
                    : 0;
                const tone = getStageTone(stage as V2AdminDashboardOrderStage);
                return (
                  <div key={stage} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#1a1a2e]/65">
                        {tone.label}
                      </span>
                      <span className="font-bold text-[#1a1a2e]">
                        {formatNumber(numericCount)}건
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f1eee2]">
                      <div
                        className="h-full rounded-full bg-[#f59e0b]"
                        style={{
                          width: `${numericCount > 0 ? Math.max(5, ratio) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#1a1a2e]">
                운영 리스크
              </h2>
              <Link
                href="/admin/v2-ops"
                className="text-xs font-bold text-[#a35200]"
              >
                전체보기
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {riskItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex items-center gap-3 rounded-[14px] bg-[#f9f9ed] px-3 py-3 transition hover:bg-[#f5f3e8]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white text-[#a35200]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[#1a1a2e]">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-[#1a1a2e]/45">
                        {item.detail}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-black text-[#1a1a2e]">
                        {item.value}
                      </span>
                      <span className="mt-1 block">{item.badge}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#1a1a2e]">승인 대기</h2>
              <Link
                href="/admin/v2-ops"
                className="text-xs font-bold text-[#a35200]"
              >
                전체보기
              </Link>
            </div>
            <ul className="space-y-2">
              {data.queues.pending_approvals.length === 0 ? (
                <li className="rounded-[14px] border border-dashed border-[#e7e3d3] bg-[#f9f9ed] px-3 py-4 text-sm text-[#1a1a2e]/45">
                  대기중인 승인 요청이 없습니다.
                </li>
              ) : (
                data.queues.pending_approvals.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[14px] bg-[#f9f9ed] px-3 py-3"
                  >
                    <p className="truncate text-sm font-bold text-[#1a1a2e]">
                      {item.action_key}
                    </p>
                    <p className="mt-1 text-xs text-[#1a1a2e]/50">
                      role: {item.assignee_role_code || '-'} / 요청{' '}
                      {formatDateTime(item.requested_at)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#1a1a2e]">
                최근 실패 액션
              </h2>
              <Link
                href="/admin/v2-ops"
                className="text-xs font-bold text-[#a35200]"
              >
                감사 로그
              </Link>
            </div>
            <ul className="space-y-2">
              {data.queues.failed_actions.length === 0 ? (
                <li className="rounded-[14px] border border-dashed border-[#e7e3d3] bg-[#f9f9ed] px-3 py-4 text-sm text-[#1a1a2e]/45">
                  최근 실패 액션이 없습니다.
                </li>
              ) : (
                data.queues.failed_actions.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[14px] bg-[#fff7f7] px-3 py-3"
                  >
                    <p className="truncate text-sm font-bold text-[#1a1a2e]">
                      {item.action_key}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#ca2a30]">
                      {item.resource_type || '-'} /{' '}
                      {item.error_message || '에러 메시지 없음'}
                    </p>
                    <p className="mt-1 text-xs text-[#1a1a2e]/45">
                      {formatDateTime(item.created_at)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#1a1a2e]">배치 상태</h2>
              <Banknote className="h-4 w-4 text-[#f59e0b]" aria-hidden />
            </div>
            <div className="space-y-4">
              {batchGroups.map((group) => (
                <div key={group.title}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Link
                      href={group.href}
                      className="text-sm font-bold text-[#1a1a2e] hover:text-[#a35200]"
                    >
                      {group.title}
                    </Link>
                    <span className="text-xs font-bold text-[#1a1a2e]/45">
                      total {formatNumber(group.total)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.rows.map(([label, value]) => (
                      <div
                        key={`${group.title}-${label}`}
                        className="rounded-[12px] bg-[#f9f9ed] px-3 py-2"
                      >
                        <p className="text-[11px] font-semibold text-[#1a1a2e]/45">
                          {label}
                        </p>
                        <p className="mt-0.5 text-base font-black text-[#1a1a2e]">
                          {formatNumber(Number(value || 0))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
