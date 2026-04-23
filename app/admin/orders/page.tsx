'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import type { V2AdminOrderLinearStage, V2AdminOrderQueueRow } from '@/lib/client/api/v2-admin-ops.api';
import { useV2AdminOrderQueue } from '@/lib/client/hooks/useV2AdminOps';
import {
  compositionBadgeClass,
  formatCurrency,
  formatDate,
  isCanceledOrder,
  linearStageLabel,
  resolveLinearStageFromRow,
  truncateMiddle,
} from './order-stage';

type V2OrderStageTab = V2AdminOrderLinearStage | 'CANCELED' | 'ALL';
type V2OrderRowStage = V2AdminOrderLinearStage | 'CANCELED';

type StageTabOption = {
  key: V2OrderStageTab;
  label: string;
};

const ORDER_PAGE_SIZE = 10;

const STAGE_TABS: StageTabOption[] = [
  { key: 'PAYMENT_PENDING', label: '입금 대기' },
  { key: 'PAYMENT_CONFIRMED', label: '입금 확인' },
  { key: 'PRODUCTION', label: '제작중' },
  { key: 'READY_TO_SHIP', label: '배송 대기' },
  { key: 'IN_TRANSIT', label: '배송 중' },
  { key: 'DELIVERED', label: '배송 완료' },
  { key: 'CANCELED', label: '취소' },
  { key: 'ALL', label: '전체' },
];

function resolveStageTabFromRow(row: V2AdminOrderQueueRow): V2OrderRowStage {
  if (isCanceledOrder(row)) {
    return 'CANCELED';
  }
  return resolveLinearStageFromRow(row);
}

function stageBadgeLabel(stage: V2OrderRowStage): string {
  if (stage === 'CANCELED') {
    return '취소';
  }
  return linearStageLabel(stage);
}

function normalizeStageTabFromQuery(value: string | null): V2OrderStageTab | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase().replace(/-/g, '_');
  if (STAGE_TABS.some((tab) => tab.key === normalized)) {
    return normalized as V2OrderStageTab;
  }
  return null;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stageTabFromQuery =
    normalizeStageTabFromQuery(searchParams.get('stage')) || 'PAYMENT_PENDING';
  const stageTab = stageTabFromQuery;
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error, refetch } = useV2AdminOrderQueue({
    limit: 1000,
  });

  const stageCounts = useMemo(() => {
    const counts: Record<V2OrderStageTab, number> = {
      ALL: 0,
      CANCELED: 0,
      PAYMENT_PENDING: 0,
      PAYMENT_CONFIRMED: 0,
      PRODUCTION: 0,
      READY_TO_SHIP: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
    };

    for (const item of data?.items || []) {
      const stage = resolveStageTabFromRow(item);
      counts.ALL += 1;
      counts[stage] += 1;
    }

    return counts;
  }, [data?.items]);

  const filteredRows = useMemo(() => {
    const items = data?.items || [];
    const stageFiltered =
      stageTab === 'ALL'
        ? items
        : items.filter((item) => resolveStageTabFromRow(item) === stageTab);

    if (!search.trim()) {
      return stageFiltered;
    }

    const keyword = search.trim().toLowerCase();
    return stageFiltered.filter(
      (item) =>
        item.order_no.toLowerCase().includes(keyword) ||
        String(item.depositor_name || '')
          .toLowerCase()
          .includes(keyword) ||
        item.order_id.toLowerCase().includes(keyword),
    );
  }, [data?.items, search, stageTab]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / ORDER_PAGE_SIZE)),
    [filteredRows.length],
  );

  const currentPageClamped = Math.min(currentPage, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPageClamped - 1) * ORDER_PAGE_SIZE;
    return filteredRows.slice(start, start + ORDER_PAGE_SIZE);
  }, [currentPageClamped, filteredRows]);

  function handleStageTabChange(nextTab: V2OrderStageTab) {
    setCurrentPage(1);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('stage', nextTab);
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

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
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">주문 조회</h1>
        <p className="text-sm text-gray-500">
          주문 흐름 현황을 조회하는 전용 화면입니다. 실행 액션은 별도 화면에서 처리합니다.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {STAGE_TABS.map((tab) => {
            const isActive = stageTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStageTabChange(tab.key)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {stageCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="주문번호 / 주문 ID / 입금자명 검색"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/production-shipping?tab=payment-confirm">
            <Button intent="secondary" size="sm">
              입금 확인 화면으로 이동
            </Button>
          </Link>
          <Link href="/admin/refunds">
            <Button intent="secondary" size="sm">
              환불 관리로 이동
            </Button>
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {filteredRows.length === 0 ? (
          <EmptyState
            title="조회된 주문이 없습니다"
            description="필터 조건을 변경해 다시 조회해 보세요."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">주문</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">입금자명</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">단계</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">금액</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">상품 종류</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">주문시각</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedRows.map((row) => {
                    const hasBundle = row.has_bundle === true;
                    const hasDigital = row.has_digital === true;
                    const hasPhysical = row.has_physical === true;
                    const stage = resolveStageTabFromRow(row);
                    const stageBadgeClassName =
                      stage === 'CANCELED'
                        ? 'rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700'
                        : 'rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700';

                    return (
                      <tr key={row.order_id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{row.order_no}</p>
                          <p className="text-xs text-gray-500" title={row.order_id}>
                            {truncateMiddle(row.order_id)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.depositor_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={stageBadgeClassName}>{stageBadgeLabel(stage)}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(row.grand_total)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {hasBundle ? (
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${compositionBadgeClass(
                                  'BUNDLE',
                                )}`}
                              >
                                번들
                              </span>
                            ) : null}
                            {hasDigital ? (
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${compositionBadgeClass(
                                  'DIGITAL',
                                )}`}
                              >
                                디지털
                              </span>
                            ) : null}
                            {hasPhysical ? (
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${compositionBadgeClass(
                                  'PHYSICAL',
                                )}`}
                              >
                                실물
                              </span>
                            ) : null}
                            {!hasBundle && !hasDigital && !hasPhysical ? (
                              <span className="text-xs text-gray-500">-</span>
                            ) : null}
                          </div>
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
