import { describe, expect, it } from 'vitest';
import { resolveV2OrderPaymentNotice } from '@/lib/client/utils/v2-order-payment-notice';

describe('resolveV2OrderPaymentNotice', () => {
  it('hides the bank transfer guide for a 0-won order that is still pending', () => {
    expect(
      resolveV2OrderPaymentNotice({ paymentStatus: 'PENDING', payableAmount: 0 }),
    ).toBe('NO_PAYMENT_DUE');
  });

  it('treats a 0-won order captured right after creation as paid', () => {
    expect(
      resolveV2OrderPaymentNotice({ paymentStatus: 'CAPTURED', payableAmount: 0 }),
    ).toBe('PAID');
  });

  it('keeps the bank transfer guide for a paid order waiting for deposit', () => {
    expect(
      resolveV2OrderPaymentNotice({ paymentStatus: 'PENDING', payableAmount: 12000 }),
    ).toBe('BANK_TRANSFER');
  });

  it('hides the bank transfer guide once a paid order is captured', () => {
    expect(
      resolveV2OrderPaymentNotice({ paymentStatus: 'CAPTURED', payableAmount: 12000 }),
    ).toBe('PAID');
  });

  it('hides the bank transfer guide once a paid order is authorized', () => {
    expect(
      resolveV2OrderPaymentNotice({ paymentStatus: 'AUTHORIZED', payableAmount: 12000 }),
    ).toBe('PAID');
  });

  it('keeps the bank transfer guide when the payment status is missing on a paid order', () => {
    expect(resolveV2OrderPaymentNotice({ paymentStatus: undefined, payableAmount: 12000 })).toBe(
      'BANK_TRANSFER',
    );
    expect(resolveV2OrderPaymentNotice({ paymentStatus: null, payableAmount: 12000 })).toBe(
      'BANK_TRANSFER',
    );
  });

  it('does not treat failed, canceled or refunded payments as paid', () => {
    for (const paymentStatus of ['FAILED', 'CANCELED', 'PARTIALLY_REFUNDED', 'REFUNDED']) {
      expect(resolveV2OrderPaymentNotice({ paymentStatus, payableAmount: 12000 })).toBe(
        'BANK_TRANSFER',
      );
    }
  });
});
