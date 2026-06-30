'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProductionManagementContent } from '@/app/admin/production/ProductionManagementContent';
import { ShippingManagementContent } from '@/app/admin/shipping/ShippingManagementContent';
import { isCanceledOrder, resolveLinearStageFromRow } from '@/app/admin/orders/order-stage';
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
} from '@/src/components/admin/AdminDesignSystem';
import { useV2AdminOrderQueue } from '@/lib/client/hooks/useV2AdminOps';
import {
  useV2AdminProductionBatches,
  useV2AdminProductionCandidates,
} from '@/lib/client/hooks/useV2AdminProduction';
import {
  useV2AdminShippingBatches,
  useV2AdminShippingCandidates,
} from '@/lib/client/hooks/useV2AdminShipping';
import { PaymentConfirmationContent } from './PaymentConfirmationContent';

type UnifiedManagementTab =
  | 'payment-confirm'
  | 'production-candidates'
  | 'production-batches'
  | 'shipping-candidates'
  | 'shipping-batches';

const DEFAULT_TAB: UnifiedManagementTab = 'payment-confirm';

const TAB_OPTIONS: Array<{ key: UnifiedManagementTab; label: string }> = [
  {
    key: 'payment-confirm',
    label: '입금 확인',
  },
  {
    key: 'production-candidates',
    label: '제작 후보 주문',
  },
  {
    key: 'production-batches',
    label: '제작 배치 목록',
  },
  {
    key: 'shipping-candidates',
    label: '배송 후보 주문',
  },
  {
    key: 'shipping-batches',
    label: '배송 배치 워크벤치',
  },
];

function isUnifiedTab(value: string | null): value is UnifiedManagementTab {
  if (!value) {
    return false;
  }
  return TAB_OPTIONS.some((option) => option.key === value);
}

function isCompletedBatch(row: { status?: string | null }) {
  return String(row.status || '').toUpperCase() === 'COMPLETED';
}

function isCompletedShippingCandidate(row: {
  order_status?: string | null;
  fulfillment_status?: string | null;
  waiting_shipment_count?: number | null;
  in_transit_shipment_count?: number | null;
  delivered_shipment_count?: number | null;
}) {
  const orderStatus = String(row.order_status || '').toUpperCase();
  const fulfillmentStatus = String(row.fulfillment_status || '').toUpperCase();

  if (orderStatus === 'COMPLETED' || fulfillmentStatus === 'FULFILLED') {
    return true;
  }

  const waiting = Number(row.waiting_shipment_count || 0);
  const inTransit = Number(row.in_transit_shipment_count || 0);
  const delivered = Number(row.delivered_shipment_count || 0);

  return delivered > 0 && waiting === 0 && inTransit === 0;
}

export default function AdminProductionShippingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paymentQueueQuery = useV2AdminOrderQueue({ limit: 1000 });
  const productionCandidatesQuery = useV2AdminProductionCandidates({ limit: 300 });
  const productionBatchesQuery = useV2AdminProductionBatches({ limit: 100 });
  const shippingCandidatesQuery = useV2AdminShippingCandidates({ limit: 300 });
  const shippingBatchesQuery = useV2AdminShippingBatches({ limit: 100 });

  const rawTab = searchParams.get('tab');
  const activeTab: UnifiedManagementTab = isUnifiedTab(rawTab) ? rawTab : DEFAULT_TAB;

  const tabCounts = useMemo<Record<UnifiedManagementTab, number>>(() => {
    const paymentPendingCount = (paymentQueueQuery.data?.items || []).filter(
      (row) => !isCanceledOrder(row) && resolveLinearStageFromRow(row) === 'PAYMENT_PENDING',
    ).length;
    const productionBatchOpenCount = (productionBatchesQuery.data?.items || []).filter(
      (row) => !isCompletedBatch(row),
    ).length;
    const shippingCandidateOpenCount = (shippingCandidatesQuery.data?.items || []).filter(
      (row) => !isCompletedShippingCandidate(row),
    ).length;
    const shippingBatchOpenCount = (shippingBatchesQuery.data?.items || []).filter(
      (row) => !isCompletedBatch(row),
    ).length;

    return {
      'payment-confirm': paymentPendingCount,
      'production-candidates': (productionCandidatesQuery.data?.items || []).length,
      'production-batches': productionBatchOpenCount,
      'shipping-candidates': shippingCandidateOpenCount,
      'shipping-batches': shippingBatchOpenCount,
    };
  }, [
    paymentQueueQuery.data?.items,
    productionBatchesQuery.data?.items,
    productionCandidatesQuery.data?.items,
    shippingBatchesQuery.data?.items,
    shippingCandidatesQuery.data?.items,
  ]);

  const handleTabChange = (nextTab: UnifiedManagementTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', nextTab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="fulfillment"
        title="주문 이행 관리"
        description="입금 확인부터 제작/배송 운영까지 주문 이행 단계를 한 페이지에서 관리합니다."
      />

      <section className="rounded-[18px] border border-[#e7e3d3] bg-white p-1">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-5">
          {TAB_OPTIONS.map((option) => {
            const isActive = option.key === activeTab;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleTabChange(option.key)}
                className={`rounded-[14px] px-4 py-3 text-left text-sm font-bold transition ${
                  isActive
                    ? 'bg-[#1a1a2e] text-white'
                    : 'bg-white text-[#1a1a2e]/70 hover:bg-[#faf9f3] hover:text-[#1a1a2e]'
                }`}
              >
                <p className="flex items-center gap-2">
                  <span>{option.label}</span>
                  <span className={`${isActive ? 'text-white/70' : 'text-[#1a1a2e]/45'}`}>
                    {tabCounts[option.key].toLocaleString()}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'payment-confirm' && <PaymentConfirmationContent embedded />}
      {activeTab === 'production-candidates' && (
        <ProductionManagementContent embedded forcedTab="candidates" />
      )}
      {activeTab === 'production-batches' && (
        <ProductionManagementContent embedded forcedTab="batches" />
      )}
      {activeTab === 'shipping-candidates' && (
        <ShippingManagementContent embedded forcedTab="candidates" />
      )}
      {activeTab === 'shipping-batches' && (
        <ShippingManagementContent embedded forcedTab="batches" />
      )}
    </div>
  );
}
