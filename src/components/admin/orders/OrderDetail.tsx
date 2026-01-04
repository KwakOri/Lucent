'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

interface OrderItem {
  id: string;
  quantity: number;
  price_snapshot: number;
  product_name: string;
  product_type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
  item_status?: string;
  product?: {
    id: string;
    name: string;
    type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
    digital_file_url?: string | null;
    sample_audio_url?: string | null;
  };
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_main_address?: string | null;
  shipping_detail_address?: string | null;
  shipping_memo?: string | null;
  total_price: number;
  status: string;
  created_at: string;
  admin_memo?: string | null;
  items: OrderItem[];
}

interface OrderDetailProps {
  order: Order;
}

const statusLabels: Record<string, string> = {
  PENDING: '입금대기',
  PAID: '입금완료',
  MAKING: '제작중',
  SHIPPING: '배송중',
  DONE: '완료',
};

const itemStatusLabels: Record<string, string> = {
  PENDING: '대기',
  READY: '준비',
  PROCESSING: '처리중',
  SHIPPED: '발송됨',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const typeLabels: Record<string, string> = {
  VOICE_PACK: '디지털 상품',
  PHYSICAL_GOODS: '실물 상품',
  BUNDLE: '세트 상품',
};

export function OrderDetail({ order: initialOrder }: OrderDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [isUpdating, setIsUpdating] = useState(false);

  // 아이템 선택 상태
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedItemStatus, setSelectedItemStatus] = useState('READY');
  const [isUpdatingItems, setIsUpdatingItems] = useState(false);

  const handleStatusChange = async () => {
    if (selectedStatus === order.status) {
      alert('변경할 상태를 선택해주세요');
      return;
    }

    if (!confirm(`주문 상태를 "${statusLabels[selectedStatus]}"(으)로 변경하시겠습니까?`)) {
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (!response.ok) {
        throw new Error('상태 변경 실패');
      }

      const { data } = await response.json();
      setOrder({ ...order, status: data.status });
      router.refresh();
      alert('주문 상태가 변경되었습니다');
    } catch (error) {
      alert('주문 상태 변경에 실패했습니다');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(order.items.map((item) => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // 개별 아이템 선택/해제
  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  // 선택된 아이템 상태 일괄 변경
  const handleBulkStatusChange = async () => {
    if (selectedItems.size === 0) {
      alert('변경할 아이템을 선택해주세요');
      return;
    }

    if (!confirm(`선택한 ${selectedItems.size}개 아이템의 상태를 "${itemStatusLabels[selectedItemStatus]}"(으)로 변경하시겠습니까?`)) {
      return;
    }

    setIsUpdatingItems(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/items/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: Array.from(selectedItems),
          status: selectedItemStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('아이템 상태 변경 실패');
      }

      router.refresh();
      setSelectedItems(new Set());
      alert('아이템 상태가 변경되었습니다');
    } catch (error) {
      alert('아이템 상태 변경에 실패했습니다');
      console.error(error);
    } finally {
      setIsUpdatingItems(false);
    }
  };

  const allSelected = order.items.length > 0 && selectedItems.size === order.items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < order.items.length;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/orders"
          className="text-sm text-blue-600 hover:text-blue-900 mb-4 inline-block"
        >
          ← 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">주문 상세</h1>
      </div>

      {/* Order Info Card */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Order Number and Status */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">주문번호: {order.order_number}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  주문일: {new Date(order.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleStatusChange}
                  disabled={isUpdating}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {isUpdating ? '변경 중...' : '상태 변경'}
                </button>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">고객 정보</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">고객 ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{order.user_id}</dd>
                </div>
              </dl>
            </div>

            {/* Shipping Info (if exists) */}
            {order.shipping_main_address && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">배송 정보</h4>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {order.shipping_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">수령인</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order.shipping_name}</dd>
                    </div>
                  )}
                  {order.shipping_phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">연락처</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order.shipping_phone}</dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">주소</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {order.shipping_main_address}
                      {order.shipping_detail_address && (
                        <> {order.shipping_detail_address}</>
                      )}
                    </dd>
                  </div>
                  {order.shipping_memo && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">배송 메모</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order.shipping_memo}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Order Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">주문 상품</h4>
                {selectedItems.size > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedItemStatus}
                      onChange={(e) => setSelectedItemStatus(e.target.value)}
                      className="rounded-md bg-white border border-gray-300 text-gray-900 py-1 pl-2 pr-8 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {Object.entries(itemStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleBulkStatusChange}
                      disabled={isUpdatingItems}
                      className="rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
                    >
                      {isUpdatingItems ? '변경 중...' : `${selectedItems.size}개 상태 변경`}
                    </button>
                  </div>
                )}
              </div>

              <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
                {/* 전체 선택 */}
                <li className="flex items-center py-3 bg-gray-50">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    label={<span className="text-sm font-medium text-gray-700">전체 선택</span>}
                  />
                </li>

                {/* 아이템 목록 */}
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center py-4">
                    <div className="flex items-start flex-1">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="mt-5"
                      />
                      <div className="ml-3 h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl">
                          {item.product_type === 'VOICE_PACK' ? '🎵' : '📦'}
                        </span>
                      </div>
                      <div className="ml-4 flex flex-1 flex-col">
                        <div>
                          <div className="flex justify-between text-sm font-medium text-gray-900">
                            <h5>{item.product_name}</h5>
                            <p className="ml-4">{(item.price_snapshot * item.quantity).toLocaleString()}원</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {typeLabels[item.product_type || '']} • {item.price_snapshot.toLocaleString()}원 × {item.quantity}개
                          </p>
                          {item.item_status && (
                            <p className="mt-1">
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                {itemStatusLabels[item.item_status] || item.item_status}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <dt className="text-sm font-medium text-gray-500">총 금액</dt>
                  <dd className="mt-1 text-2xl font-bold text-gray-900">
                    {order.total_price.toLocaleString()}원
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
