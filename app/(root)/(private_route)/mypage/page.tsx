'use client';

import { useEffect, useMemo } from 'react';
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
import { groupV2OrderItems } from '@/lib/client/utils/v2-order-item-groups';
import { useToast } from '@/src/components/toast';

interface UnifiedOrderItem {
  id: string;
  title: string;
  quantity: number;
  lineTotal: number;
  isDigital: boolean;
  itemStatus: string;
  lineType: 'STANDARD' | 'BUNDLE_PARENT' | 'BUNDLE_COMPONENT';
  components: Array<{
    id: string;
    title: string;
    quantity: number;
    lineTotal: number;
    itemStatus: string;
  }>;
}

interface UnifiedOrder {
  id: string;
  orderNo: string;
  orderedAt: string;
  displayTotal: number;
  orderStatus: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  items: UnifiedOrderItem[];
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
  const items: UnifiedOrderItem[] = groupV2OrderItems(
    (order.items || []) as Array<Record<string, unknown>>,
  ).map((group, index) => ({
    id: group.id || `${order.id}-${index}`,
    title: group.title,
    quantity: group.quantity,
    lineTotal: group.lineTotal,
    isDigital: !group.requiresShipping,
    itemStatus: group.lineStatus,
    lineType: group.lineType,
    components: group.components.map((component) => ({
      id: component.id,
      title: component.title,
      quantity: component.quantity,
      lineTotal: component.lineTotal,
      itemStatus: component.lineStatus,
    })),
  }));

  return {
    id: order.id,
    orderNo: order.order_no,
    orderedAt: order.placed_at || '',
    displayTotal: order.grand_total,
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

function statusBadgeClass(status: string) {
  if (status.includes('FAILED') || status.includes('CANCELED')) {
    return 'bg-red-100 text-red-700';
  }
  if (
    status.includes('PENDING') ||
    status.includes('UNFULFILLED') ||
    status.includes('READY_TO_SHIP')
  ) {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-green-100 text-green-700';
}

export default function MyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const { mutate: logout, isPending: loggingOut } = useLogout();
  const v2OrdersQuery = useV2CheckoutOrders({ limit: 50 });
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
          <h2 className="mb-5 text-2xl font-bold text-text-primary">주문 내역</h2>
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
              {mergedOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-6"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-4">
                    <div>
                      <p className="text-sm text-text-secondary">주문번호: {order.orderNo}</p>
                      <p className="text-sm text-text-secondary">
                        주문일: {formatDate(order.orderedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                          order.orderStatus,
                        )}`}
                      >
                        {getStatusLabel(order.orderStatus)}
                      </span>
                      {order.paymentStatus && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                            order.paymentStatus,
                          )}`}
                        >
                          결제: {getStatusLabel(order.paymentStatus)}
                        </span>
                      )}
                      {order.fulfillmentStatus && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                            order.fulfillmentStatus,
                          )}`}
                        >
                          이행: {getStatusLabel(order.fulfillmentStatus)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg bg-neutral-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">{item.title}</p>
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
                                  <div>
                                    <p className="text-sm font-medium text-text-primary">
                                      {component.title}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                      {component.quantity}개 ·{' '}
                                      {component.itemStatus
                                        ? getStatusLabel(component.itemStatus)
                                        : '-'}
                                    </p>
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
                      {order.orderStatus === 'PENDING' && (
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
                    <p className="text-xl font-bold text-primary-700">
                      총 {formatCurrency(order.displayTotal)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
