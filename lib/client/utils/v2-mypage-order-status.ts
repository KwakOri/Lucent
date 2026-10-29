import type { V2OrderDigitalEntitlementSummary } from '@/lib/client/api/v2-checkout.api';

export type MyPageLinearStatus =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PRODUCTION'
  | 'READY_TO_SHIP'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELED'
  | 'FAILED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface MyPageLinearStatusInput {
  orderStatus: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  items: Array<{ isDigital: boolean }>;
  digitalEntitlementSummary?: V2OrderDigitalEntitlementSummary | null;
}

function includesCanceledStatus(status: string | undefined): boolean {
  return String(status || '').toUpperCase().includes('CANCEL');
}

function hasAllDigitalEntitlementsGranted(
  summary: V2OrderDigitalEntitlementSummary | null | undefined,
): boolean {
  if (!summary) {
    return false;
  }
  return summary.total > 0 && summary.granted === summary.total;
}

export function resolveMyPageLinearStatus(order: MyPageLinearStatusInput): MyPageLinearStatus {
  const orderStatus = String(order.orderStatus || '').toUpperCase();
  const paymentStatus = String(order.paymentStatus || '').toUpperCase();
  const fulfillmentStatus = String(order.fulfillmentStatus || '').toUpperCase();
  const hasPhysicalItem = order.items.some((item) => !item.isDigital);

  if (
    includesCanceledStatus(orderStatus) ||
    includesCanceledStatus(paymentStatus) ||
    includesCanceledStatus(fulfillmentStatus)
  ) {
    return 'CANCELED';
  }

  if (paymentStatus === 'FAILED') {
    return 'FAILED';
  }

  if (paymentStatus === 'REFUNDED') {
    return 'REFUNDED';
  }

  if (paymentStatus === 'PARTIALLY_REFUNDED') {
    return 'PARTIALLY_REFUNDED';
  }

  if (!paymentStatus || paymentStatus === 'PENDING') {
    return 'PAYMENT_PENDING';
  }

  if (paymentStatus === 'AUTHORIZED') {
    return 'PAYMENT_CONFIRMED';
  }

  if (orderStatus === 'COMPLETED' || fulfillmentStatus === 'FULFILLED') {
    return 'COMPLETED';
  }

  // 디지털 전용 주문은 결제 확정 뒤 권한이 모두 발급되면 완료로 본다(관리자 대시보드 판정과 같은 기준).
  // 목록 응답에 권한 요약이 없거나 null이면 아래 기존 규칙을 따른다.
  if (
    !hasPhysicalItem &&
    paymentStatus === 'CAPTURED' &&
    hasAllDigitalEntitlementsGranted(order.digitalEntitlementSummary)
  ) {
    return 'COMPLETED';
  }

  if (fulfillmentStatus === 'PARTIAL') {
    return hasPhysicalItem ? 'IN_TRANSIT' : 'PRODUCTION';
  }

  if (fulfillmentStatus === 'UNFULFILLED') {
    return hasPhysicalItem ? 'READY_TO_SHIP' : 'PRODUCTION';
  }

  return hasPhysicalItem ? 'READY_TO_SHIP' : 'PRODUCTION';
}
