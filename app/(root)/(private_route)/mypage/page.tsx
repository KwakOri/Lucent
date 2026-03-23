'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import type { V2CheckoutOrder } from '@/lib/client/api/v2-checkout.api';
import {
  useLogout,
  useSession,
  useV2CancelOrder,
  useV2CheckoutOrders,
} from '@/lib/client/hooks';
import {
  buildDistinctOptionCountByProduct,
  normalizeDisplayTitle,
  shouldShowOptionTitle,
} from '@/lib/client/utils/v2-item-display';
import { groupV2OrderItems } from '@/lib/client/utils/v2-order-item-groups';
import { useToast } from '@/src/components/toast';

interface UnifiedOrderItem {
  id: string;
  title: string;
  optionTitle: string;
  thumbnailUrl: string | null;
  quantity: number;
  lineTotal: number;
  isDigital: boolean;
  itemStatus: string;
  lineType: 'STANDARD' | 'BUNDLE_PARENT' | 'BUNDLE_COMPONENT';
  components: Array<{
    id: string;
    title: string;
    optionTitle: string;
    thumbnailUrl: string | null;
    quantity: number;
    lineTotal: number;
    itemStatus: string;
  }>;
}

interface UnifiedOrder {
  id: string;
  profileId: string | null;
  orderNo: string;
  orderedAt: string;
  displayTotal: number;
  shippingAmount: number;
  shippingDiscountTotal: number;
  orderStatus: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  items: UnifiedOrderItem[];
}

type MyPageLinearStatus =
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

const ORDERS_PER_PAGE = 10;

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function mapV2Order(order: V2CheckoutOrder): UnifiedOrder {
  const rawItems = Array.isArray(order.items)
    ? ((order.items as Array<Record<string, unknown>>) ?? [])
    : [];
  const optionCountByProductId = buildDistinctOptionCountByProduct({
    rows: rawItems,
    getProductId: (rawItem) => {
      const item = asObject(rawItem);
      const display = asObject(item.display_snapshot);
      return (
        readString(item.product_id) ||
        readString(display.product_id) ||
        ''
      );
    },
    getOptionId: (rawItem) => readString(asObject(rawItem).variant_id),
  });
  const itemDisplayById = new Map<
    string,
    {
      productTitle: string;
      optionTitle: string;
      showOptionTitle: boolean;
      thumbnailUrl: string | null;
    }
  >(
    rawItems.map((rawItem, index) => {
      const item = asObject(rawItem);
      const display = asObject(item.display_snapshot);
      const itemId = readString(item.id) || `line-${index}`;
      const productId =
        normalizeDisplayTitle(readString(item.product_id)) ||
        normalizeDisplayTitle(readString(display.product_id));
      const productTitle =
        normalizeDisplayTitle(readString(item.product_name_snapshot)) ||
        normalizeDisplayTitle(readString(display.product_title)) ||
        normalizeDisplayTitle(readString(display.title)) ||
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
      const thumbnailUrl =
        normalizeDisplayTitle(readString(display.thumbnail_url)) || null;

      return [
        itemId,
        {
          productTitle,
          optionTitle,
          showOptionTitle,
          thumbnailUrl,
        },
      ];
    }),
  );

  const items: UnifiedOrderItem[] = groupV2OrderItems(
    rawItems,
  ).map((group, index) => {
    const groupDisplay = itemDisplayById.get(group.id);
    return {
      id: group.id || `${order.id}-${index}`,
      title: groupDisplay?.productTitle || group.title,
      optionTitle:
        groupDisplay?.showOptionTitle && groupDisplay.optionTitle
          ? groupDisplay.optionTitle
          : '',
      thumbnailUrl: groupDisplay?.thumbnailUrl ?? null,
      quantity: group.quantity,
      lineTotal: group.lineTotal,
      isDigital: !group.requiresShipping,
      itemStatus: group.lineStatus,
      lineType: group.lineType,
      components: group.components.map((component) => {
        const componentDisplay = itemDisplayById.get(component.id);
        return {
          id: component.id,
          title: componentDisplay?.productTitle || component.title,
          optionTitle:
            componentDisplay?.showOptionTitle && componentDisplay.optionTitle
              ? componentDisplay.optionTitle
              : '',
          thumbnailUrl: componentDisplay?.thumbnailUrl ?? null,
          quantity: component.quantity,
          lineTotal: component.lineTotal,
          itemStatus: component.lineStatus,
        };
      }),
    };
  });

  const recomputedGrandTotal =
    readNumber(order.subtotal_amount) -
    readNumber(order.item_discount_total) -
    readNumber(order.order_discount_total) +
    readNumber(order.shipping_amount) -
    readNumber(order.shipping_discount_total) +
    readNumber(order.tax_total);

  return {
    id: order.id,
    profileId: order.profile_id,
    orderNo: order.order_no,
    orderedAt: order.placed_at || '',
    displayTotal: Math.max(0, readNumber(order.grand_total), recomputedGrandTotal),
    shippingAmount: Math.max(0, readNumber(order.shipping_amount)),
    shippingDiscountTotal: Math.max(0, readNumber(order.shipping_discount_total)),
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    items,
  };
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: '대기',
    PAID: '입금확인',
    MAKING: '제작중',
    READY_TO_SHIP: '출고준비',
    SHIPPING: '배송중',
    DONE: '완료',
    CONFIRMED: '확정',
    COMPLETED: '완료',
    CANCELED: '취소',
    AUTHORIZED: '승인됨',
    CAPTURED: '결제완료',
    FAILED: '실패',
    PARTIALLY_REFUNDED: '부분환불',
    REFUNDED: '환불',
    UNFULFILLED: '미이행',
    PARTIAL: '부분이행',
    FULFILLED: '이행완료',
  };
  return labels[status] || status;
}

function includesCanceledStatus(status: string | undefined): boolean {
  return String(status || '').toUpperCase().includes('CANCEL');
}

function resolveMyPageLinearStatus(order: UnifiedOrder): MyPageLinearStatus {
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

  if (fulfillmentStatus === 'PARTIAL') {
    return hasPhysicalItem ? 'IN_TRANSIT' : 'PRODUCTION';
  }

  if (fulfillmentStatus === 'UNFULFILLED') {
    return hasPhysicalItem ? 'READY_TO_SHIP' : 'PRODUCTION';
  }

  return hasPhysicalItem ? 'READY_TO_SHIP' : 'PRODUCTION';
}

function myPageLinearStatusLabel(status: MyPageLinearStatus): string {
  if (status === 'PAYMENT_PENDING') {
    return '입금 대기';
  }
  if (status === 'PAYMENT_CONFIRMED') {
    return '입금 확인';
  }
  if (status === 'PRODUCTION') {
    return '제작중';
  }
  if (status === 'READY_TO_SHIP') {
    return '배송 준비';
  }
  if (status === 'IN_TRANSIT') {
    return '배송 중';
  }
  if (status === 'COMPLETED') {
    return '완료';
  }
  if (status === 'FAILED') {
    return '결제 실패';
  }
  if (status === 'PARTIALLY_REFUNDED') {
    return '부분 환불';
  }
  if (status === 'REFUNDED') {
    return '환불 완료';
  }
  return '취소';
}

function myPageLinearStatusBadgeClass(status: MyPageLinearStatus) {
  if (status === 'FAILED' || status === 'CANCELED') {
    return 'bg-red-100 text-red-700';
  }
  if (status === 'PARTIALLY_REFUNDED' || status === 'REFUNDED') {
    return 'bg-neutral-200 text-neutral-700';
  }
  if (status === 'COMPLETED') {
    return 'bg-green-100 text-green-700';
  }
  if (
    status === 'PAYMENT_PENDING' ||
    status === 'PRODUCTION' ||
    status === 'READY_TO_SHIP'
  ) {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-blue-100 text-blue-700';
}

export default function MyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isAdmin, isLoading: sessionLoading, isAuthenticated } = useSession();
  const { mutate: logout, isPending: loggingOut } = useLogout();
  const [currentPage, setCurrentPage] = useState(1);
  const v2OrdersQuery = useV2CheckoutOrders({
    page: currentPage,
    limit: ORDERS_PER_PAGE,
  });
  const cancelV2Order = useV2CancelOrder();

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push('/login?redirect=/mypage');
    }
  }, [isAuthenticated, router, sessionLoading]);

  const mergedOrders = useMemo(() => {
    const v2Orders = v2OrdersQuery.data?.items || [];
    return v2Orders.map(mapV2Order).sort((a, b) => {
      const aTime = new Date(a.orderedAt).getTime() || 0;
      const bTime = new Date(b.orderedAt).getTime() || 0;
      return bTime - aTime;
    });
  }, [v2OrdersQuery.data?.items]);

  const isLoading = sessionLoading || v2OrdersQuery.isLoading;
  const error = v2OrdersQuery.error;
  const totalOrders = v2OrdersQuery.data?.total ?? mergedOrders.length;
  const totalPages = Math.max(
    1,
    v2OrdersQuery.data?.totalPages ??
      Math.ceil(totalOrders / Math.max(v2OrdersQuery.data?.limit ?? ORDERS_PER_PAGE, 1)),
  );
  const activePage = Math.min(currentPage, totalPages);

  const visiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, activePage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [activePage, totalPages]);

  function handleCancel(order: UnifiedOrder) {
    if (!confirm(`주문 ${order.orderNo}를 취소하시겠습니까?`)) {
      return;
    }

    cancelV2Order.mutate(
      {
        orderId: order.id,
        data: { reason: 'USER_REQUESTED' },
      },
      {
        onSuccess: () => {
          showToast('주문을 취소했습니다.', { type: 'success' });
        },
        onError: (mutationError) => {
          showToast(
            mutationError instanceof Error
              ? mutationError.message
              : '주문 취소 중 오류가 발생했습니다.',
            { type: 'error' },
          );
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          title="주문 내역을 불러오지 못했습니다"
                description={error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'}
                action={
                  <Button
                    intent="primary"
                    size="md"
                    onClick={() => {
                      void v2OrdersQuery.refetch();
                    }}
                  >
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-text-primary">마이페이지</h1>
            <p className="mt-1 text-text-secondary">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/mypage/profile">
              <Button intent="secondary" size="sm">
                <Settings className="h-4 w-4" />
                회원정보 수정
              </Button>
            </Link>
            <Button
              intent="neutral"
              size="sm"
              disabled={loggingOut}
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? '로그아웃 중...' : '로그아웃'}
            </Button>
          </div>
        </header>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-text-primary">주문 내역</h2>
            {isAdmin && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                관리자 전체 주문 조회 모드
              </span>
            )}
          </div>
          {mergedOrders.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10">
              <EmptyState
                title="아직 주문 내역이 없습니다"
                description="상점에서 원하는 상품을 담아 구매를 시작해 보세요."
                action={
                  <Link href="/shop">
                    <Button intent="primary" size="md">
                      상점 보러가기
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="space-y-5">
              {mergedOrders.map((order) => {
                const linearStatus = resolveMyPageLinearStatus(order);
                return (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-6"
                  >
                    {/*
                      사용자 화면에서는 3축 상태를 직접 노출하지 않고 단일 선형 상태로 안내해
                      주문 진행 단계를 한눈에 이해할 수 있게 한다.
                    */}
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-4">
                      <div>
                        <p className="text-sm text-text-secondary">주문번호: {order.orderNo}</p>
                        <p className="text-sm text-text-secondary">
                          주문일: {formatDate(order.orderedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${myPageLinearStatusBadgeClass(
                            linearStatus,
                          )}`}
                        >
                          {myPageLinearStatusLabel(linearStatus)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg bg-neutral-50 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-white">
                                {item.thumbnailUrl ? (
                                  <img
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">
                                    이미지 없음
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium text-text-primary">{item.title}</p>
                                  {item.optionTitle && (
                                    <p className="text-xs text-text-secondary">
                                      {item.optionTitle}
                                    </p>
                                  )}
                                </div>
                                {item.lineType === 'BUNDLE_PARENT' && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                    번들
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-text-secondary">
                                {item.quantity}개 · {formatCurrency(item.lineTotal)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-secondary">
                                {item.itemStatus ? getStatusLabel(item.itemStatus) : '-'}
                              </span>
                            </div>
                          </div>

                          {item.components.length > 0 && (
                            <div className="mt-2 rounded-md border border-neutral-200 bg-white p-2">
                              <p className="text-xs font-semibold text-text-secondary">
                                구성품 {item.components.length}개
                              </p>
                              <div className="mt-2 space-y-2">
                                {item.components.map((component) => (
                                  <div
                                    key={component.id}
                                    className="flex items-start justify-between gap-3"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-white">
                                        {component.thumbnailUrl ? (
                                          <img
                                            src={component.thumbnailUrl}
                                            alt={component.title}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-[10px] text-text-secondary">
                                            없음
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-text-primary">
                                          {component.title}
                                        </p>
                                        {component.optionTitle && (
                                          <p className="text-xs text-text-secondary">
                                            {component.optionTitle}
                                          </p>
                                        )}
                                        <p className="text-xs text-text-secondary">
                                          {component.quantity}개 ·{' '}
                                          {component.itemStatus
                                            ? getStatusLabel(component.itemStatus)
                                            : '-'}
                                        </p>
                                      </div>
                                    </div>
                                    <p className="text-sm font-medium text-text-primary">
                                      {formatCurrency(component.lineTotal)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4">
                    <div>
                      {order.orderStatus === 'PENDING' &&
                        (!isAdmin || order.profileId === user?.id) && (
                        <Button
                          intent="secondary"
                          size="sm"
                          disabled={
                            order.orderStatus !== 'PENDING' ||
                            cancelV2Order.isPending
                          }
                          onClick={() => handleCancel(order)}
                        >
                          <X className="h-4 w-4" />
                          주문 취소
                        </Button>
                        )}
                    </div>
                    <div className="text-right">
                      {order.shippingAmount > 0 && (
                        <p className="text-xs text-text-secondary">
                          배송비 {formatCurrency(order.shippingAmount)}
                          {order.shippingDiscountTotal > 0
                            ? ` (할인 -${formatCurrency(order.shippingDiscountTotal)})`
                            : ''}
                        </p>
                      )}
                      <p className="text-xl font-bold text-primary-700">
                        총 {formatCurrency(order.displayTotal)}
                      </p>
                    </div>
                  </div>
                  </article>
                );
              })}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-sm text-text-secondary">
                    총 {totalOrders.toLocaleString()}건 · {activePage} / {totalPages} 페이지
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      intent="secondary"
                      size="sm"
                      disabled={activePage <= 1}
                      onClick={() => setCurrentPage(Math.max(activePage - 1, 1))}
                    >
                      이전
                    </Button>
                    <div className="flex items-center gap-1">
                      {visiblePageNumbers.map((pageNumber) => (
                        <Button
                          key={pageNumber}
                          intent={pageNumber === activePage ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                    </div>
                    <Button
                      intent="secondary"
                      size="sm"
                      disabled={activePage >= totalPages}
                      onClick={() => setCurrentPage(Math.min(activePage + 1, totalPages))}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
