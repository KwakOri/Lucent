'use client';

import { useQuery } from '@tanstack/react-query';
import {
  V2AdminOpsAPI,
  type V2AdminOrderQueueRow,
} from '@/lib/client/api/v2-admin-ops.api';
import { apiClient } from '@/lib/client/utils/api-client';
import { Loading } from '@/components/ui/loading';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/src/constants';
import type { ApiResponse, PaginatedResponse } from '@/types';

interface DashboardData {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    activeProducts: number;
    activeArtists: number;
  };
  recentOrders: V2AdminOrderQueueRow[];
}

interface ProductSummary {
  id: string;
}

interface ArtistSummary {
  id: string;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [allOrders, pendingOrders, products, artists] = await Promise.all([
    V2AdminOpsAPI.listOrderQueue({ limit: 100 }),
    V2AdminOpsAPI.listOrderQueue({ limit: 100, order_status: 'PENDING' }),
    apiClient.get<PaginatedResponse<ProductSummary>>(
      '/api/products?page=1&limit=1&isActive=true',
    ),
    apiClient.get<ApiResponse<ArtistSummary[]>>('/api/artists'),
  ]);

  return {
    stats: {
      totalOrders: allOrders.data.items.length,
      pendingOrders: pendingOrders.data.items.length,
      activeProducts: products.pagination.total,
      activeArtists: artists.data.length,
    },
    recentOrders: allOrders.data.items.slice(0, 5),
  };
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 30,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">대시보드를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  const { stats, recentOrders } = data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">Lucent Management 관리 현황</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            전체 주문(최근 100건)
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {stats.totalOrders}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            입금 대기(최근 100건)
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-yellow-600">
            {stats.pendingOrders}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">활성 상품</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {stats.activeProducts}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">활성 아티스트</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {stats.activeArtists}
          </dd>
        </div>
      </div>

      <div className="mt-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-lg font-semibold text-gray-900">최근 주문</h2>
            <p className="mt-1 text-sm text-gray-500">최근 5개의 주문 내역입니다</p>
          </div>
        </div>

        <div className="mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        주문번호
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        구매자
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        금액
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        상태
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        주문일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                          주문 내역이 없습니다
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order.order_id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {order.order_no}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            -
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {order.grand_total.toLocaleString()}원
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${ORDER_STATUS_COLORS[order.order_status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {ORDER_STATUS_LABELS[order.order_status as keyof typeof ORDER_STATUS_LABELS] ||
                                order.order_status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(
                              order.placed_at || order.created_at,
                            ).toLocaleDateString('ko-KR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
