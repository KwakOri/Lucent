'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, LogOut, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import type { V2CheckoutOrder } from '@/lib/client/api/v2-checkout.api';
import {
  type OrderWithItems,
  useCancelOrder,
  useDownloadDigitalProduct,
  useLogout,
  useMyOrders,
  useSession,
  useV2CancelOrder,
  useV2CheckoutOrders,
} from '@/lib/client/hooks';
import { useToast } from '@/src/components/toast';

type UnifiedSource = 'V1' | 'V2';

interface UnifiedOrderItem {
  id: string;
  title: string;
  quantity: number;
  lineTotal: number;
  isDigital: boolean;
  itemStatus: string;
}

interface UnifiedOrder {
  source: UnifiedSource;
  id: string;
  orderNo: string;
  orderedAt: string;
  displayTotal: number;
  orderStatus: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  items: UnifiedOrderItem[];
}

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

function mapV1Order(order: OrderWithItems): UnifiedOrder {
  const items: UnifiedOrderItem[] = (order.items || []).map((item) => ({
    id: item.id,
    title: item.product_name,
    quantity: item.quantity,
    lineTotal: item.price_snapshot * item.quantity,
    isDigital: item.product_type === 'VOICE_PACK',
    itemStatus: item.item_status || '',
  }));

  return {
    source: 'V1',
    id: order.id,
    orderNo: order.order_number,
    orderedAt: order.created_at,
    displayTotal: order.total_price,
    orderStatus: order.status,
    items,
  };
}

function mapV2Order(order: V2CheckoutOrder): UnifiedOrder {
  const items: UnifiedOrderItem[] = (order.items || []).map((rawItem, index) => {
    const item = asObject(rawItem);
    const display = asObject(item.display_snapshot);
    const title =
      readString(display.title) ||
      readString(display.variant_title) ||
      readString(item.variant_id) ||
      `상품 ${index + 1}`;
    const fulfillmentType = readString(display.fulfillment_type);

    return {
      id: readString(item.id) || `${order.id}-${index}`,
      title,
      quantity: readNumber(item.quantity),
      lineTotal: readNumber(item.final_line_total),
      isDigital: fulfillmentType === 'DIGITAL',
      itemStatus: readString(item.line_status),
    };
  });

  return {
    source: 'V2',
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
  const v1OrdersQuery = useMyOrders({ limit: 50 });
  const v2OrdersQuery = useV2CheckoutOrders({ limit: 50 });
  const downloadMutation = useDownloadDigitalProduct();
  const cancelV1Order = useCancelOrder();
  const cancelV2Order = useV2CancelOrder();

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push('/login?redirect=/mypage');
    }
  }, [isAuthenticated, router, sessionLoading]);

  const mergedOrders = useMemo(() => {
    const result = new Map<string, UnifiedOrder>();
    const v2Orders = v2OrdersQuery.data?.items || [];
    const v1Orders = v1OrdersQuery.data?.data || [];

    for (const order of v2Orders) {
      const mapped = mapV2Order(order);
      const key = mapped.orderNo || `V2:${mapped.id}`;
      result.set(key, mapped);
    }

    for (const order of v1Orders) {
      const mapped = mapV1Order(order);
      const key = mapped.orderNo || `V1:${mapped.id}`;
      if (!result.has(key)) {
        result.set(key, mapped);
      }
    }

    return Array.from(result.values()).sort((a, b) => {
      const aTime = new Date(a.orderedAt).getTime() || 0;
      const bTime = new Date(b.orderedAt).getTime() || 0;
      return bTime - aTime;
    });
  }, [v1OrdersQuery.data?.data, v2OrdersQuery.data?.items]);

  const isLoading = sessionLoading || v1OrdersQuery.isLoading || v2OrdersQuery.isLoading;
  const error = v2OrdersQuery.error || v1OrdersQuery.error;

  async function handleDownload(orderId: string, itemId: string, title: string) {
    downloadMutation.mutate(
      { orderId, itemId },
      {
        onSuccess: () => {
          showToast(`${title} 다운로드를 시작합니다.`, { type: 'success' });
        },
        onError: (mutationError) => {
          showToast(
            mutationError instanceof Error
              ? mutationError.message
              : '다운로드 중 오류가 발생했습니다.',
            { type: 'error' },
          );
        },
      },
    );
  }

  function handleCancel(order: UnifiedOrder) {
    if (!confirm(`주문 ${order.orderNo}를 취소하시겠습니까?`)) {
      return;
    }

    if (order.source === 'V1') {
      cancelV1Order.mutate(order.id, {
        onSuccess: (result) => {
          showToast(result.message, { type: 'success' });
        },
        onError: (mutationError) => {
          showToast(
            mutationError instanceof Error
              ? mutationError.message
              : '주문 취소 중 오류가 발생했습니다.',
            { type: 'error' },
          );
        },
      });
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
                void v1OrdersQuery.refetch();
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
                  key={`${order.source}:${order.id}`}
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
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                        {order.source}
                      </span>
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
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 p-3"
                      >
                        <div>
                          <p className="font-medium text-text-primary">{item.title}</p>
                          <p className="text-sm text-text-secondary">
                            {item.quantity}개 · {formatCurrency(item.lineTotal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.source === 'V1' &&
                            item.isDigital &&
                            item.itemStatus === 'COMPLETED' && (
                              <Button
                                intent="primary"
                                size="sm"
                                disabled={downloadMutation.isPending}
                                onClick={() =>
                                  void handleDownload(order.id, item.id, item.title)
                                }
                              >
                                <Download className="h-4 w-4" />
                                다운로드
                              </Button>
                            )}
                          <span className="text-xs text-text-secondary">
                            {getStatusLabel(item.itemStatus)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4">
                    <div>
                      {(order.source === 'V1' || order.orderStatus === 'PENDING') && (
                        <Button
                          intent="secondary"
                          size="sm"
                          disabled={
                            order.orderStatus !== 'PENDING' ||
                            cancelV1Order.isPending ||
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
