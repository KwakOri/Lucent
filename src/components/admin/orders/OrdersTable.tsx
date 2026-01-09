'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/components/modal';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/src/constants';
import {
  BulkUpdateConfirmModal,
  BulkUpdateSuccessModal,
} from './BulkUpdateModal';

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

type Tab = 'pending' | 'paid' | 'making' | 'ready_to_ship' | 'shipping' | 'done';

export function OrdersTable({ orders }: OrdersTableProps) {
  const queryClient = useQueryClient();
  const { openModal, closeModal, renderModal } = useModal();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // 탭 변경 시 선택 목록 및 드롭다운 초기화
  useEffect(() => {
    setSelectedOrderIds([]);
    setSelectedStatus('');
  }, [activeTab]);

  // 탭별 필터링 로직 (orders.status 기반)
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'pending') {
      return order.status === 'PENDING';
    } else if (activeTab === 'paid') {
      return order.status === 'PAID';
    } else if (activeTab === 'making') {
      return order.status === 'MAKING';
    } else if (activeTab === 'ready_to_ship') {
      return order.status === 'READY_TO_SHIP';
    } else if (activeTab === 'shipping') {
      return order.status === 'SHIPPING';
    } else if (activeTab === 'done') {
      return order.status === 'DONE';
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

  // 주문 상태 일괄 변경
  const handleBulkStatusChange = async (newStatus: string, _confirmMessage: string) => {
    if (selectedOrderIds.length === 0) return;

    const count = selectedOrderIds.length;
    const statusLabel = ORDER_STATUS_LABELS[newStatus as keyof typeof ORDER_STATUS_LABELS];

    try {
      // 1. 확인 모달 열기
      const confirmed = await openModal<boolean>(BulkUpdateConfirmModal, {
        count,
        statusLabel,
        disableBackdropClick: false,
        disableEscapeKey: false,
      });

      // 사용자가 취소한 경우
      if (!confirmed) return;
    } catch (error) {
      // 모달이 닫힌 경우 (abort)
      return;
    }

    setIsBulkUpdating(true);

    try {
      // 2. API 호출
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
        throw new Error(error.error || '상태 변경에 실패했습니다');
      }

      // 선택 해제 및 드롭다운 초기화
      setSelectedOrderIds([]);
      setSelectedStatus('');

      // React Query 캐시 무효화 (주문 목록 자동 재조회)
      await queryClient.invalidateQueries({ queryKey: ['orders'] });

      // 3. 완료 모달 열기
      await openModal(BulkUpdateSuccessModal, {
        count,
        statusLabel,
        disableBackdropClick: true,
        disableEscapeKey: true,
      });
    } catch (error) {
      console.error('Bulk status change error:', error);
      alert(error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // 드롭다운으로 상태 변경
  const handleDropdownStatusChange = async () => {
    if (!selectedStatus) return;

    const statusLabel = ORDER_STATUS_LABELS[selectedStatus as keyof typeof ORDER_STATUS_LABELS];
    await handleBulkStatusChange(
      selectedStatus,
      `선택한 ${selectedOrderIds.length}개 주문을 "${statusLabel}" 상태로 변경하시겠습니까?`
    );
    setSelectedStatus('');
  };

  // 드롭다운 옵션 생성 (모든 상태)
  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  // 탭 옵션 (모바일 드롭다운용)
  const tabOptions = [
    { value: 'pending', label: '입금대기' },
    { value: 'paid', label: '입금확인' },
    { value: 'making', label: '제작중' },
    { value: 'ready_to_ship', label: '출고중' },
    { value: 'shipping', label: '배송중' },
    { value: 'done', label: '완료' },
  ];

  return (
    <div>
      {/* Tabs - Desktop */}
      <div className="mb-6">
        {/* Mobile: Dropdown */}
        <div className="md:hidden mb-4">
          <Select
            options={tabOptions}
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as Tab)}
            size="md"
            className="w-full"
          />
        </div>

        {/* Desktop: Tabs */}
        <div className="hidden md:block border-b border-gray-200">
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
              입금대기
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'paid'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              입금확인
            </button>
            <button
              onClick={() => setActiveTab('making')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'making'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              제작중
            </button>
            <button
              onClick={() => setActiveTab('ready_to_ship')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'ready_to_ship'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              출고중
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
              배송중
            </button>
            <button
              onClick={() => setActiveTab('done')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === 'done'
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
          {/* Mobile Layout */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrderIds.length}개 주문 선택됨
              </span>
              <Button
                intent="secondary"
                size="sm"
                onClick={() => setSelectedOrderIds([])}
                disabled={isBulkUpdating}
              >
                선택 해제
              </Button>
            </div>

            {/* 입금 대기 탭: 입금 확인 → PAID */}
            {activeTab === 'pending' && (
              <Button
                intent="primary"
                size="sm"
                onClick={() => handleBulkStatusChange(
                  'PAID',
                  `선택한 ${selectedOrderIds.length}개 주문의 입금을 확인하시겠습니까?`
                )}
                disabled={isBulkUpdating}
                className="w-full"
              >
                {isBulkUpdating ? '처리 중...' : '입금 확인'}
              </Button>
            )}

            {/* 입금 확인 탭: 제작 시작 → MAKING */}
            {activeTab === 'paid' && (
              <Button
                intent="primary"
                size="sm"
                onClick={() => handleBulkStatusChange(
                  'MAKING',
                  `선택한 ${selectedOrderIds.length}개 주문의 제작을 시작하시겠습니까?`
                )}
                disabled={isBulkUpdating}
                className="w-full"
              >
                {isBulkUpdating ? '처리 중...' : '제작 시작'}
              </Button>
            )}

            {/* 제작중 탭: 출고 처리 → READY_TO_SHIP */}
            {activeTab === 'making' && (
              <Button
                intent="primary"
                size="sm"
                onClick={() => handleBulkStatusChange(
                  'READY_TO_SHIP',
                  `선택한 ${selectedOrderIds.length}개 주문을 출고 처리하시겠습니까?`
                )}
                disabled={isBulkUpdating}
                className="w-full"
              >
                {isBulkUpdating ? '처리 중...' : '출고 처리'}
              </Button>
            )}

            {/* 출고중 탭: 배송 시작 → SHIPPING */}
            {activeTab === 'ready_to_ship' && (
              <Button
                intent="primary"
                size="sm"
                onClick={() => handleBulkStatusChange(
                  'SHIPPING',
                  `선택한 ${selectedOrderIds.length}개 주문의 배송을 시작하시겠습니까?`
                )}
                disabled={isBulkUpdating}
                className="w-full"
              >
                {isBulkUpdating ? '처리 중...' : '배송 시작'}
              </Button>
            )}

            {/* 배송중 탭: 완료 처리 → DONE */}
            {activeTab === 'shipping' && (
              <Button
                intent="primary"
                size="sm"
                onClick={() => handleBulkStatusChange(
                  'DONE',
                  `선택한 ${selectedOrderIds.length}개 주문을 완료 처리하시겠습니까?`
                )}
                disabled={isBulkUpdating}
                className="w-full"
              >
                {isBulkUpdating ? '처리 중...' : '완료 처리'}
              </Button>
            )}

            {/* 드롭다운으로 다른 상태로 변경 */}
            <div className="space-y-2 pt-2 border-t border-blue-300">
              <Select
                options={statusOptions}
                placeholder="다른 상태로 변경"
                size="sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={isBulkUpdating}
                className="w-full"
              />
              <Button
                intent="secondary"
                size="sm"
                onClick={handleDropdownStatusChange}
                disabled={isBulkUpdating || !selectedStatus}
                className="w-full"
              >
                변경
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrderIds.length}개 주문 선택됨
              </span>

              {/* 입금 대기 탭: 입금 확인 → PAID */}
              {activeTab === 'pending' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkStatusChange(
                    'PAID',
                    `선택한 ${selectedOrderIds.length}개 주문의 입금을 확인하시겠습니까?`
                  )}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '입금 확인'}
                </Button>
              )}

              {/* 입금 확인 탭: 제작 시작 → MAKING */}
              {activeTab === 'paid' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkStatusChange(
                    'MAKING',
                    `선택한 ${selectedOrderIds.length}개 주문의 제작을 시작하시겠습니까?`
                  )}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '제작 시작'}
                </Button>
              )}

              {/* 제작중 탭: 출고 처리 → READY_TO_SHIP */}
              {activeTab === 'making' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkStatusChange(
                    'READY_TO_SHIP',
                    `선택한 ${selectedOrderIds.length}개 주문을 출고 처리하시겠습니까?`
                  )}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '출고 처리'}
                </Button>
              )}

              {/* 출고중 탭: 배송 시작 → SHIPPING */}
              {activeTab === 'ready_to_ship' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkStatusChange(
                    'SHIPPING',
                    `선택한 ${selectedOrderIds.length}개 주문의 배송을 시작하시겠습니까?`
                  )}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '배송 시작'}
                </Button>
              )}

              {/* 배송중 탭: 완료 처리 → DONE */}
              {activeTab === 'shipping' && (
                <Button
                  intent="primary"
                  size="sm"
                  onClick={() => handleBulkStatusChange(
                    'DONE',
                    `선택한 ${selectedOrderIds.length}개 주문을 완료 처리하시겠습니까?`
                  )}
                  disabled={isBulkUpdating}
                >
                  {isBulkUpdating ? '처리 중...' : '완료 처리'}
                </Button>
              )}

              {/* 드롭다운으로 다른 상태로 변경 */}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-blue-300">
                <Select
                  options={statusOptions}
                  placeholder="다른 상태로 변경"
                  size="sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isBulkUpdating}
                  className="w-48"
                />
                <Button
                  intent="secondary"
                  size="sm"
                  onClick={handleDropdownStatusChange}
                  disabled={isBulkUpdating || !selectedStatus}
                >
                  변경
                </Button>
              </div>
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

      {/* Mobile: Card List */}
      <div className="md:hidden space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">주문 내역이 없습니다</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-lg border p-4 ${
                selectedOrderIds.includes(order.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              {/* 첫 줄: 체크박스 + 주문번호 */}
              <div className="flex items-center gap-3 mb-3">
                <Checkbox
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                  aria-label={`${order.order_number} 선택`}
                />
                <span className="text-sm font-medium text-gray-900">
                  {order.order_number}
                </span>
              </div>

              {/* 둘째 줄: 주문일, 주문자, 금액 */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <div className="flex items-center gap-2">
                  <span>{new Date(order.created_at).toLocaleDateString('ko-KR')}</span>
                  <span>·</span>
                  <span>{order.buyer_name || '-'}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {order.total_price.toLocaleString()}원
                </span>
              </div>

              {/* 셋째 줄: 상품명 */}
              <div className="text-sm text-gray-700 mb-3">
                {order.items[0]?.product?.name || '-'}
                {order.items.length > 1 && (
                  <span className="text-gray-500"> 외 {order.items.length - 1}건</span>
                )}
              </div>

              {/* 넷째 줄: 상태 + 보기 링크 */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ||
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ||
                    order.status}
                </span>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                >
                  보기
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block mt-4 flow-root">
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
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                            {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] || order.status}
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
      {/* Render Modals */}
      {renderModal()}
    </div>
  );
}
