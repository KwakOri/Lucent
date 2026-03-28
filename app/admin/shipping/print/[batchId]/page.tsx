'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import type { V2AdminShippingBatchPackageRow } from '@/lib/client/api/v2-admin-shipping.api';
import { useV2AdminShippingBatchDetail } from '@/lib/client/hooks/useV2AdminShipping';

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveBatchStatusLabel(status: string | null | undefined): string {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'DRAFT') {
    return '출고 준비 전';
  }
  if (normalized === 'ACTIVE') {
    return '출고 준비중';
  }
  if (normalized === 'DISPATCHED') {
    return '배송중';
  }
  if (normalized === 'COMPLETED') {
    return '배송 완료';
  }
  if (normalized === 'CANCELED') {
    return '취소됨';
  }
  return status || '-';
}

function readSnapshotText(snapshot: Record<string, unknown> | null, key: string): string {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }
  const value = snapshot[key];
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function buildAddressText(snapshot: Record<string, unknown> | null): string {
  const keys = ['line1', 'line2', 'address', 'address1', 'address_1', 'road_address'];
  return keys
    .map((key) => readSnapshotText(snapshot, key))
    .filter((value) => value.length > 0)
    .join(' ')
    .trim();
}

function readLineItemText(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function readLineItemQuantity(item: Record<string, unknown>): number {
  const raw = item.quantity ?? item.qty ?? item.item_quantity;
  const quantity = Number(raw);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }
  return Math.floor(quantity);
}

function isCanceledLineItem(item: Record<string, unknown>): boolean {
  const status = String(item.line_status || item.status || '').toUpperCase();
  return status === 'CANCELED' || status === 'REFUNDED';
}

function buildLineItemRows(
  lineItemsSnapshot: Array<Record<string, unknown>> | null,
): Array<{ label: string; quantity: number }> {
  if (!Array.isArray(lineItemsSnapshot)) {
    return [];
  }

  return lineItemsSnapshot
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => !isCanceledLineItem(item))
    .map((item) => {
      const productName =
        readLineItemText(item, ['product_name_snapshot', 'product_name', 'product_title']) ||
        '이름 없는 상품';
      const variantName = readLineItemText(item, [
        'variant_name_snapshot',
        'variant_name',
        'variant_title',
      ]);
      const label = variantName ? `${productName} (${variantName})` : productName;
      return {
        label,
        quantity: readLineItemQuantity(item),
      };
    })
    .filter((row) => row.quantity > 0);
}

export default function ShippingPrintPage() {
  const params = useParams<{ batchId: string }>();
  const searchParams = useSearchParams();
  const batchId = typeof params?.batchId === 'string' ? params.batchId : '';
  const autoPrint = searchParams.get('autoprint') === '1';

  const detailQuery = useV2AdminShippingBatchDetail(batchId || null);
  const detail = detailQuery.data;

  const printedAt = useMemo(() => formatDateTime(new Date().toISOString()), []);

  const packageByBatchOrderId = useMemo(() => {
    const map = new Map<string, V2AdminShippingBatchPackageRow>();
    for (const row of detail?.packages || []) {
      if (typeof row.batch_order_id === 'string' && !map.has(row.batch_order_id)) {
        map.set(row.batch_order_id, row);
      }
    }
    return map;
  }, [detail?.packages]);

  const rows = useMemo(() => {
    return (detail?.orders || []).map((order, index) => {
      const lineItems = buildLineItemRows(
        order.line_items_snapshot as Array<Record<string, unknown>> | null,
      );
      const quantityTotal = lineItems.reduce((sum, row) => sum + row.quantity, 0);
      const packageRow = packageByBatchOrderId.get(order.id) || null;
      const carrier =
        typeof packageRow?.carrier_code === 'string' ? packageRow.carrier_code.trim() : '';
      const trackingNo =
        typeof packageRow?.tracking_no === 'string' ? packageRow.tracking_no.trim() : '';
      const trackingDisplay =
        trackingNo.length > 0 ? `${carrier || '-'} / ${trackingNo}` : '';

      return {
        sequence: index + 1,
        orderNo: order.order_no || '-',
        recipientName: order.recipient_name || '-',
        recipientPhone: order.recipient_phone || '-',
        address: buildAddressText(order.shipping_address_snapshot as Record<string, unknown> | null) || '-',
        items: lineItems,
        quantityTotal,
        trackingDisplay,
      };
    });
  }, [detail?.orders, packageByBatchOrderId]);

  const totalQuantity = useMemo(
    () => rows.reduce((sum, row) => sum + row.quantityTotal, 0),
    [rows],
  );

  const trackingFilledCount = useMemo(
    () => rows.filter((row) => row.trackingDisplay.length > 0).length,
    [rows],
  );

  useEffect(() => {
    if (!autoPrint || !detail || typeof window === 'undefined') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [autoPrint, detail]);

  if (!batchId) {
    return <EmptyState title="배치 ID가 없습니다." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          body {
            background: #fff;
          }

          .print-actions {
            display: none !important;
          }

          .print-shell {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-sheet {
            box-shadow: none !important;
            border: none !important;
          }

          .print-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-order-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between">
        <Button intent="neutral" onClick={() => window.history.back()}>
          뒤로가기
        </Button>
        <Button onClick={() => window.print()}>인쇄</Button>
      </div>

      <div className="print-shell mx-auto w-full max-w-[210mm]">
        {detailQuery.isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            <Loading text="배송 인쇄 문서를 준비하는 중입니다." />
          </div>
        ) : !detail ? (
          <EmptyState title="배송 배치 정보를 불러오지 못했습니다." />
        ) : (
          <section className="print-sheet rounded-xl border border-gray-300 bg-white p-6">
            <header className="space-y-2 border-b border-gray-200 pb-4">
              <h1 className="text-xl font-bold text-gray-900">배송 리스트</h1>
              <p className="text-sm text-gray-600">
                배송 작업에 필요한 정보만 요약한 인쇄용 문서입니다.
              </p>
            </header>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
              <p>
                <span className="font-semibold text-gray-900">작성 일시</span>: {printedAt}
              </p>
              <p>
                <span className="font-semibold text-gray-900">배치 번호</span>:{' '}
                {String(detail.batch.batch_no || '-')}
              </p>
              <p>
                <span className="font-semibold text-gray-900">배치명</span>:{' '}
                {String(detail.batch.title || '-')}
              </p>
              <p>
                <span className="font-semibold text-gray-900">배치 상태</span>:{' '}
                {resolveBatchStatusLabel(String(detail.batch.status || '-'))}
              </p>
              <p>
                <span className="font-semibold text-gray-900">주문 건수</span>: {rows.length}건
              </p>
              <p>
                <span className="font-semibold text-gray-900">상품 수량합</span>:{' '}
                {totalQuantity.toLocaleString()}개
              </p>
              <p>
                <span className="font-semibold text-gray-900">운송장 입력</span>:{' '}
                {trackingFilledCount}/{rows.length}
              </p>
              <p>
                <span className="font-semibold text-gray-900">출력 기준</span>: A4 세로
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {rows.map((row) => (
                <article
                  key={`${row.orderNo}-${row.sequence}`}
                  className="print-order-card overflow-hidden rounded-md border border-gray-300"
                >
                  <div className="grid grid-cols-1 gap-0 text-xs text-gray-800 md:grid-cols-3">
                    <div className="border-b border-gray-300 p-2 md:border-b-0 md:border-r">
                      <p className="text-[11px] text-gray-500">No / 주문번호</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {row.sequence}. {row.orderNo}
                      </p>
                    </div>
                    <div className="border-b border-gray-300 p-2 md:border-b-0 md:border-r">
                      <p className="text-[11px] text-gray-500">수취인 / 연락처</p>
                      <p className="mt-1">
                        {row.recipientName} / {row.recipientPhone}
                      </p>
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] text-gray-500">운송장</p>
                      <p className="mt-1">{row.trackingDisplay || '-'}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700">
                    <span className="font-medium text-gray-900">주소</span>: {row.address}
                  </div>

                  <div className="border-t border-gray-300">
                    <div className="flex items-center justify-between bg-gray-100 px-2 py-1 text-xs">
                      <p className="font-medium text-gray-900">배송 대상 상품</p>
                      <p className="text-gray-700">
                        수량합 <span className="font-semibold">{row.quantityTotal.toLocaleString()}</span>
                      </p>
                    </div>
                    <table className="print-table min-w-full border-collapse text-xs">
                      <thead>
                        <tr className="text-gray-700">
                          <th className="border-t border-gray-300 px-2 py-1 text-left">상품명</th>
                          <th className="border-l border-t border-gray-300 px-2 py-1 text-right">수량</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.items.length === 0 ? (
                          <tr>
                            <td className="border-t border-gray-300 px-2 py-1 text-gray-500" colSpan={2}>
                              배송 대상 상품이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          row.items.map((item) => (
                            <tr key={`${row.orderNo}-${item.label}`}>
                              <td className="border-t border-gray-300 px-2 py-1 leading-relaxed text-gray-900">
                                {item.label}
                              </td>
                              <td className="border-l border-t border-gray-300 px-2 py-1 text-right text-gray-800">
                                {item.quantity.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
