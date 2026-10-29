import { describe, expect, it } from 'vitest';
import {
  resolveMyPageLinearStatus,
  type MyPageLinearStatusInput,
} from '@/lib/client/utils/v2-mypage-order-status';

const DIGITAL = { isDigital: true };
const PHYSICAL = { isDigital: false };

function capturedOrder(overrides: Partial<MyPageLinearStatusInput> = {}): MyPageLinearStatusInput {
  return {
    orderStatus: 'CONFIRMED',
    paymentStatus: 'CAPTURED',
    fulfillmentStatus: 'UNFULFILLED',
    items: [DIGITAL],
    ...overrides,
  };
}

describe('resolveMyPageLinearStatus', () => {
  it('(a) completes a captured digital-only order once every entitlement is granted', () => {
    expect(
      resolveMyPageLinearStatus(
        capturedOrder({
          items: [DIGITAL, DIGITAL],
          digitalEntitlementSummary: { total: 2, granted: 2 },
        }),
      ),
    ).toBe('COMPLETED');
  });

  it('(b) keeps a captured digital-only order in production while an entitlement is pending', () => {
    expect(
      resolveMyPageLinearStatus(
        capturedOrder({
          items: [DIGITAL, DIGITAL],
          digitalEntitlementSummary: { total: 2, granted: 1 },
        }),
      ),
    ).toBe('PRODUCTION');
  });

  it('(c) falls back to the existing rule when the summary is null or missing', () => {
    expect(
      resolveMyPageLinearStatus(capturedOrder({ digitalEntitlementSummary: null })),
    ).toBe('PRODUCTION');
    expect(resolveMyPageLinearStatus(capturedOrder())).toBe('PRODUCTION');
  });

  it('keeps production when the order has no entitlement rows yet', () => {
    expect(
      resolveMyPageLinearStatus(
        capturedOrder({ digitalEntitlementSummary: { total: 0, granted: 0 } }),
      ),
    ).toBe('PRODUCTION');
  });

  it('(d) leaves mixed physical and digital orders on the existing rule', () => {
    expect(
      resolveMyPageLinearStatus(
        capturedOrder({
          items: [PHYSICAL, DIGITAL],
          digitalEntitlementSummary: { total: 1, granted: 1 },
        }),
      ),
    ).toBe('READY_TO_SHIP');
  });

  it('(e) keeps a paid physical order waiting for deposit as payment pending', () => {
    expect(
      resolveMyPageLinearStatus({
        orderStatus: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        items: [PHYSICAL],
        digitalEntitlementSummary: { total: 0, granted: 0 },
      }),
    ).toBe('PAYMENT_PENDING');
  });

  it('keeps an authorized digital-only order as payment confirmed even when granted', () => {
    expect(
      resolveMyPageLinearStatus(
        capturedOrder({
          paymentStatus: 'AUTHORIZED',
          digitalEntitlementSummary: { total: 1, granted: 1 },
        }),
      ),
    ).toBe('PAYMENT_CONFIRMED');
  });

  it('does not override canceled or refunded orders', () => {
    const granted = { total: 1, granted: 1 };
    expect(
      resolveMyPageLinearStatus(
        capturedOrder({ orderStatus: 'CANCELED', digitalEntitlementSummary: granted }),
      ),
    ).toBe('CANCELED');
    expect(
      resolveMyPageLinearStatus(
        capturedOrder({ paymentStatus: 'REFUNDED', digitalEntitlementSummary: granted }),
      ),
    ).toBe('REFUNDED');
  });
});
