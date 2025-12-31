import { OrderService } from '@/lib/server/services/order.service';
import { ProductService } from '@/lib/server/services/product.service';
import { ArtistService } from '@/lib/server/services/artist.service';

const statusLabels: Record<string, string> = {
  PENDING: '입금대기',
  PAID: '결제완료',
  MAKING: '제작중',
  SHIPPING: '배송중',
  DONE: '완료',
};

export default async function AdminDashboard() {
  // Service Layer를 통해 통계 및 최근 주문 조회
  const [orderStats, productStats, artistStats, recentOrders] = await Promise.all([
    OrderService.getOrdersStats(),
    ProductService.getProductsStats(),
    ArtistService.getArtistsStats(),
    OrderService.getRecentOrders(5),
  ]);

  const stats = {
    totalOrders: orderStats.totalOrders,
    pendingOrders: orderStats.pendingOrders,
    activeProducts: productStats.activeProducts,
    activeArtists: artistStats.activeArtists,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">
          Lucent Management 관리 현황
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">전체 주문</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {stats.totalOrders}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">입금 대기</dt>
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

      {/* Recent Orders */}
      <div className="mt-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-lg font-semibold text-gray-900">최근 주문</h2>
            <p className="mt-1 text-sm text-gray-500">
              최근 5개의 주문 내역입니다
            </p>
          </div>
        </div>

        <div className="mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        주문번호
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        구매자
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        금액
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        상태
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
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
                        <tr key={order.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {order.order_number}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {order.buyer_name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {order.total_amount.toLocaleString()}원
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`
                              inline-flex rounded-full px-2 text-xs font-semibold leading-5
                              ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${order.status === 'PAID' ? 'bg-green-100 text-green-800' : ''}
                              ${order.status === 'MAKING' ? 'bg-blue-100 text-blue-800' : ''}
                              ${order.status === 'SHIPPING' ? 'bg-indigo-100 text-indigo-800' : ''}
                              ${order.status === 'DONE' ? 'bg-gray-100 text-gray-800' : ''}
                            `}>
                              {statusLabels[order.status] || order.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('ko-KR')}
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
