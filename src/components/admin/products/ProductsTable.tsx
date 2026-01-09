'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  slug: string;
  type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
  price: number;
  stock: number | null;
  is_active: boolean;
  created_at: string;
  main_image: {
    id: string;
    public_url: string;
    cdn_url: string | null;
  } | null;
  project: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface ProductsTableProps {
  products: Product[];
  projects: Project[];
}

const typeLabels: Record<string, string> = {
  VOICE_PACK: '보이스팩',
  PHYSICAL_GOODS: '실물 굿즈',
  BUNDLE: '세트 상품', // TODO: 추후 실물 상품 출시 시 활성화
};

export function ProductsTable({ products: initialProducts, projects }: ProductsTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleDelete = async (product: Product) => {
    if (!confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(product.id);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제 실패');
      }

      setProducts(products.filter((p) => p.id !== product.id));
      router.refresh();
    } catch (error) {
      alert('상품 삭제에 실패했습니다.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    if (typeFilter !== 'all' && product.type !== typeFilter) return false;
    if (projectFilter !== 'all' && product.project?.id !== projectFilter) return false;
    if (statusFilter === 'active' && !product.is_active) return false;
    if (statusFilter === 'inactive' && product.is_active) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 타입</option>
          <option value="VOICE_PACK">보이스팩</option>
          <option value="PHYSICAL_GOODS">실물 굿즈</option>
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 프로젝트</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      {/* Mobile: Card List */}
      <div className="md:hidden space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">등록된 상품이 없습니다</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              {/* 첫 줄: 이미지 + 상품명 + 상태 */}
              <div className="flex items-start gap-3 mb-3">
                <div className="h-16 w-20 flex-shrink-0">
                  {product.main_image ? (
                    <img
                      src={product.main_image.cdn_url || product.main_image.public_url}
                      alt={product.name}
                      className="h-16 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="h-16 w-20 rounded bg-gray-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {typeLabels[product.type]} · {product.project?.name || '-'}
                  </p>
                  <span
                    className={`inline-flex mt-2 rounded-full px-2 py-1 text-xs font-semibold ${
                      product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {product.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              </div>

              {/* 둘째 줄: 가격, 재고 */}
              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-gray-500">가격</span>
                    <p className="font-medium text-gray-900">{product.price.toLocaleString()}원</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">재고</span>
                    <p className="font-medium text-gray-900">
                      {product.stock !== null ? product.stock : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 셋째 줄: 수정/삭제 버튼 */}
              <div className="flex items-center justify-end gap-3">
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                >
                  수정
                </Link>
                <button
                  onClick={() => handleDelete(product)}
                  disabled={deletingId === product.id}
                  className="text-sm font-medium text-red-600 hover:text-red-900 disabled:opacity-50"
                >
                  {deletingId === product.id ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      이미지
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      상품명
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      타입
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      프로젝트
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      가격
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      재고
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      상태
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">작업</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                        등록된 상품이 없습니다
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div className="h-10 w-16 flex-shrink-0">
                            {product.main_image ? (
                              <img
                                src={product.main_image.cdn_url || product.main_image.public_url}
                                alt={product.name}
                                className="h-10 w-16 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-16 rounded bg-gray-200" />
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {typeLabels[product.type]}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {product.project?.name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {product.price.toLocaleString()}원
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {product.stock !== null ? product.stock : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              product.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            수정
                          </Link>
                          <button
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deletingId === product.id ? '삭제 중...' : '삭제'}
                          </button>
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
  );
}
