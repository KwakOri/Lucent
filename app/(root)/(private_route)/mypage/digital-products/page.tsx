'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, ShoppingBag } from 'lucide-react';
import { VoicePackCover } from '@/components/order/VoicePackCover';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import type { V2DigitalEntitlementItem } from '@/lib/client/api/v2-checkout.api';
import { useV2DigitalEntitlements } from '@/lib/client/hooks';
import {
  normalizeDisplayTitle,
  shouldShowOptionTitle,
} from '@/lib/client/utils/v2-item-display';
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

function getStatusBadgeClass(item: V2DigitalEntitlementItem): string {
  const status = normalizeStatus(item.status);
  const lineStatus = normalizeStatus(item.order_item.line_status);

  if (item.can_download && hasDownloadPath(item.download_path)) {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (
    status === 'EXPIRED' ||
    status === 'REVOKED' ||
    status === 'FAILED' ||
    lineStatus === 'CANCELED' ||
    lineStatus === 'REFUNDED'
  ) {
    return 'bg-red-100 text-red-700';
  }

  if (status === 'PENDING' || lineStatus === 'PENDING') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-neutral-100 text-neutral-600';
}

function formatDownloadSummary(item: V2DigitalEntitlementItem): string {
  if (item.remaining_downloads !== null) {
    return `${Math.max(0, item.remaining_downloads).toLocaleString()}회 남음`;
  }

  if (item.max_downloads !== null) {
    return `${Math.max(0, item.max_downloads - item.download_count).toLocaleString()}회 남음`;
  }

  if (item.expires_at) {
    return `${formatDate(item.expires_at)}까지`;
  }

  return '무제한';
}

function hasDownloadPath(path: string | null | undefined): boolean {
  return Boolean(path && path.trim().length > 0);
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
  const availableItemCount = useMemo(
    () =>
      digitalItems.filter(
        (item) => item.can_download && hasDownloadPath(item.download_path),
      ).length,
    [digitalItems],
  );

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
    <div className="min-h-screen bg-neutral-50">
      <section className="bg-[#f9f9ed] px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/mypage"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]/60 transition-colors hover:text-[#1a1a2e]"
          >
            <ArrowLeft className="h-4 w-4" />
            마이페이지
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#66B5F3]">
                Digital Archive
              </p>
              <h1 className="text-4xl font-bold leading-tight text-[#1a1a2e] sm:text-5xl">
                내 디지털 상품
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#1a1a2e]/60">
                구매한 보이스팩과 디지털 음원을 한곳에 모았습니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#1a1a2e]/70">
              <span className="rounded-full bg-white/75 px-3 py-1">
                총 {digitalItems.length.toLocaleString()}개
              </span>
              <span className="rounded-full bg-white/75 px-3 py-1">
                다운로드 가능 {availableItemCount.toLocaleString()}개
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          {digitalItems.length === 0 ? (
            <div className="rounded-xl border border-primary-200 bg-white p-10 sm:rounded-2xl">
              <EmptyState
                title="구매한 디지털 상품이 없습니다"
                description="상점의 디지털 음원 상품을 구매하면 이곳에서 모아볼 수 있습니다."
                action={
                  <Link href="/shop">
                    <Button intent="primary" size="md">
                      <ShoppingBag className="h-4 w-4" />
                      상점 보러가기
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {digitalItems.map((item, index) => {
                const title =
                  normalizeDisplayTitle(item.order_item.product_title) || '디지털 상품';
                const optionTitle =
                  normalizeDisplayTitle(item.order_item.variant_title) || '';
                const showOptionTitle = shouldShowOptionTitle({
                  productTitle: title,
                  optionTitle,
                });
                const statusLabel = resolveEntitlementStatusLabel(item);
                const downloadEnabled =
                  item.can_download && hasDownloadPath(item.download_path);
                const blockedMessage = resolveBlockedReasonMessage(
                  item.blocked_reason,
                  statusLabel,
                );
                const productPath = item.order_item.product_id
                  ? `/shop/${item.order_item.product_id}`
                  : null;
                const description = showOptionTitle
                  ? optionTitle
                  : item.digital_asset?.file_name || 'Voice Pack';

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-primary-200 bg-white transition-all duration-300 hover:shadow-xl sm:rounded-2xl sm:border-2 sm:hover:scale-105"
                  >
                    <VoicePackCover
                      index={index}
                      name={title}
                      thumbnail={item.order_item.thumbnail_url}
                      appearance="media"
                    />

                    <div className="p-3 sm:p-6">
                      <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:text-xs">
                          디지털 음원
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${getStatusBadgeClass(
                            item,
                          )}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div className="mb-3 sm:mb-4">
                        <h2 className="mb-1 line-clamp-1 text-sm font-bold leading-snug text-text-primary sm:mb-2 sm:line-clamp-2 sm:text-xl">
                          {title}
                        </h2>
                        <p className="line-clamp-1 text-xs text-text-secondary sm:line-clamp-2 sm:text-sm">
                          {description}
                        </p>
                      </div>

                      <p className="mb-3 text-lg font-bold text-primary-700 sm:mb-4 sm:text-2xl">
                        {formatCurrency(item.order_item.final_line_total)}
                      </p>

                      <dl className="mb-3 grid gap-1 text-[11px] leading-relaxed text-text-secondary sm:mb-4 sm:grid-cols-2 sm:text-xs">
                        <div>
                          <dt className="sr-only">구매일</dt>
                          <dd>{formatDate(item.order.placed_at)}</dd>
                        </div>
                        <div className="sm:text-right">
                          <dt className="sr-only">다운로드 가능 횟수</dt>
                          <dd>{formatDownloadSummary(item)}</dd>
                        </div>
                      </dl>

                      <div className="flex gap-2">
                        {productPath ? (
                          <Link href={productPath} className="min-w-0 flex-1">
                            <Button
                              intent="secondary"
                              size="sm"
                              fullWidth
                              className="text-xs sm:h-11 sm:rounded-lg sm:px-4 sm:text-base"
                            >
                              상품 보기
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            intent="secondary"
                            size="sm"
                            fullWidth
                            disabled
                            className="min-w-0 flex-1 text-xs sm:h-11 sm:rounded-lg sm:px-4 sm:text-base"
                          >
                            상품 보기
                          </Button>
                        )}
                        <Button
                          intent={downloadEnabled ? 'primary' : 'secondary'}
                          size="sm"
                          className="shrink-0 px-3 sm:h-11 sm:rounded-lg sm:px-4"
                          disabled={!downloadEnabled}
                          aria-label={`${title} 다운로드`}
                          title={downloadEnabled ? '다운로드' : blockedMessage}
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
                        </Button>
                      </div>

                      {!downloadEnabled ? (
                        <p className="mt-3 text-[11px] leading-relaxed text-amber-700 sm:text-xs">
                          {blockedMessage}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      </div>
  );
}
