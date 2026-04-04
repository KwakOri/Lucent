'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type { V2AdminOrderQueueRow } from '@/lib/client/api/v2-admin-ops.api';
import {
  useV2AdminCutoverPolicyCheck,
  useV2AdminOrderQueue,
  useV2AdminRefundOrder,
} from '@/lib/client/hooks/useV2AdminOps';
import {
  formatCurrency,
  formatDate,
  isCanceledOrder,
  linearStageLabel,
  resolveLinearStageFromRow,
  truncateMiddle,
} from '@/app/admin/orders/order-stage';

const ORDER_PAGE_SIZE = 10;

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string;
      response?: { data?: { message?: string } };
      errorCode?: string;
    };

    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function isApprovalRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybeError = error as { errorCode?: string; message?: string };
  if (maybeError.errorCode === 'V2_ADMIN_APPROVAL_REQUIRED') {
    return true;
  }
  if (typeof maybeError.message === 'string') {
    return maybeError.message.includes('승인이 필요한 액션');
  }
  return false;
}

function isRefundableOrder(row: V2AdminOrderQueueRow): boolean {
  if (isCanceledOrder(row)) {
    return false;
  }
  const paymentStatus = String(row.payment_status || '').toUpperCase();
  return (
    paymentStatus === 'AUTHORIZED' ||
    paymentStatus === 'CAPTURED' ||
    paymentStatus === 'PARTIALLY_REFUNDED'
  );
}

export default function AdminRefundsPage() {
  const searchParams = useSearchParams();
  const preselectedOrderId = searchParams.get('orderId') || '';

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('운영자 수동 환불');
  const [refundMessage, setRefundMessage] = useState<string | null>(null);

  const orderQueueQuery = useV2AdminOrderQueue({ limit: 1000 });
  const refundOrder = useV2AdminRefundOrder();
  const checkCutoverPolicy = useV2AdminCutoverPolicyCheck();

  const refundableRows = useMemo(
    () => (orderQueueQuery.data?.items || []).filter((row) => isRefundableOrder(row)),
    [orderQueueQuery.data?.items],
  );

  const selectedOrder = useMemo(
    () => refundableRows.find((row) => row.order_id === selectedOrderId) || null,
    [refundableRows, selectedOrderId],
  );

  useEffect(() => {
    if (!preselectedOrderId || selectedOrderId) {
      return;
    }

    const exists = refundableRows.some((row) => row.order_id === preselectedOrderId);
    if (exists) {
      setSelectedOrderId(preselectedOrderId);
      setRefundMessage(null);
    }
  }, [preselectedOrderId, refundableRows, selectedOrderId]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) {
      return refundableRows;
    }

    const keyword = search.trim().toLowerCase();
    return refundableRows.filter(
      (row) =>
        row.order_no.toLowerCase().includes(keyword) ||
        row.order_id.toLowerCase().includes(keyword) ||
        String(row.depositor_name || '')
          .toLowerCase()
          .includes(keyword),
    );
  }, [refundableRows, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / ORDER_PAGE_SIZE)),
    [filteredRows.length],
  );

  const currentPageClamped = Math.min(currentPage, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPageClamped - 1) * ORDER_PAGE_SIZE;
    return filteredRows.slice(start, start + ORDER_PAGE_SIZE);
  }, [currentPageClamped, filteredRows]);

  const canRunRefund = Boolean(selectedOrder) && !refundOrder.isPending;

  async function handleRefundOrder() {
    if (!selectedOrder) {
      setRefundMessage('환불할 주문을 먼저 선택해 주세요.');
      return;
    }

    const amount = refundAmount.trim() ? Number(refundAmount.trim()) : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      setRefundMessage('환불 금액은 1 이상의 숫자여야 합니다.');
      return;
    }

    try {
      const policyCheck = await checkCutoverPolicy.mutateAsync({
        action_key: 'ORDER_REFUND_EXECUTE',
        requires_approval: true,
      });

      try {
        await refundOrder.mutateAsync({
          orderId: selectedOrder.order_id,
          data: {
            amount,
            reason: refundReason.trim() || null,
          },
        });
      } catch (refundError) {
        if (
          policyCheck.decision === 'APPROVAL_REQUIRED' &&
          isApprovalRequiredError(refundError)
        ) {
          setRefundMessage(
            `환불 승인 대기로 등록되었습니다. 주문 ${selectedOrder.order_no} 승인 큐를 확인해 주세요.`,
          );
          setSelectedOrderId(null);
          await orderQueueQuery.refetch();
          return;
        }
        throw refundError;
      }

      if (policyCheck.decision === 'APPROVAL_REQUIRED') {
        setRefundMessage(
          `환불 승인 대기로 등록되었습니다. 주문 ${selectedOrder.order_no} 승인 큐를 확인해 주세요.`,
        );
      } else {
        setRefundMessage(`환불을 실행했습니다. 주문 ${selectedOrder.order_no} 상태를 확인해 주세요.`);
      }

      setSelectedOrderId(null);
      setRefundAmount('');
      setRefundReason('운영자 수동 환불');
      await orderQueueQuery.refetch();
    } catch (refundError) {
      setRefundMessage(getErrorMessage(refundError));
    }
  }

  if (orderQueueQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (orderQueueQuery.error) {
    return (
      <div className="min-h-[60vh]">
        <EmptyState
          title="환불 대상 주문을 불러오지 못했습니다"
          description={
            orderQueueQuery.error instanceof Error
              ? orderQueueQuery.error.message
              : '잠시 후 다시 시도해 주세요.'
          }
          action={
            <Button
              intent="primary"
              size="sm"
              onClick={() => {
                void orderQueueQuery.refetch();
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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">환불 관리</h1>
        <p className="text-sm text-gray-500">
          환불/부분환불은 이 페이지에서만 실행합니다. 실행 전 cutover-policy 기반 승인 필요 여부를
          확인합니다.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">환불 가능 주문</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{refundableRows.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">현재 선택</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {selectedOrder ? '1' : '0'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">승인 정책</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">필요 시 승인 대기 등록</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-[220px_1fr_auto_auto]">
          <Input
            value={refundAmount}
            onChange={(event) => setRefundAmount(event.target.value)}
            placeholder="환불 금액(전체 환불은 비워두기)"
          />
          <Input
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
            placeholder="환불 사유"
          />
          <Button
            intent="danger"
            loading={refundOrder.isPending || checkCutoverPolicy.isPending}
            disabled={!canRunRefund}
            onClick={() => void handleRefundOrder()}
          >
            환불 실행
          </Button>
          <Button
            intent="secondary"
            disabled={refundOrder.isPending}
            onClick={() => setSelectedOrderId(null)}
          >
            대상 해제
          </Button>
        </div>

        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          {selectedOrder ? (
            <p>
              대상 주문: <span className="font-semibold">{selectedOrder.order_no}</span> · 결제 상태{' '}
              {selectedOrder.payment_status}
            </p>
          ) : (
            <p>아래 표에서 환불할 주문을 선택하세요.</p>
          )}
        </div>

        {refundMessage ? (
          <p className="mt-3 text-xs font-medium text-gray-700">{refundMessage}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="주문번호 / 주문 ID / 입금자명 검색"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {filteredRows.length === 0 ? (
          <EmptyState
            title="환불 가능 주문이 없습니다"
            description="검색 조건을 변경해 다시 조회해 보세요."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">주문</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">입금자명</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">현재 단계</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">결제 상태</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">금액</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">주문시각</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedRows.map((row) => {
                    const isSelected = row.order_id === selectedOrderId;
                    return (
                      <tr key={row.order_id} className={isSelected ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{row.order_no}</p>
                          <p className="text-xs text-gray-500" title={row.order_id}>
                            {truncateMiddle(row.order_id)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.depositor_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {linearStageLabel(resolveLinearStageFromRow(row))}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.payment_status}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(row.grand_total)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatDate(row.placed_at || row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              intent={isSelected ? 'secondary' : 'danger'}
                              size="sm"
                              disabled={refundOrder.isPending}
                              onClick={() => {
                                setSelectedOrderId(row.order_id);
                                setRefundMessage(null);
                              }}
                            >
                              {isSelected ? '선택됨' : '환불 대상 선택'}
                            </Button>
                            <Link href={`/admin/orders/${row.order_id}`}>
                              <Button intent="secondary" size="sm">
                                상세 보기
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
              <p className="text-gray-600">
                총 {filteredRows.length}건 · {currentPageClamped}/{totalPages} 페이지
              </p>
              <div className="flex items-center gap-2">
                <Button
                  intent="secondary"
                  size="sm"
                  disabled={currentPageClamped <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  이전
                </Button>
                <Button
                  intent="secondary"
                  size="sm"
                  disabled={currentPageClamped >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  다음
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
