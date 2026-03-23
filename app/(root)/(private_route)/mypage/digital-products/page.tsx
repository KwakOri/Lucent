'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { VoicePackCover } from '@/components/order/VoicePackCover';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import type { V2DigitalEntitlementItem } from '@/lib/client/api/v2-checkout.api';
import { useV2DigitalEntitlements } from '@/lib/client/hooks';
import { normalizeDisplayTitle } from '@/lib/client/utils/v2-item-display';
import { useToast } from '@/src/components/toast';

function formatCurrency(amount: number): string {
  return `${Math.max(0, amount).toLocaleString()}원`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function normalizeStatus(value: string | null | undefined): string {
  return String(value || '').toUpperCase();
}

function resolveEntitlementStatusLabel(item: V2DigitalEntitlementItem): string {
  const status = normalizeStatus(item.status);
  const lineStatus = normalizeStatus(item.order_item.line_status);

  const entitlementLabels: Record<string, string> = {
    GRANTED: '다운로드 가능',
    PENDING: '준비중',
    EXPIRED: '만료됨',
    REVOKED: '회수됨',
    FAILED: '실패',
  };

  if (status && entitlementLabels[status]) {
    return entitlementLabels[status];
  }

  const lineLabels: Record<string, string> = {
    PENDING: '준비중',
    CONFIRMED: '이용 가능',
    FULFILLED: '다운로드 가능',
    CANCELED: '취소됨',
    PARTIALLY_REFUNDED: '부분환불',
    REFUNDED: '환불',
  };

  if (lineStatus && lineLabels[lineStatus]) {
    return lineLabels[lineStatus];
  }

  return status || lineStatus || '-';
}

function resolveBlockedReasonMessage(
  blockedReason: string | null,
  fallbackStatusLabel: string,
): string {
  const reason = normalizeStatus(blockedReason);
  const messages: Record<string, string> = {
    DIGITAL_ASSET_NOT_READY: '파일 준비가 완료되면 다운로드할 수 있습니다.',
    ENTITLEMENT_PENDING: '권한이 아직 발급되지 않았습니다.',
    ENTITLEMENT_EXPIRED: '다운로드 가능 기간이 만료되었습니다.',
    ENTITLEMENT_REVOKED: '회수된 상품은 다운로드할 수 없습니다.',
    ENTITLEMENT_FAILED: '다운로드 권한 상태를 확인해 주세요.',
    ENTITLEMENT_DOWNLOAD_LIMIT_EXCEEDED: '다운로드 가능 횟수를 모두 사용했습니다.',
  };

  if (reason && messages[reason]) {
    return messages[reason];
  }

  return `${fallbackStatusLabel} 상태라서 아직 다운로드할 수 없습니다.`;
}

function sortByRecent(left: V2DigitalEntitlementItem, right: V2DigitalEntitlementItem) {
  const leftTime =
    new Date(left.order.placed_at || left.granted_at || 0).getTime() || 0;
  const rightTime =
    new Date(right.order.placed_at || right.granted_at || 0).getTime() || 0;
  return rightTime - leftTime;
}

export default function MyDigitalProductsPage() {
  const { showToast } = useToast();
  const entitlementsQuery = useV2DigitalEntitlements();

  const digitalItems = useMemo(() => {
    const items = entitlementsQuery.data?.items || [];
    return [...items].sort(sortByRecent);
  }, [entitlementsQuery.data?.items]);

  if (entitlementsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (entitlementsQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          title="디지털 상품을 불러오지 못했습니다"
          description={
            entitlementsQuery.error instanceof Error
              ? entitlementsQuery.error.message
              : '잠시 후 다시 시도해 주세요.'
          }
          action={
            <Button
              intent="primary"
              size="md"
              onClick={() => {
                void entitlementsQuery.refetch();
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
              description="상점의 디지털 음원 상품을 구매하면 이곳에서 모아볼 수 있습니다."
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
              const title =
                normalizeDisplayTitle(item.order_item.product_title) || '디지털 상품';
              const optionTitle =
                normalizeDisplayTitle(item.order_item.variant_title) || '';
              const statusLabel = resolveEntitlementStatusLabel(item);
              const downloadEnabled = item.can_download && Boolean(item.download_path);
              const blockedMessage = resolveBlockedReasonMessage(
                item.blocked_reason,
                statusLabel,
              );

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-primary-200 bg-white shadow-sm"
                >
                  <VoicePackCover
                    index={index}
                    name={title}
                    thumbnail={item.order_item.thumbnail_url}
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
                      <p className="line-clamp-2 text-lg font-bold text-text-primary">{title}</p>
                      {optionTitle ? (
                        <p className="text-xs text-text-secondary">{optionTitle}</p>
                      ) : null}
                    </div>

                    <div className="space-y-1 text-xs text-text-secondary">
                      <p>주문번호: {item.order.order_no}</p>
                      <p>구매일: {formatDate(item.order.placed_at)}</p>
                      <p>
                        수량 {item.order_item.quantity}개 ·{' '}
                        {formatCurrency(item.order_item.final_line_total)}
                      </p>
                      {item.remaining_downloads !== null ? (
                        <p>남은 다운로드: {item.remaining_downloads}회</p>
                      ) : (
                        <p>남은 다운로드: 무제한</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        intent="primary"
                        size="sm"
                        disabled={!downloadEnabled}
                        onClick={() => {
                          if (!downloadEnabled || !item.download_path) {
                            showToast(blockedMessage, {
                              type: 'info',
                            });
                            return;
                          }
                          window.open(item.download_path, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <Download className="h-4 w-4" />
                        {downloadEnabled ? '다운로드' : '다운로드 준비중'}
                      </Button>

                      {item.order_item.product_id ? (
                        <Link href={`/shop/${item.order_item.product_id}`}>
                          <Button intent="secondary" size="sm">
                            상세 보기
                          </Button>
                        </Link>
                      ) : null}
                    </div>

                    {!downloadEnabled ? (
                      <p className="text-xs text-amber-700">{blockedMessage}</p>
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
