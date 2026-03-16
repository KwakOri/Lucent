'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loading } from '@/components/ui/loading';

const MIN_LOADING_MS = 900;

export default function OrderProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.order_id as string;

  useEffect(() => {
    if (!orderId) {
      router.replace('/checkout');
      return;
    }

    const completePath = `/order/complete/${orderId}`;
    void router.prefetch(completePath);

    const timeoutId = setTimeout(() => {
      router.replace(completePath);
    }, MIN_LOADING_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [orderId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <Loading size="lg" />
        <h1 className="mt-6 text-2xl font-bold text-text-primary">주문 처리 중입니다</h1>
        <p className="mt-2 text-sm text-text-secondary">
          결제와 주문 정보를 확인하고 있습니다. 잠시만 기다려 주세요.
        </p>
      </div>
    </div>
  );
}
