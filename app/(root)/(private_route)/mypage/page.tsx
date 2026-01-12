'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Download, LogOut, Package, Settings, X } from 'lucide-react';
import { useSession, useMyOrders, useLogout, useDownloadDigitalProduct, useCancelOrder, type OrderWithItems } from '@/lib/client';
import { useToast } from '@/src/components/toast';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, normalizeItemStatus } from '@/src/constants';
import type { Enums } from '@/types';

// Order status types
type OrderStatus = Enums<'order_status'>;

export default function MyPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // API Hooks
  const { user, isLoading: isSessionLoading, isAuthenticated } = useSession();
  const { data: ordersData, isLoading: isOrdersLoading, error: ordersError } = useMyOrders();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { mutate: download, isPending: isDownloading } = useDownloadDigitalProduct();
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isSessionLoading && !isAuthenticated) {
      router.push('/login?redirect=/mypage');
    }
  }, [isSessionLoading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
  };

  const handleDownload = (orderId: string, itemId: string, productName: string) => {
    download(
      { orderId, itemId },
      {
        onSuccess: () => {
          showToast(`${productName} 다운로드가 시작되었습니다`, { type: 'success' });
        },
        onError: (error) => {
          console.error('Download failed:', error);
          showToast('다운로드 중 오류가 발생했습니다', { type: 'error' });
        },
      }
    );
  };

  const handleCancelOrder = (orderId: string, orderNumber: string) => {
    if (!confirm(`주문 ${orderNumber}을(를) 취소하시겠습니까?\n\n취소된 주문은 복구할 수 없습니다.`)) {
      return;
    }

    cancelOrder(orderId, {
      onSuccess: (result) => {
        showToast(result.message, { type: 'success' });
      },
      onError: (error) => {
        console.error('Cancel order failed:', error);
        showToast(error.message || '주문 취소 중 오류가 발생했습니다', { type: 'error' });
      },
    });
  };

  const isLoading = isSessionLoading || isOrdersLoading;
  const orders = ordersData?.data || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <EmptyState
          title="오류가 발생했습니다"
          description={ordersError instanceof Error ? ordersError.message : '데이터를 불러오는 중 오류가 발생했습니다'}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-text-primary">
              마이페이지
            </h1>
            <div className="flex items-center gap-3">
              <Link href="/mypage/profile">
                <Button
                  intent="neutral"
                  size="md"
                >
                  <Settings className="w-4 h-4" />
                  회원정보 수정
                </Button>
              </Link>
              <Button
                intent="secondary"
                size="md"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </Button>
            </div>
          </div>
          <p className="text-lg text-text-secondary">
            {user?.email}
          </p>
        </div>

        {/* Order List Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-text-primary mb-6">
            주문 내역
          </h2>

          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-12">
              <EmptyState
                title="아직 주문 내역이 없습니다"
                description="상점에서 마음에 드는 상품을 찾아보세요"
              >
                <Link href="/shop">
                  <Button intent="primary" size="md">
                    <Package className="w-4 h-4" />
                    상점 보러가기
                  </Button>
                </Link>
              </EmptyState>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-200">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">
                        주문번호: {order.order_number}
                      </p>
                      <p className="text-sm text-text-muted">
                        {new Date(order.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                      {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] || order.status}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-base font-medium text-text-primary">
                            {item.product_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-text-secondary">
                              {item.quantity}개 × {item.price_snapshot.toLocaleString()}원
                            </p>
                            {item.item_status && (
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ORDER_STATUS_COLORS[normalizeItemStatus(item.item_status)] || 'bg-gray-100 text-gray-800'}`}>
                                {ORDER_STATUS_LABELS[normalizeItemStatus(item.item_status)] || item.item_status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Download Button for Digital Products */}
                        {item.product_type === 'VOICE_PACK' &&
                          item.item_status === 'DONE' && (
                            <Button
                              intent="primary"
                              size="sm"
                              onClick={() =>
                                handleDownload(order.id, item.id, item.product_name)
                              }
                              disabled={isDownloading}
                            >
                              <Download className="w-4 h-4" />
                              다운로드
                            </Button>
                          )}
                      </div>
                    ))}
                  </div>

                  {/* Order Footer */}
                  <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {order.shipping_main_address && (
                        <p className="text-sm text-text-secondary">
                          배송지: {order.shipping_main_address} {order.shipping_detail_address || ''}
                        </p>
                      )}
                      {/* 취소 버튼 - PENDING 상태일 때만 표시 */}
                      {order.status === 'PENDING' && (
                        <Button
                          intent="secondary"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id, order.order_number)}
                          disabled={isCancelling}
                        >
                          <X className="w-4 h-4" />
                          주문 취소
                        </Button>
                      )}
                    </div>
                    <p className="text-xl font-bold text-primary-700">
                      총 {order.total_price.toLocaleString()}원
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Digital Products Section */}
        {orders.some((order) =>
          order.items?.some((item) => item.product_type === 'VOICE_PACK')
        ) && (
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              디지털 상품
            </h2>

            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="space-y-4">
                {orders
                  .flatMap((order) =>
                    order.items
                      ?.filter((item) => item.product_type === 'VOICE_PACK' && item.item_status === 'DONE')
                      .map((item) => (
                        <div
                          key={`${order.id}-${item.id}`}
                          className="flex items-center justify-between p-4 rounded-lg bg-neutral-50"
                        >
                          <div>
                            <p className="font-medium text-text-primary">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-text-secondary">
                              구매일:{' '}
                              {new Date(order.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <Button
                            intent="primary"
                            size="sm"
                            onClick={() =>
                              handleDownload(order.id, item.id, item.product_name)
                            }
                            disabled={isDownloading}
                          >
                            <Download className="w-4 h-4" />
                            다운로드
                          </Button>
                        </div>
                      ))
                  )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
