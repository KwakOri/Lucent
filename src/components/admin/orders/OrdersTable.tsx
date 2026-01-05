'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/src/constants';

interface Order {
  id: string;
  order_number: string;
  buyer_name: string | null;
  shipping_name: string | null;
  total_price: number;
  status: string;
  created_at: string;
  user_id: string;
  items: Array<{
    id: string;
    item_status?: string;
    product_type?: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
    product?: {
      id: string;
      name: string;
      type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
    };
  }>;
}

interface OrdersTableProps {
  orders: Order[];
}

type Tab = 'pending' | 'ready' | 'processing' | 'shipping' | 'completed';

export function OrdersTable({ orders: initialOrders }: OrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // 탭 변경 시 선택 목록 초기화
  useEffect(() => {
    setSelectedOrderIds([]);
  }, [activeTab]);

  // 탭별 필터링 로직
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'pending') {
      // 입금 대기: 하나라도 PENDING (0원 상품이 포함된 경우 고려)
      return order.items.some((item) => item.item_status === 'PENDING');
    } else if (activeTab === 'ready') {
      // 배송 대기: 실물 상품이 있고, 실물 상품이 READY 상태
      const physicalItems = order.items.filter(
        (item) =>
          (item.product?.type === 'PHYSICAL_GOODS' ||
            item.product?.type === 'BUNDLE') ||
          (item.product_type === 'PHYSICAL_GOODS' ||
            item.product_type === 'BUNDLE')
      );
      return physicalItems.length > 0 && physicalItems.some((item) => item.item_status === 'READY');
    } else if (activeTab === 'processing') {
      // 처리중: 실물 상품이 있고, 실물 상품이 PROCESSING 상태
      const physicalItems = order.items.filter(
        (item) =>
          (item.product?.type === 'PHYSICAL_GOODS' ||
            item.product?.type === 'BUNDLE') ||
          (item.product_type === 'PHYSICAL_GOODS' ||
            item.product_type === 'BUNDLE')
      );
      return physicalItems.length > 0 && physicalItems.some((item) => item.item_status === 'PROCESSING');
    } else if (activeTab === 'shipping') {
      // 배송 중: 실물 상품이 있고, 실물 상품이 SHIPPED 상태
      const physicalItems = order.items.filter(
        (item) =>
          (item.product?.type === 'PHYSICAL_GOODS' ||
            item.product?.type === 'BUNDLE') ||
          (item.product_type === 'PHYSICAL_GOODS' ||
            item.product_type === 'BUNDLE')
      );
      return physicalItems.length > 0 && physicalItems.some((item) => item.item_status === 'SHIPPED');
    } else if (activeTab === 'completed') {
      // 완료: 모든 아이템이 COMPLETED 상태
      return order.items.every((item) => item.item_status === 'COMPLETED');
    }
    return true;
  });

  // 전체 선택/해제
  const isAllSelected = filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length;
  const isSomeSelected = selectedOrderIds.length > 0 && selectedOrderIds.length < filteredOrders.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  // 입금 확인 (입금 대기 탭)
  const handleBulkPaymentConfirm = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`선택한 ${selectedOrderIds.length}개 주문의 입금을 확인하시겠습니까?\n(디지털 상품은 자동으로 완료 처리되고, 실물 상품은 배송 대기 상태로 변경됩니다)`)) return;

    setIsBulkUpdating(true);

    try {
      const response = await fetch('/api/admin/orders/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          status: 'PAID',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '입금 확인에 실패했습니다');
      }

      // 페이지 새로고침하여 최신 상태 반영
      window.location.reload();
    } catch (error) {
      console.error('Bulk payment confirm error:', error);
      alert(error instanceof Error ? error.message : '입금 확인 중 오류가 발생했습니다');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // 실물 상품 상태 일괄 변경 (배송 대기/배송 중 탭)
  const handleBulkItemStatusChange = async (newItemStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`선택한 ${selectedOrderIds.length}개 주문의 실물 상품 상태를 변경하시겠습니까?`)) return;

    setIsBulkUpdating(true);

    try {
      // 선택된 주문들의 실물 상품 아이템 ID 수집
      const physicalItemIds: string[] = [];
      selectedOrderIds.forEach(orderId => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.items.forEach(item => {
            const isPhysical =
              (item.product?.type === 'PHYSICAL_GOODS' || item.product?.type === 'BUNDLE') ||
              (item.product_type === 'PHYSICAL_GOODS' || item.product_type === 'BUNDLE');
            if (isPhysical) {
              physicalItemIds.push(item.id);
            }
          });
        }
      });

      // 각 주문의 실물 상품 상태 변경
      await Promise.all(
        selectedOrderIds.map(async (orderId) => {
          const order = orders.find(o => o.id === orderId);
          if (!order) return;

          const orderPhysicalItemIds = order.items
            .filter(item => {
              const isPhysical =
                (item.product?.type === 'PHYSICAL_GOODS' || item.product?.type === 'BUNDLE') ||
                (item.product_type === 'PHYSICAL_GOODS' || item.product_type === 'BUNDLE');
              return isPhysical;
            })
            .map(item => item.id);

          if (orderPhysicalItemIds.length === 0) return;

          await fetch(`/api/orders/${orderId}/items/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemIds: orderPhysicalItemIds,
              status: newItemStatus,
            }),
          });
        })
      );

      // 페이지 새로고침하여 최신 상태 반영
      window.location.reload();
    } catch (error) {
      console.error('Bulk item status update error:', error);
      alert(error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('pending')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              입금 대기
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'ready'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              배송 대기
            </button>
            <button
              onClick={() => setActiveTab('processing')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'processing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              처리중
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'shipping'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              배송 중
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'completed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              완료
            </button>
          </nav>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrderIds.length > 0 && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrderIds.length}개 주문 선택됨
              </span>

              {/* 입금 대기 탭: 입금 확인 버튼 */}
              {activeTab === 'pending' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={handleBulkPaymentConfirm}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '입금 확인'}
                </Button>
              )}

              {/* 배송 대기 탭: 제작 시작 */}
              {activeTab === 'ready' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkItemStatusChange('PROCESSING')}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '제작 시작'}
                </Button>
              )}

              {/* 처리중 탭: 발송 완료 */}
              {activeTab === 'processing' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkItemStatusChange('SHIPPED')}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '발송 완료'}
                </Button>
              )}

              {/* 배송 중 탭: 완료 처리 */}
              {activeTab === 'shipping' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkItemStatusChange('COMPLETED')}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '완료 처리'}
                </Button>
              )}
            </div>
            <Button
              intent="secondary"
              size="sm"
              onClick={() => setSelectedOrderIds([])}
              disabled={isBulkUpdating}
            >
              선택 해제
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                      <Checkbox
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="전체 선택"
                      />
                    </th>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      주문번호
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      주문일
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      주문자
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      고객ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      상품
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      금액
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      상태
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">작업</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm text-gray-500">
                        주문 내역이 없습니다
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className={selectedOrderIds.includes(order.id) ? 'bg-blue-50' : ''}>
                        <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                          <Checkbox
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                            aria-label={`${order.order_number} 선택`}
                          />
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {order.order_number}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.buyer_name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 truncate max-w-[100px]" title={order.user_id}>
                          {order.user_id.substring(0, 8)}...
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.items[0]?.product?.name || '-'}
                          {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.total_price.toLocaleString()}원
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                            {ORDER_STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            보기
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
