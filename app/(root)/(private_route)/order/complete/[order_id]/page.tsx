'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { useV2CheckoutOrder } from '@/lib/client/hooks/useV2Checkout';
import { groupV2OrderItems } from '@/lib/client/utils/v2-order-item-groups';
import { ApiError } from '@/lib/client/utils/api-error';
import {
  buildDistinctOptionCountByProduct,
  normalizeDisplayTitle,
  shouldShowOptionTitle,
} from '@/lib/client/utils/v2-item-display';

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function formatCurrency(amount: number): string {
  return `${Math.max(0, amount).toLocaleString()}원`;
}

function formatDateTime(value: string | null): string {
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

function mapStatusLabel(
  value: string,
  type: 'order' | 'payment' | 'fulfillment',
): string {
  const dictionary: Record<string, string> =
    type === 'order'
      ? {
          PENDING: '주문 대기',
          CONFIRMED: '주문 확정',
          CANCELED: '주문 취소',
          COMPLETED: '주문 완료',
        }
      : type === 'payment'
      ? {
          PENDING: '결제 대기',
          AUTHORIZED: '승인됨',
          CAPTURED: '결제 완료',
          FAILED: '결제 실패',
          CANCELED: '결제 취소',
          PARTIALLY_REFUNDED: '부분 환불',
          REFUNDED: '환불 완료',
        }
      : {
          UNFULFILLED: '미이행',
          PARTIAL: '부분 이행',
          FULFILLED: '이행 완료',
          CANCELED: '이행 취소',
        };

  return dictionary[value] || value || '-';
}

function badgeClass(value: string) {
  if (value.includes('FAILED') || value.includes('CANCELED')) {
    return 'bg-red-100 text-red-700';
  }
  if (value.includes('PENDING') || value.includes('UNFULFILLED')) {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-green-100 text-green-700';
}

export default function OrderCompletePage() {
  const params = useParams();
  const orderId = params.order_id as string;
  const { data: order, isLoading, error } = useV2CheckoutOrder(orderId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !order) {
    const hasAuthError = error instanceof ApiError && error.isAuthError();
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          title={hasAuthError ? '로그인이 필요합니다' : '주문 정보를 찾을 수 없습니다'}
          description={
            hasAuthError
              ? '로그인 후 주문 정보를 확인할 수 있습니다.'
              : error instanceof Error
              ? error.message
              : '주문 정보를 불러오는 중 문제가 발생했습니다.'
          }
          action={
            <Link href={hasAuthError ? '/login?redirect=/mypage' : '/mypage'}>
              <Button intent="primary" size="md">
                {hasAuthError ? '로그인하러 가기' : '마이페이지로 이동'}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemGroups = groupV2OrderItems(items as Array<Record<string, unknown>>);
  const optionCountByProductId = buildDistinctOptionCountByProduct({
    rows: items,
    getProductId: (rawItem) => readString(asObject(rawItem).product_id),
    getOptionId: (rawItem) => readString(asObject(rawItem).variant_id),
  });
  const itemDisplayById = new Map<
    string,
    { productTitle: string; optionTitle: string; showOptionTitle: boolean }
  >(
    items.map((rawItem, index) => {
      const item = asObject(rawItem);
      const display = asObject(item.display_snapshot);
      const itemId = readString(item.id) || `line-${index}`;
      const productId = normalizeDisplayTitle(readString(item.product_id));
      const productTitle =
        normalizeDisplayTitle(readString(item.product_name_snapshot)) ||
        normalizeDisplayTitle(readString(display.product_title)) ||
        readString(item.variant_id) ||
        `상품 ${index + 1}`;
      const optionTitle =
        normalizeDisplayTitle(readString(item.variant_name_snapshot)) ||
        normalizeDisplayTitle(readString(display.variant_title)) ||
        normalizeDisplayTitle(readString(display.title));
      const showOptionTitle = shouldShowOptionTitle({
        productTitle,
        optionTitle,
        distinctOptionCount: productId ? optionCountByProductId.get(productId) : undefined,
      });
      return [itemId, { productTitle, optionTitle, showOptionTitle }];
    }),
  );
  const hasShippingItem = items.some((rawItem) => {
    const display = asObject(asObject(rawItem).display_snapshot);
    return display.requires_shipping === true;
  });
  const shippingSnapshot = asObject(order.shipping_address_snapshot);
  const shippingLine1 = readString(shippingSnapshot.line1);

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-9 w-9 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">주문이 완료되었습니다</h1>
          <p className="mt-2 text-text-secondary">
            주문번호 <span className="font-semibold text-text-primary">{order.order_no}</span>
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            주문 시각: {formatDateTime(order.placed_at)}
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-text-primary">주문 상태</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-text-secondary">주문 상태</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(
                  order.order_status,
                )}`}
              >
                {mapStatusLabel(order.order_status, 'order')}
              </span>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-text-secondary">결제 상태</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(
                  order.payment_status,
                )}`}
              >
                {mapStatusLabel(order.payment_status, 'payment')}
              </span>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-text-secondary">이행 상태</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(
                  order.fulfillment_status,
                )}`}
              >
                {mapStatusLabel(order.fulfillment_status, 'fulfillment')}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Package className="h-5 w-5" />
            주문 상품
          </h2>
          <div className="mt-4 space-y-3">
            {itemGroups.map((group, index) => {
              const groupDisplay = itemDisplayById.get(group.id);
              const groupProductTitle = groupDisplay?.productTitle || group.title;
              const groupOptionTitle =
                groupDisplay?.showOptionTitle && groupDisplay.optionTitle
                  ? groupDisplay.optionTitle
                  : '';

              return (
                <div
                  key={group.key || `${group.id}-${index}`}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{groupProductTitle}</p>
                      {groupOptionTitle && (
                        <p className="text-sm text-text-secondary">{groupOptionTitle}</p>
                      )}
                      <p className="text-xs text-text-secondary">
                        {group.lineType === 'BUNDLE_PARENT' ? '번들 상품' : '일반 상품'} · 수량{' '}
                        {group.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-text-primary">
                      {formatCurrency(group.lineTotal)}
                    </p>
                  </div>

                  {group.components.length > 0 && (
                    <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-xs font-semibold text-text-secondary">
                        번들 구성품 {group.components.length}개
                      </p>
                      <div className="mt-2 space-y-2">
                        {group.components.map((component, componentIndex) => {
                          const componentDisplay = itemDisplayById.get(component.id);
                          const componentProductTitle =
                            componentDisplay?.productTitle || component.title;
                          const componentOptionTitle =
                            componentDisplay?.showOptionTitle && componentDisplay.optionTitle
                              ? componentDisplay.optionTitle
                              : '';

                          return (
                            <div
                              key={`${component.id}-${componentIndex}`}
                              className="flex items-start justify-between gap-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-text-primary">
                                  {componentProductTitle}
                                </p>
                                {componentOptionTitle && (
                                  <p className="text-xs text-text-secondary">
                                    {componentOptionTitle}
                                  </p>
                                )}
                                <p className="text-xs text-text-secondary">
                                  수량 {component.quantity}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-text-primary">
                                {formatCurrency(component.lineTotal)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-text-primary">결제 금액</h2>
          <dl className="mt-4 space-y-2 text-sm text-text-secondary">
            <div className="flex items-center justify-between">
              <dt>상품 금액</dt>
              <dd className="font-medium text-text-primary">
                {formatCurrency(order.subtotal_amount)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>상품 할인</dt>
              <dd>-{formatCurrency(order.item_discount_total)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>주문 할인</dt>
              <dd>-{formatCurrency(order.order_discount_total)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>배송비</dt>
              <dd>{formatCurrency(order.shipping_amount)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>배송 할인</dt>
              <dd>-{formatCurrency(order.shipping_discount_total)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>세금</dt>
              <dd>{formatCurrency(order.tax_total)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-base">
              <dt className="font-semibold text-text-primary">총 결제 금액</dt>
              <dd className="font-bold text-primary-700">
                {formatCurrency(order.grand_total)}
              </dd>
            </div>
          </dl>
        </section>

        {hasShippingItem && shippingLine1 && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-text-primary">배송 정보</h2>
            <div className="mt-3 space-y-1 text-sm text-text-secondary">
              <p>수령인: {readString(shippingSnapshot.recipient_name) || '-'}</p>
              <p>연락처: {readString(shippingSnapshot.phone) || '-'}</p>
              <p>
                주소: {readString(shippingSnapshot.line1)}{' '}
                {readString(shippingSnapshot.line2)}
              </p>
              {readString(shippingSnapshot.memo) && (
                <p>배송 메모: {readString(shippingSnapshot.memo)}</p>
              )}
            </div>
          </section>
        )}

        <section className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/mypage">
            <Button intent="primary" size="md">
              마이페이지로 이동
            </Button>
          </Link>
          <Link href="/shop">
            <Button intent="secondary" size="md">
              계속 쇼핑하기
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
