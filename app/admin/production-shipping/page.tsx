'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProductionManagementContent } from '@/app/admin/production/ProductionManagementContent';
import { ShippingManagementContent } from '@/app/admin/shipping/ShippingManagementContent';
import { PaymentConfirmationContent } from './PaymentConfirmationContent';

type UnifiedManagementTab =
  | 'payment-confirm'
  | 'production-candidates'
  | 'production-batches'
  | 'shipping-candidates'
  | 'shipping-batches';

const DEFAULT_TAB: UnifiedManagementTab = 'payment-confirm';

const TAB_OPTIONS: Array<{ key: UnifiedManagementTab; label: string; description: string }> = [
  {
    key: 'payment-confirm',
    label: '입금 확인',
    description: '입금 대기 주문 처리',
  },
  {
    key: 'production-candidates',
    label: '제작 후보 주문',
    description: '제작 시작 전 주문 선별',
  },
  {
    key: 'production-batches',
    label: '제작 배치 목록',
    description: '제작 진행/완료 관리',
  },
  {
    key: 'shipping-candidates',
    label: '배송 후보 주문',
    description: '출고 대상 주문 선별',
  },
  {
    key: 'shipping-batches',
    label: '배송 배치 워크벤치',
    description: '운송장/배송 상태 관리',
  },
];

function isUnifiedTab(value: string | null): value is UnifiedManagementTab {
  if (!value) {
    return false;
  }
  return TAB_OPTIONS.some((option) => option.key === value);
}

export default function AdminProductionShippingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get('tab');
  const activeTab: UnifiedManagementTab = isUnifiedTab(rawTab) ? rawTab : DEFAULT_TAB;

  const handleTabChange = (nextTab: UnifiedManagementTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', nextTab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">주문 이행 관리</h1>
        <p className="text-sm text-gray-600">
          입금 확인부터 제작/배송 운영까지 주문 이행 단계를 한 페이지에서 관리합니다.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-1">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-5">
          {TAB_OPTIONS.map((option) => {
            const isActive = option.key === activeTab;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleTabChange(option.key)}
                className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <p>{option.label}</p>
                <p className={`mt-1 text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                  {option.description}
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
