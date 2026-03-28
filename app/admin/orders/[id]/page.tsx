'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  useV2AdminCutoverPolicyCheck,
  useV2AdminOrderDetail,
  useV2AdminRefundOrder,
} from '@/lib/client/hooks/useV2AdminOps';
import { groupV2OrderItems } from '@/lib/client/utils/v2-order-item-groups';
import { useToast } from '@/src/components/toast';

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeClass(status: string) {
  if (status.includes('FAILED') || status.includes('CANCELED') || status.includes('REJECTED')) {
    return 'bg-red-100 text-red-700';
  }
  if (status.includes('PENDING') || status.includes('UNFULFILLED') || status.includes('PARTIAL')) {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-green-100 text-green-700';
}

function lineTypeLabel(lineType: string): string {
  if (lineType === 'BUNDLE_PARENT') {
    return '번들';
  }
  if (lineType === 'BUNDLE_COMPONENT') {
    return '구성품';
  }
  return '일반';
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

function readFirstSnapshotText(
  snapshot: Record<string, unknown> | null,
  keys: string[],
): string {
  for (const key of keys) {
    const value = readSnapshotText(snapshot, key);
    if (value.length > 0) {
      return value;
    }
  }
  return '';
}

function resolveShippingPostalCode(snapshot: Record<string, unknown> | null): string {
  return readFirstSnapshotText(snapshot, [
    'postal_code',
    'postalCode',
    'zipcode',
    'zip_code',
    'zip',
  ]);
}

const BASE_SHIPPING_FEE = 3500;

const JEJU_POSTCODE_RANGES: ReadonlyArray<readonly [number, number]> = [[63000, 63644]];

const ISLAND_POSTCODE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [40200, 40240],
  [22386, 22388],
  [23004, 23010],
  [23100, 23136],
  [32133, 32133],
  [33411, 33411],
  [46768, 46771],
  [52570, 52571],
  [53031, 53033],
  [53089, 53104],
  [56347, 56349],
  [57068, 57069],
  [58760, 58762],
  [58800, 58810],
  [58816, 58818],
  [58828, 58866],
  [58953, 58958],
  [59102, 59103],
  [59106, 59106],
];

function isPostcodeInRanges(
  postcode: string,
  ranges: ReadonlyArray<readonly [number, number]>,
): boolean {
  const postcodeNumber = Number.parseInt(postcode, 10);
  if (!Number.isInteger(postcodeNumber)) {
    return false;
  }
  return ranges.some(([start, end]) => postcodeNumber >= start && postcodeNumber <= end);
}

function resolveShippingFeeTypeLabel(params: {
  shippingAmount: number;
  shippingPostcode: string;
}): string {
  const { shippingAmount, shippingPostcode } = params;

  const isRemotePostcode =
    shippingPostcode.length > 0 &&
    (isPostcodeInRanges(shippingPostcode, JEJU_POSTCODE_RANGES) ||
      isPostcodeInRanges(shippingPostcode, ISLAND_POSTCODE_RANGES));
  const hasRemoteSurcharge = shippingAmount > BASE_SHIPPING_FEE;

  return isRemotePostcode || hasRemoteSurcharge ? '산간지역 배송지' : '일반 배송비';
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { showToast } = useToast();
  const orderDetailQuery = useV2AdminOrderDetail(orderId || null);
  const refundOrderMutation = useV2AdminRefundOrder();
  const policyCheckMutation = useV2AdminCutoverPolicyCheck();

  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('운영자 수동 환불');

  const detail = orderDetailQuery.data;
  const order = detail?.order ? asObject(detail.order) : null;

  const orderItemGroups = useMemo(
    () => groupV2OrderItems((detail?.items || []) as Array<Record<string, unknown>>),
    [detail?.items],
  );
  const orderItemProductTitleById = useMemo(() => {
    const rows = (detail?.items || []) as Array<Record<string, unknown>>;
    const titleById = new Map<string, string>();

    for (const row of rows) {
      const itemId = readString(row.id);
      if (!itemId) {
        continue;
      }
      const display = asObject(row.display_snapshot);
      const productTitle =
        readString(row.product_name_snapshot) ||
        readString(display.product_title) ||
        readString(display.product_name);
      if (!productTitle) {
        continue;
      }
      titleById.set(itemId, productTitle);
    }

    return titleById;
  }, [detail?.items]);
  const shippingAddressSnapshot = useMemo(() => {
    const raw = order?.shipping_address_snapshot;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
    return null;
  }, [order?.shipping_address_snapshot]);
  const shippingPostcode = resolveShippingPostalCode(shippingAddressSnapshot);
  const shippingAmount = readNumber(order?.shipping_amount);
  const shippingDiscountTotal = readNumber(order?.shipping_discount_total);
  const netShippingAmount = Math.max(0, shippingAmount - shippingDiscountTotal);
  const shippingFeeTypeLabel = resolveShippingFeeTypeLabel({
    shippingAmount,
    shippingPostcode,
  });
  const hasShippingFeeLine = shippingAmount > 0 || shippingDiscountTotal > 0;
  const grandTotalAmount = readNumber(order?.grand_total);

  async function handleRefundOrder() {
    if (!orderId) {
      return;
    }

    const amount = refundAmount.trim() ? Number(refundAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      showToast('환불 금액은 1 이상의 숫자여야 합니다.', { type: 'warning' });
      return;
    }

    try {
      const policy = await policyCheckMutation.mutateAsync({
        action_key: 'ORDER_REFUND_EXECUTE',
        requires_approval: true,
      });

      if (policy.decision === 'APPROVAL_REQUIRED') {
        showToast(
          '현재 정책상 환불은 승인 요청이 필요합니다. 승인 워크플로우를 먼저 진행하세요.',
          { type: 'warning' },
        );
        return;
      }

      await refundOrderMutation.mutateAsync({
        orderId,
        data: {
          amount,
          reason: refundReason.trim() || null,
        },
      });
      showToast('환불 요청을 실행했습니다.', { type: 'success' });
      await orderDetailQuery.refetch();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '환불 처리 중 오류가 발생했습니다.', {
        type: 'error',
      });
    }
  }

  if (orderDetailQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (orderDetailQuery.error || !detail || !order) {
    return (
      <div className="min-h-[60vh]">
        <EmptyState
          title="주문 상세를 불러오지 못했습니다"
          description={
            orderDetailQuery.error instanceof Error
              ? orderDetailQuery.error.message
              : '잠시 후 다시 시도해 주세요.'
          }
          action={
            <Link href="/admin/orders">
              <Button intent="secondary" size="sm">
                주문 목록으로 이동
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-blue-600 hover:text-blue-800">
            ← 목록으로
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            주문 상세 (v2) {readString(order.order_no)}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Order ID: {readString(order.id)}</p>
        </div>
        <Button
          intent="secondary"
          size="sm"
          onClick={() => {
            void orderDetailQuery.refetch();
          }}
        >
          새로고침
        </Button>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">상태 3축</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">주문 상태</p>
            <span
              className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                readString(order.order_status),
              )}`}
            >
              {readString(order.order_status)}
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">결제 상태</p>
            <span
              className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                readString(order.payment_status),
              )}`}
            >
              {readString(order.payment_status)}
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">이행 상태</p>
            <span
              className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                readString(order.fulfillment_status),
              )}`}
            >
              {readString(order.fulfillment_status)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">주문/이행 요약</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2">
          <div>
            <dt className="text-gray-500">주문 시각</dt>
            <dd>{formatDate(readString(order.placed_at) || null)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">총 결제 금액</dt>
            <dd className="font-semibold">{formatCurrency(readNumber(order.grand_total))}</dd>
          </div>
          <div>
            <dt className="text-gray-500">활성 배송 건수</dt>
            <dd>{detail.queue_row?.active_shipment_count ?? 0}</dd>
          </div>
          <div>
            <dt className="text-gray-500">활성 디지털 이행 건수</dt>
            <dd>{detail.queue_row?.active_entitlement_count ?? 0}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">주문 아이템</h2>
        <div className="mt-4 space-y-3">
          {orderItemGroups.length === 0 ? (
            <p className="text-sm text-gray-500">주문 아이템이 없습니다.</p>
          ) : (
            orderItemGroups.map((group, index) => (
              <div
                key={group.key || `${group.id}-${index}`}
                className="rounded-lg border border-gray-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">
                    {orderItemProductTitleById.get(group.id) || group.title}
                  </p>
                  <p className="font-semibold text-gray-900">{formatCurrency(group.lineTotal)}</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {lineTypeLabel(group.lineType)} · 수량 {group.quantity} · 상태{' '}
                  {group.lineStatus || '-'}
                </p>

                {group.components.length > 0 && (
                  <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-700">
                      구성품 {group.components.length}개
                    </p>
                    <div className="mt-2 space-y-2">
                      {group.components.map((component, componentIndex) => (
                        <div key={`${component.id}-${componentIndex}`} className="flex items-start gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {orderItemProductTitleById.get(component.id) || component.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              수량 {component.quantity} · 상태 {component.lineStatus || '-'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {hasShippingFeeLine && (
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-gray-900">{shippingFeeTypeLabel}</p>
              <p className="font-semibold text-gray-900">{formatCurrency(netShippingAmount)}</p>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-semibold text-blue-700">총 결제 금액</p>
            <p className="text-2xl font-extrabold text-blue-900">{formatCurrency(grandTotalAmount)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">운영 액션</h2>
        <p className="mt-1 text-sm text-gray-500">
          환불 실행 전에 cutover-policy를 확인해 승인 필요 여부를 판정합니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={refundAmount}
            onChange={(event) => setRefundAmount(event.target.value)}
            placeholder="환불 금액(전체 환불은 비워두기)"
          />
          <Input
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
            placeholder="환불 사유"
          />
          <Button
            intent="danger"
            size="md"
            loading={refundOrderMutation.isPending || policyCheckMutation.isPending}
            onClick={() => void handleRefundOrder()}
          >
            환불 실행
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">승인/감사 이력</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-3">
            <h3 className="font-medium text-gray-900">Action Logs</h3>
            <div className="mt-2 space-y-2">
              {detail.action_logs.length === 0 ? (
                <p className="text-sm text-gray-500">기록이 없습니다.</p>
              ) : (
                detail.action_logs.map((log) => (
                  <div key={log.id} className="rounded-md bg-gray-50 p-2 text-xs">
                    <p className="font-semibold text-gray-900">{log.action_key}</p>
                    <p className="text-gray-600">
                      상태: {log.action_status} · {formatDate(log.created_at)}
                    </p>
                    {log.error_message && (
                      <p className="text-red-600">에러: {log.error_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <h3 className="font-medium text-gray-900">Approvals</h3>
            <div className="mt-2 space-y-2">
              {detail.approvals.length === 0 ? (
                <p className="text-sm text-gray-500">승인 요청이 없습니다.</p>
              ) : (
                detail.approvals.map((approval) => (
                  <div key={approval.id} className="rounded-md bg-gray-50 p-2 text-xs">
                    <p className="font-semibold text-gray-900">
                      상태: {approval.status}
                    </p>
                    <p className="text-gray-600">
                      요청: {formatDate(approval.requested_at)}
                    </p>
                    {approval.decision_note && (
                      <p className="text-gray-700">메모: {approval.decision_note}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
