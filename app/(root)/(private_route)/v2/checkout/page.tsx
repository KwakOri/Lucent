'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  useV2ApplyPaymentCallback,
  useV2CancelOrder,
  useV2CheckoutCart,
  useV2CheckoutOrder,
  useV2CreateOrder,
  useV2OrderDebug,
  useV2RefundOrder,
  useV2ValidateCheckout,
} from '@/lib/client/hooks/useV2Checkout';
import type {
  CreateV2OrderData,
  V2CreateOrderResult,
  V2ValidateCheckoutResult,
} from '@/lib/client/api/v2-checkout.api';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybe.response?.data?.message) {
      return maybe.response.data.message;
    }
    if (maybe.message) {
      return maybe.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalObject(
  raw: string,
  fieldName: string,
): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = JSON.parse(trimmed);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${fieldName}은 JSON object여야 합니다.`);
  }
  return parsed as Record<string, unknown>;
}

function parseOptionalNumber(raw: string, fieldName: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName}은 숫자여야 합니다.`);
  }
  return parsed;
}

const PAYMENT_STATUS_OPTIONS = [
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'CANCELED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;

export default function V2CheckoutPage() {
  const [campaignId, setCampaignId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [channel, setChannel] = useState('WEB');
  const [shippingAmount, setShippingAmount] = useState('');

  const [idempotencyKey, setIdempotencyKey] = useState(
    `v2-${Date.now().toString(36)}`,
  );
  const [customerSnapshotText, setCustomerSnapshotText] = useState(
    '{"name":"V2 테스트 사용자"}',
  );
  const [billingAddressText, setBillingAddressText] = useState('');
  const [shippingAddressText, setShippingAddressText] = useState('');
  const [orderMetadataText, setOrderMetadataText] = useState(
    '{"source":"v2-checkout-page"}',
  );

  const [orderIdInput, setOrderIdInput] = useState('');
  const [cancelReason, setCancelReason] = useState('테스트 취소');

  const [paymentExternalRef, setPaymentExternalRef] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('CAPTURED');
  const [paymentProvider, setPaymentProvider] = useState('manual');
  const [paymentMethod, setPaymentMethod] = useState('MANUAL');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRefundedTotal, setPaymentRefundedTotal] = useState('');
  const [paymentMetadataText, setPaymentMetadataText] = useState('{}');

  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('테스트 환불');
  const [refundExternalRef, setRefundExternalRef] = useState('');
  const [refundMetadataText, setRefundMetadataText] = useState('{}');

  const [lastValidateResult, setLastValidateResult] =
    useState<V2ValidateCheckoutResult | null>(null);
  const [lastCreateResult, setLastCreateResult] =
    useState<V2CreateOrderResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [debugOrderId, setDebugOrderId] = useState<string | null>(null);

  const {
    data: cart,
    isLoading: cartLoading,
    error: cartError,
    refetch: refetchCart,
  } = useV2CheckoutCart();

  const validateCheckout = useV2ValidateCheckout();
  const createOrder = useV2CreateOrder();
  const cancelOrder = useV2CancelOrder();
  const applyPaymentCallback = useV2ApplyPaymentCallback();
  const refundOrder = useV2RefundOrder();

  const activeOrderId = orderIdInput.trim() || null;
  const {
    data: activeOrder,
    isLoading: orderLoading,
    error: orderError,
    refetch: refetchOrder,
  } = useV2CheckoutOrder(activeOrderId);

  const {
    data: debugData,
    isLoading: debugLoading,
    error: debugError,
    refetch: refetchDebug,
  } = useV2OrderDebug(debugOrderId);

  async function handleValidateCheckout() {
    setActionMessage(null);
    setActionError(null);

    try {
      const payload = {
        campaign_id: toNullable(campaignId),
        coupon_code: toNullable(couponCode),
        channel: toNullable(channel),
        shipping_amount: parseOptionalNumber(shippingAmount, 'shipping_amount'),
      };
      const result = await validateCheckout.mutateAsync(payload);
      setLastValidateResult(result);
      setActionMessage('validate 결과를 갱신했습니다.');
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleCreateOrder() {
    setActionMessage(null);
    setActionError(null);

    try {
      if (!idempotencyKey.trim()) {
        throw new Error('idempotency_key는 필수입니다.');
      }

      const payload: CreateV2OrderData = {
        idempotency_key: idempotencyKey.trim(),
        campaign_id: toNullable(campaignId),
        coupon_code: toNullable(couponCode),
        channel: toNullable(channel),
        shipping_amount: parseOptionalNumber(shippingAmount, 'shipping_amount'),
        customer_snapshot: parseOptionalObject(
          customerSnapshotText,
          'customer_snapshot',
        ),
        billing_address_snapshot: parseOptionalObject(
          billingAddressText,
          'billing_address_snapshot',
        ),
        shipping_address_snapshot: parseOptionalObject(
          shippingAddressText,
          'shipping_address_snapshot',
        ),
        metadata: parseOptionalObject(orderMetadataText, 'metadata'),
      };

      const result = await createOrder.mutateAsync(payload);
      setLastCreateResult(result);
      setOrderIdInput(result.order.id);
      setActionMessage(`주문 생성 성공: ${result.order.order_no}`);
      setIdempotencyKey(`v2-${Date.now().toString(36)}`);
      await refetchCart();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleCancelOrder() {
    if (!activeOrderId) {
      setActionError('취소할 order_id를 입력하세요.');
      return;
    }

    setActionMessage(null);
    setActionError(null);

    try {
      await cancelOrder.mutateAsync({
        orderId: activeOrderId,
        data: { reason: toNullable(cancelReason) },
      });
      setActionMessage('주문 취소 요청을 완료했습니다.');
      await refetchOrder();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handlePaymentCallback() {
    if (!activeOrderId) {
      setActionError('결제 콜백 적용할 order_id를 입력하세요.');
      return;
    }

    setActionMessage(null);
    setActionError(null);

    try {
      await applyPaymentCallback.mutateAsync({
        orderId: activeOrderId,
        data: {
          external_reference: paymentExternalRef.trim() || `pay-${Date.now()}`,
          status: paymentStatus as
            | 'AUTHORIZED'
            | 'CAPTURED'
            | 'FAILED'
            | 'CANCELED'
            | 'PARTIALLY_REFUNDED'
            | 'REFUNDED',
          provider: toNullable(paymentProvider),
          method: toNullable(paymentMethod),
          amount: parseOptionalNumber(paymentAmount, 'amount'),
          refunded_total: parseOptionalNumber(
            paymentRefundedTotal,
            'refunded_total',
          ),
          metadata: parseOptionalObject(paymentMetadataText, 'payment metadata'),
        },
      });
      setActionMessage('결제 콜백 적용 성공');
      await refetchOrder();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleRefundOrder() {
    if (!activeOrderId) {
      setActionError('환불할 order_id를 입력하세요.');
      return;
    }

    setActionMessage(null);
    setActionError(null);

    try {
      await refundOrder.mutateAsync({
        orderId: activeOrderId,
        data: {
          amount: parseOptionalNumber(refundAmount, 'refund amount'),
          reason: toNullable(refundReason),
          external_reference: toNullable(refundExternalRef),
          metadata: parseOptionalObject(refundMetadataText, 'refund metadata'),
        },
      });
      setActionMessage('환불 요청 성공');
      await refetchOrder();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleFetchDebug() {
    if (!activeOrderId) {
      setActionError('debug 조회할 order_id를 입력하세요.');
      return;
    }

    setActionMessage(null);
    setActionError(null);

    try {
      if (debugOrderId === activeOrderId) {
        await refetchDebug();
      } else {
        setDebugOrderId(activeOrderId);
      }
      setActionMessage('debug 조회를 요청했습니다.');
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          title="v2 cart 정보를 불러오지 못했습니다"
          description={getErrorMessage(cartError)}
          action={{
            label: '다시 시도',
            onClick: () => {
              void refetchCart();
            },
          }}
        />
      </div>
    );
  }

  const cartItems = cart?.items ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <section className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                v2 체크아웃 테스트 페이지
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                v2 validate/create/cancel/payment/refund/debug를 단일 화면에서 검증합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/v2/cart">
                <Button intent="secondary" size="sm">
                  v2 장바구니
                </Button>
              </Link>
              <Link href="/checkout">
                <Button intent="ghost" size="sm">
                  v1 체크아웃
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">현재 v2 cart 요약</h2>
            <Button
              intent="secondary"
              size="sm"
              onClick={() => {
                void refetchCart();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              cart 새로고침
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-neutral-100 px-4 py-3">
              item_count: <b>{cart?.item_count ?? 0}</b>
            </div>
            <div className="rounded-lg bg-neutral-100 px-4 py-3">
              quantity_total: <b>{cart?.quantity_total ?? 0}</b>
            </div>
            <div className="rounded-lg bg-neutral-100 px-4 py-3">
              cart_id: <b>{cart?.id ?? '-'}</b>
            </div>
          </div>

          {cartItems.length === 0 ? (
            <p className="text-sm text-amber-700">
              장바구니가 비어 있습니다. 먼저 <Link href="/v2/cart" className="underline">v2/cart</Link>에서 item을 추가하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-neutral-200 px-4 py-3 text-sm"
                >
                  <p className="font-medium text-text-primary">
                    {item.variant?.product?.title || item.variant?.title || item.variant_id}
                  </p>
                  <p className="text-text-secondary">
                    variant_id: {item.variant_id} / quantity: {item.quantity}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            validate / create 입력
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                campaign_id
              </label>
              <Input
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                coupon_code
              </label>
              <Input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                channel
              </label>
              <Input
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                shipping_amount
              </label>
              <Input
                value={shippingAmount}
                onChange={(event) => setShippingAmount(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                idempotency_key
              </label>
              <Input
                value={idempotencyKey}
                onChange={(event) => setIdempotencyKey(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                metadata (JSON)
              </label>
              <Input
                value={orderMetadataText}
                onChange={(event) => setOrderMetadataText(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                customer_snapshot (JSON)
              </label>
              <Textarea
                rows={3}
                value={customerSnapshotText}
                onChange={(event) => setCustomerSnapshotText(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                billing_address_snapshot (JSON)
              </label>
              <Textarea
                rows={3}
                value={billingAddressText}
                onChange={(event) => setBillingAddressText(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                shipping_address_snapshot (JSON)
              </label>
              <Textarea
                rows={3}
                value={shippingAddressText}
                onChange={(event) => setShippingAddressText(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              intent="secondary"
              onClick={() => {
                void handleValidateCheckout();
              }}
              loading={validateCheckout.isPending}
            >
              validate 실행
            </Button>
            <Button
              onClick={() => {
                void handleCreateOrder();
              }}
              loading={createOrder.isPending}
            >
              주문 생성
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">주문 조회/후속 액션</h2>
          <p className="text-sm text-amber-700">
            결제 콜백/환불/debug는 관리자 권한(또는 로컬 admin bypass)이 필요합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                order_id
              </label>
              <Input
                value={orderIdInput}
                onChange={(event) => setOrderIdInput(event.target.value)}
                placeholder="주문 생성 후 자동 입력됨"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                intent="secondary"
                onClick={() => {
                  void refetchOrder();
                }}
                disabled={!activeOrderId}
                loading={orderLoading}
              >
                주문 새로고침
              </Button>
              <Button
                intent="secondary"
                onClick={() => {
                  void handleFetchDebug();
                }}
                disabled={!activeOrderId}
                loading={debugLoading}
              >
                debug 조회
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
              <h3 className="font-medium text-text-primary">주문 취소</h3>
              <Input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="취소 사유"
              />
              <Button
                intent="ghost"
                onClick={() => {
                  void handleCancelOrder();
                }}
                loading={cancelOrder.isPending}
                disabled={!activeOrderId}
              >
                cancel 실행
              </Button>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
              <h3 className="font-medium text-text-primary">결제 콜백</h3>
              <Input
                value={paymentExternalRef}
                onChange={(event) => setPaymentExternalRef(event.target.value)}
                placeholder="external_reference"
              />
              <select
                className="w-full h-11 px-3 border border-neutral-200 rounded-lg text-sm"
                value={paymentStatus}
                onChange={(event) => setPaymentStatus(event.target.value)}
              >
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Input
                value={paymentProvider}
                onChange={(event) => setPaymentProvider(event.target.value)}
                placeholder="provider"
              />
              <Input
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                placeholder="method"
              />
              <Input
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="amount"
              />
              <Input
                value={paymentRefundedTotal}
                onChange={(event) => setPaymentRefundedTotal(event.target.value)}
                placeholder="refunded_total"
              />
              <Input
                value={paymentMetadataText}
                onChange={(event) => setPaymentMetadataText(event.target.value)}
                placeholder='{"source":"manual-callback"}'
              />
              <Button
                intent="ghost"
                onClick={() => {
                  void handlePaymentCallback();
                }}
                loading={applyPaymentCallback.isPending}
                disabled={!activeOrderId}
              >
                payment-callback 실행
              </Button>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
              <h3 className="font-medium text-text-primary">환불</h3>
              <Input
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                placeholder="amount (optional)"
              />
              <Input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="reason"
              />
              <Input
                value={refundExternalRef}
                onChange={(event) => setRefundExternalRef(event.target.value)}
                placeholder="external_reference"
              />
              <Input
                value={refundMetadataText}
                onChange={(event) => setRefundMetadataText(event.target.value)}
                placeholder='{"source":"manual-refund"}'
              />
              <Button
                intent="ghost"
                onClick={() => {
                  void handleRefundOrder();
                }}
                loading={refundOrder.isPending}
                disabled={!activeOrderId}
              >
                refund 실행
              </Button>
            </div>
          </div>
        </section>

        {actionMessage ? (
          <section className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
            {actionMessage}
          </section>
        ) : null}
        {actionError ? (
          <section className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {actionError}
          </section>
        ) : null}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <article className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
            <h3 className="font-semibold text-text-primary">
              validate 결과 (최근 실행)
            </h3>
            <pre className="text-xs bg-neutral-100 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(lastValidateResult, null, 2)}
            </pre>
          </article>

          <article className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
            <h3 className="font-semibold text-text-primary">
              create 결과 (최근 실행)
            </h3>
            <pre className="text-xs bg-neutral-100 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(lastCreateResult, null, 2)}
            </pre>
          </article>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
          <article className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
            <h3 className="font-semibold text-text-primary">
              order 조회 결과 {orderError ? '(오류)' : ''}
            </h3>
            {orderError ? (
              <p className="text-sm text-red-600">{getErrorMessage(orderError)}</p>
            ) : null}
            <pre className="text-xs bg-neutral-100 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(activeOrder, null, 2)}
            </pre>
          </article>

          <article className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
            <h3 className="font-semibold text-text-primary">
              debug 조회 결과 {debugError ? '(오류)' : ''}
            </h3>
            {debugError ? (
              <p className="text-sm text-red-600">{getErrorMessage(debugError)}</p>
            ) : null}
            <pre className="text-xs bg-neutral-100 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </article>
        </section>
      </div>
    </div>
  );
}
