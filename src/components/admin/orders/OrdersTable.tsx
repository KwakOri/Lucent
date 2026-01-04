'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

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

const statusLabels: Record<string, string> = {
  PENDING: '입금대기',
  PAID: '입금완료',
  MAKING: '제작중',
  SHIPPING: '배송중',
  DONE: '완료',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  MAKING: 'bg-blue-100 text-blue-800',
  SHIPPING: 'bg-purple-100 text-purple-800',
  DONE: 'bg-gray-100 text-gray-800',
};

export function OrdersTable({ orders: initialOrders }: OrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
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

  // 일괄 상태 변경
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`선택한 ${selectedOrderIds.length}개 주문의 상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?`)) return;

    setIsBulkUpdating(true);

    try {
      const response = await fetch('/api/admin/orders/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '일괄 변경에 실패했습니다');
      }

      // 로컬 상태 업데이트
      setOrders(prev =>
        prev.map(order =>
          selectedOrderIds.includes(order.id)
            ? { ...order, status: newStatus }
            : order
        )
      );

      setSelectedOrderIds([]);
      alert(`${selectedOrderIds.length}개 주문의 상태가 변경되었습니다`);
    } catch (error) {
      console.error('Bulk update error:', error);
      alert(error instanceof Error ? error.message : '일괄 변경 중 오류가 발생했습니다');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div>
      {/* Bulk Actions */}
      {selectedOrderIds.length > 0 && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrderIds.length}개 주문 선택됨
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={isBulkUpdating}
                className="rounded-md bg-white border-2 border-blue-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">상태 일괄 변경</option>
                <option value="PENDING">입금대기</option>
                <option value="PAID">입금완료</option>
                <option value="MAKING">제작중</option>
                <option value="SHIPPING">배송중</option>
                <option value="DONE">완료</option>
              </select>
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 상태</option>
          <option value="PENDING">입금대기</option>
          <option value="PAID">입금완료</option>
          <option value="MAKING">제작중</option>
          <option value="SHIPPING">배송중</option>
          <option value="DONE">완료</option>
        </select>
      </div>

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
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                            {statusLabels[order.status] || order.status}
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
