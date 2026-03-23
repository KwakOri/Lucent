'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { VoicePackCover } from '@/components/order/VoicePackCover';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import type { V2CheckoutOrder } from '@/lib/client/api/v2-checkout.api';
import { useV2CheckoutOrders } from '@/lib/client/hooks';
import {
  buildDistinctOptionCountByProduct,
  normalizeDisplayTitle,
  shouldShowOptionTitle,
} from '@/lib/client/utils/v2-item-display';
import { useToast } from '@/src/components/toast';

interface DigitalLibraryItem {
  id: string;
  orderId: string;
  orderNo: string;
  orderedAt: string;
  productId: string | null;
  title: string;
  optionTitle: string;
  thumbnailUrl: string | null;
  quantity: number;
  lineTotal: number;
  lineStatus: string;
  canDownload: boolean;
  downloadUrl: string | null;
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
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function readBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return false;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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

function normalizeStatus(value: string | undefined): string {
  return String(value || '').toUpperCase();
}

function includesCanceledStatus(status: string | undefined): boolean {
  return normalizeStatus(status).includes('CANCEL');
}

function resolveLineStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '준비중',
    CONFIRMED: '이용 가능',
    FULFILLED: '다운로드 가능',
    PARTIAL: '부분 처리',
    COMPLETED: '완료',
    CANCELED: '취소됨',
    FAILED: '실패',
  };
  const normalized = normalizeStatus(status);
  return labels[normalized] || (normalized ? normalized : '-');
}

function resolveDownloadUrl(
  item: Record<string, unknown>,
  display: Record<string, unknown>,
): string | null {
  const metadata = asObject(item.metadata);
  const candidates = [
    item.download_url,
    metadata.download_url,
    metadata.digital_file_url,
    display.download_url,
    display.digital_file_url,
  ];

  for (const candidate of candidates) {
    const url = readString(candidate).trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
  }

  return null;
}

function isPaidOrder(order: V2CheckoutOrder): boolean {
  const orderStatus = normalizeStatus(order.order_status);
  const paymentStatus = normalizeStatus(order.payment_status);
  const fulfillmentStatus = normalizeStatus(order.fulfillment_status);

  if (
    includesCanceledStatus(orderStatus) ||
    includesCanceledStatus(paymentStatus) ||
    includesCanceledStatus(fulfillmentStatus)
  ) {
    return false;
  }

  if (paymentStatus === 'AUTHORIZED' || paymentStatus === 'CAPTURED') {
    return true;
  }

  return orderStatus === 'COMPLETED' || fulfillmentStatus === 'FULFILLED';
}

function extractDigitalItems(order: V2CheckoutOrder): DigitalLibraryItem[] {
  const rawItems = Array.isArray(order.items)
    ? ((order.items as Array<Record<string, unknown>>) ?? [])
    : [];
  const orderPaid = isPaidOrder(order);

  const optionCountByProduct = buildDistinctOptionCountByProduct({
    rows: rawItems,
    getProductId: (rawItem) => {
      const item = asObject(rawItem);
      const display = asObject(item.display_snapshot);
      return readString(item.product_id) || readString(display.product_id) || '';
    },
    getOptionId: (rawItem) => readString(asObject(rawItem).variant_id),
  });

  return rawItems
    .map((rawItem, index) => {
      const item = asObject(rawItem);
      const display = asObject(item.display_snapshot);
      const requiresShipping =
        readBoolean(display.requires_shipping) ||
        readBoolean(item.requires_shipping_snapshot);

      if (requiresShipping) {
        return null;
      }

      const lineStatus = readString(item.line_status);
      const productId =
        normalizeDisplayTitle(readString(item.product_id)) ||
        normalizeDisplayTitle(readString(display.product_id));
      const title =
        normalizeDisplayTitle(readString(item.product_name_snapshot)) ||
        normalizeDisplayTitle(readString(display.product_title)) ||
        normalizeDisplayTitle(readString(display.title)) ||
        readString(item.variant_id) ||
        `디지털 상품 ${index + 1}`;
      const optionTitle =
        normalizeDisplayTitle(readString(item.variant_name_snapshot)) ||
        normalizeDisplayTitle(readString(display.variant_title)) ||
        normalizeDisplayTitle(readString(display.title));
      const showOptionTitle = shouldShowOptionTitle({
        productTitle: title,
        optionTitle,
        distinctOptionCount: productId ? optionCountByProduct.get(productId) : undefined,
      });

      const lineTotal = Math.max(
        0,
        readNumber(item.final_line_total || item.line_subtotal),
      );
      const downloadUrl = resolveDownloadUrl(item, display);

      return {
        id: `${order.id}:${readString(item.id) || `line-${index}`}`,
        orderId: order.id,
        orderNo: order.order_no,
        orderedAt: order.placed_at || '',
        productId: productId || null,
        title,
        optionTitle: showOptionTitle && optionTitle ? optionTitle : '',
        thumbnailUrl: normalizeDisplayTitle(readString(display.thumbnail_url)) || null,
        quantity: Math.max(1, readNumber(item.quantity)),
        lineTotal,
        lineStatus,
        canDownload: orderPaid && !includesCanceledStatus(lineStatus),
        downloadUrl,
      } as DigitalLibraryItem;
    })
    .filter((item): item is DigitalLibraryItem => item !== null);
}

export default function MyDigitalProductsPage() {
  const { showToast } = useToast();
  const ordersQuery = useV2CheckoutOrders({ limit: 100 });

  const digitalItems = useMemo(() => {
    const orders = ordersQuery.data?.items || [];
    return orders
      .flatMap((order) => extractDigitalItems(order))
      .sort((left, right) => {
        const leftTime = new Date(left.orderedAt).getTime() || 0;
        const rightTime = new Date(right.orderedAt).getTime() || 0;
        return rightTime - leftTime;
      });
  }, [ordersQuery.data?.items]);

  if (ordersQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (ordersQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          title="디지털 상품을 불러오지 못했습니다"
          description={
            ordersQuery.error instanceof Error
              ? ordersQuery.error.message
              : '잠시 후 다시 시도해 주세요.'
          }
          action={
            <Button
              intent="primary"
              size="md"
              onClick={() => {
                void ordersQuery.refetch();
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
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">디지털 상품</h1>
            <p className="mt-1 text-sm text-text-secondary">
              구매한 디지털 음원을 보관함처럼 확인하고 다운로드할 수 있는 초안 화면입니다.
            </p>
          </div>
          <Link href="/mypage">
            <Button intent="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              마이페이지로 돌아가기
            </Button>
          </Link>
        </header>

        {digitalItems.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10">
            <EmptyState
              title="구매한 디지털 상품이 없습니다"
              description="상점의 Voice Pack 상품을 구매하면 이곳에서 모아볼 수 있습니다."
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {digitalItems.map((item, index) => {
              const statusLabel = resolveLineStatusLabel(item.lineStatus);
              const downloadEnabled = item.canDownload && Boolean(item.downloadUrl);

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-primary-200 bg-white shadow-sm"
                >
                  <VoicePackCover
                    index={index}
                    name={item.title}
                    thumbnail={item.thumbnailUrl}
                  />

                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        디지털 음원
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                        {statusLabel}
                      </span>
                    </div>

                    <div>
                      <p className="line-clamp-2 text-lg font-bold text-text-primary">{item.title}</p>
                      {item.optionTitle ? (
                        <p className="text-xs text-text-secondary">{item.optionTitle}</p>
                      ) : null}
                    </div>

                    <div className="space-y-1 text-xs text-text-secondary">
                      <p>주문번호: {item.orderNo}</p>
                      <p>구매일: {formatDate(item.orderedAt)}</p>
                      <p>
                        수량 {item.quantity}개 · {formatCurrency(item.lineTotal)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        intent="primary"
                        size="sm"
                        disabled={!downloadEnabled}
                        onClick={() => {
                          if (item.downloadUrl && downloadEnabled) {
                            window.open(item.downloadUrl, '_blank', 'noopener,noreferrer');
                            return;
                          }
                          showToast('다운로드 링크 연동은 다음 단계에서 연결할 수 있어요.', {
                            type: 'info',
                          });
                        }}
                      >
                        <Download className="h-4 w-4" />
                        {downloadEnabled ? '다운로드' : '다운로드 준비중'}
                      </Button>

                      {item.productId ? (
                        <Link href={`/shop/${item.productId}`}>
                          <Button intent="secondary" size="sm">
                            상세 보기
                          </Button>
                        </Link>
                      ) : null}
                    </div>

                    {!item.canDownload ? (
                      <p className="text-xs text-amber-700">
                        결제/처리 상태 확인 후 다운로드가 활성화됩니다.
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
