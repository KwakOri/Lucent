'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import { useV2AdminOrderQueue } from '@/lib/client/hooks/useV2AdminOps';

function formatCurrency(amount: number): string {
  return `${Math.max(0, amount).toLocaleString()}원`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeClass(status: string) {
  if (status.includes('FAILED') || status.includes('CANCELED')) {
    return 'bg-red-100 text-red-700';
  }
  if (
    status.includes('PENDING') ||
    status.includes('UNFULFILLED') ||
    status.includes('PARTIAL')
  ) {
    return 'bg-yellow-100 text-yellow-700';
  }
  return 'bg-green-100 text-green-700';
}

export default function AdminOrdersPage() {
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useV2AdminOrderQueue({
    limit: 200,
    order_status: orderStatusFilter || undefined,
  });

  const rows = useMemo(() => {
    const items = data?.items || [];
    if (!search.trim()) {
      return items;
    }
    const keyword = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.order_no.toLowerCase().includes(keyword) ||
        item.order_id.toLowerCase().includes(keyword),
    );
  }, [data?.items, search]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh]">
        <EmptyState
          title="주문 큐를 불러오지 못했습니다"
          description={error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'}
          action={
            <Button
              intent="primary"
              size="sm"
              onClick={() => {
                void refetch();
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
      <header>
        <h1 className="text-2xl font-bold text-gray-900">주문 운영 큐 (v2)</h1>
        <p className="mt-1 text-sm text-gray-500">
          주문 상태 3축과 이행 위험도를 기준으로 운영 대상을 확인합니다.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <select
            value={orderStatusFilter}
            onChange={(event) => setOrderStatusFilter(event.target.value)}
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm"
          >
            <option value="">전체 주문 상태</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="주문번호 또는 주문 ID 검색"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <EmptyState
            title="조회된 주문이 없습니다"
            description="필터 조건을 변경해 다시 조회해 보세요."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">주문</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">상태</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">금액</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">이행 위험도</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">주문시각</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const waitingShipmentCount = Number.isFinite(row.waiting_shipment_count)
                    ? row.waiting_shipment_count
                    : null;
                  const inTransitShipmentCount = Number.isFinite(row.in_transit_shipment_count)
                    ? row.in_transit_shipment_count
                    : null;
                  const deliveredShipmentCount = Number.isFinite(row.delivered_shipment_count)
                    ? row.delivered_shipment_count
                    : null;
                  const hasSplitShipmentCounts =
                    waitingShipmentCount !== null ||
                    inTransitShipmentCount !== null ||
                    deliveredShipmentCount !== null;

                  return (
                    <tr key={row.order_id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{row.order_no}</p>
                        <p className="text-xs text-gray-500">{row.order_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              row.order_status,
                            )}`}
                          >
                            주문 {row.order_status}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              row.payment_status,
                            )}`}
                          >
                            결제 {row.payment_status}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              row.fulfillment_status,
                            )}`}
                          >
                            이행 {row.fulfillment_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(row.grand_total)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {hasSplitShipmentCounts ? (
                          <>
                            <p>배송 대기: {waitingShipmentCount ?? 0}</p>
                            <p>배송 중: {inTransitShipmentCount ?? 0}</p>
                            <p>배송 완료: {deliveredShipmentCount ?? 0}</p>
                          </>
                        ) : (
                          <p>배송 진행중: {row.active_shipment_count}</p>
                        )}
                        <p>디지털 진행중: {row.active_entitlement_count}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(row.placed_at || row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/orders/${row.order_id}`}>
                          <Button intent="secondary" size="sm">
                            상세 보기
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
