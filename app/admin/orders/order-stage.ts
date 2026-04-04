import type { V2AdminOrderLinearStage, V2AdminOrderQueueRow } from '@/lib/client/api/v2-admin-ops.api';

export function formatCurrency(amount: number): string {
  return `${Math.max(0, amount).toLocaleString()}원`;
}

export function formatDate(value: string | null): string {
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

export function truncateMiddle(value: string, front = 8, back = 4): string {
  if (value.length <= front + back + 1) {
    return value;
  }
  return `${value.slice(0, front)}...${value.slice(-back)}`;
}

export function compositionBadgeClass(type: 'BUNDLE' | 'DIGITAL' | 'PHYSICAL') {
  if (type === 'BUNDLE') {
    return 'bg-indigo-100 text-indigo-700';
  }
  if (type === 'DIGITAL') {
    return 'bg-sky-100 text-sky-700';
  }
  return 'bg-orange-100 text-orange-700';
}

export function linearStageLabel(stage: V2AdminOrderLinearStage): string {
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

export function isCanceledStatus(status: string): boolean {
  return status.toUpperCase().includes('CANCEL');
}

export function isCanceledOrder(row: V2AdminOrderQueueRow): boolean {
  return (
    isCanceledStatus(String(row.order_status || '')) ||
    isCanceledStatus(String(row.payment_status || '')) ||
    isCanceledStatus(String(row.fulfillment_status || ''))
  );
}

export function resolveLinearStageFromRow(
  row: V2AdminOrderQueueRow,
): V2AdminOrderLinearStage {
  const orderStatus = String(row.order_status || '').toUpperCase();
  const paymentStatus = String(row.payment_status || '').toUpperCase();
  const fulfillmentStatus = String(row.fulfillment_status || '').toUpperCase();

  if (paymentStatus === 'AUTHORIZED') {
    return 'PAYMENT_CONFIRMED';
  }

  const isPaymentCaptured = ['CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(
    paymentStatus,
  );
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
