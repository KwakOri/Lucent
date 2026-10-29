/**
 * 주문 완료·마이페이지에서 무통장 입금 안내를 보여 줄지 정한다.
 *
 * - PAID: 결제가 확인된 주문(AUTHORIZED/CAPTURED). 입금 안내를 숨긴다.
 * - NO_PAYMENT_DUE: 결제할 금액이 0원이지만 아직 결제 확인 전인 주문. 입금 안내를 숨긴다.
 * - BANK_TRANSFER: 그 밖의 주문. 지금처럼 입금 안내를 보여 준다.
 */
export type V2OrderPaymentNotice = 'PAID' | 'NO_PAYMENT_DUE' | 'BANK_TRANSFER';

const PAYMENT_CONFIRMED_STATUSES = new Set(['AUTHORIZED', 'CAPTURED']);

export function resolveV2OrderPaymentNotice(input: {
  paymentStatus: string | null | undefined;
  payableAmount: number;
}): V2OrderPaymentNotice {
  const paymentStatus = String(input.paymentStatus || '').toUpperCase();
  if (PAYMENT_CONFIRMED_STATUSES.has(paymentStatus)) {
    return 'PAID';
  }
  if (input.payableAmount <= 0) {
    return 'NO_PAYMENT_DUE';
  }
  return 'BANK_TRANSFER';
}
