'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { useOrder } from '@/lib/client/hooks/useOrders';
import { OrderDetail } from '@/src/components/admin/orders/OrderDetail';

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { data: order, isLoading, error } = useOrder(orderId || null);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <EmptyState
          title="주문을 찾을 수 없습니다"
          description={
            error instanceof Error
              ? error.message
              : '주문 정보를 불러오지 못했습니다'
          }
        >
          <Link href="/admin/orders">주문 목록으로 이동</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <OrderDetail order={order} />
    </div>
  );
}
