'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageUpload } from '@/src/components/admin/ImageUpload';

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
  project_id: string | null;
  main_image_id: string | null;
  main_image?: {
    id: string;
    public_url: string;
    cdn_url: string | null;
    alt_text?: string | null;
  } | null;
  price: number;
  description?: string | null;
  stock?: number | null;
  sample_audio_url?: string | null;
  digital_file_url?: string | null;
  has_custom_sample?: boolean | null;
  is_active: boolean;
}

interface ProductFormProps {
  projects: Project[];
  product?: Product;
}

export function ProductForm({ projects, product }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    type: product?.type || 'VOICE_PACK' as 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE',
    project_id: product?.project_id || projects[0]?.id || '',
    main_image_id: product?.main_image_id || '',
    price: product?.price || 0,
    description: product?.description || '',
    stock: product?.stock ?? null,
    digital_file_url: product?.digital_file_url || '', // Google Drive 링크
    is_active: product?.is_active ?? true,
  });

  // 가격 표시용 포맷된 문자열
  const [priceDisplay, setPriceDisplay] = useState(
    product?.price !== undefined ? product.price.toLocaleString('ko-KR') : ''
  );

  // 가격 입력 핸들러
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // 숫자와 쉼표만 허용
    const numbersOnly = input.replace(/[^\d]/g, '');

    // 빈 값 처리 (0원으로 설정)
    if (numbersOnly === '') {
      setPriceDisplay('0');
      setFormData({ ...formData, price: 0 });
      return;
    }

    // 숫자로 변환
    const numericValue = parseInt(numbersOnly, 10);

    // 포맷된 값으로 표시
    setPriceDisplay(numericValue.toLocaleString('ko-KR'));

    // 실제 숫자값 저장
    setFormData({ ...formData, price: numericValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    console.log('[ProductForm] 폼 제출 시작', {
      type: formData.type,
      isEdit: !!product,
    });

    try {
      const url = product
        ? `/api/products/${product.id}`
        : '/api/products';

      const method = product ? 'PATCH' : 'POST';

      // 보이스팩 타입인 경우 Google Drive 링크 필수 확인
      if (formData.type === 'VOICE_PACK' && !product && !formData.digital_file_url) {
        throw new Error('Google Drive 다운로드 링크는 필수입니다');
      }

      console.log('[ProductForm] API 요청 전송:', url, method, formData);

      // 모든 상품: JSON으로 전송
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          sample_audio_url: '', // 빈 문자열로 설정
        }),
      });

      console.log('[ProductForm] API 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json();
        console.error('[ProductForm] API 에러:', {
          status: response.status,
          statusText: response.statusText,
          error,
        });
        throw new Error(error.message || '저장에 실패했습니다');
      }

      const result = await response.json();
      console.log('[ProductForm] 상품 생성 성공:', result);

      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      console.error('[ProductForm] 제출 실패:', error);
      alert(error instanceof Error ? error.message : '저장에 실패했습니다');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="space-y-6 bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
        {/* 상품 타입 */}
        <div>
          <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
            상품 타입 <span className="text-red-500">*</span>
            {product && <span className="ml-2 text-sm text-gray-500">(변경 불가)</span>}
          </label>
          <div className="space-y-2">
            <label className="inline-flex items-center mr-6">
              <input
                type="radio"
                value="VOICE_PACK"
                checked={formData.type === 'VOICE_PACK'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'VOICE_PACK' })}
                disabled={!!product}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">보이스팩</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="PHYSICAL_GOODS"
                checked={formData.type === 'PHYSICAL_GOODS'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PHYSICAL_GOODS' })}
                disabled={!!product}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">실물 굿즈</span>
            </label>
          </div>
        </div>

        {/* 프로젝트 */}
        <div>
          <label htmlFor="project_id" className="block text-sm font-medium leading-6 text-gray-900">
            소속 프로젝트 <span className="text-red-500">*</span>
          </label>
          <select
            id="project_id"
            required
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="mt-2 block w-full rounded-md bg-white border-2 border-gray-400 py-2 pl-3 pr-10 text-gray-900 font-medium focus:border-primary-600 focus:ring-2 focus:ring-primary-500 sm:text-sm"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* 상품명 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            placeholder="미루루 보이스팩 Vol.1"
          />
        </div>

        {/* 슬러그 */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium leading-6 text-gray-900">
            슬러그 (URL) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="slug"
            required
            pattern="[a-z0-9-]+"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            placeholder="voicepack-vol1"
          />
        </div>

        {/* 메인 이미지 */}
        <div>
          <ImageUpload
            imageType="product_main"
            label="메인 이미지"
            currentImageUrl={
              product?.main_image?.cdn_url ||
              product?.main_image?.public_url
            }
            altText={formData.name}
            onUploadSuccess={(imageId, publicUrl) => {
              setFormData({ ...formData, main_image_id: imageId });
            }}
          />
        </div>

        {/* 가격 */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium leading-6 text-gray-900">
            가격 (원) <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-2">
            <input
              type="text"
              id="price"
              required
              value={priceDisplay}
              onChange={handlePriceChange}
              className="block w-full rounded-md border-0 py-1.5 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
              placeholder="10,000"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 sm:text-sm">원</span>
            </div>
          </div>
          {formData.price >= 0 && (
            <p className="mt-1 text-xs text-gray-500">
              숫자: {formData.price.toLocaleString('ko-KR')}원
            </p>
          )}
        </div>

        {/* 재고 (실물 굿즈만) */}
        {formData.type === 'PHYSICAL_GOODS' && (
          <div>
            <label htmlFor="stock" className="block text-sm font-medium leading-6 text-gray-900">
              재고 (선택)
            </label>
            <input
              type="number"
              id="stock"
              min="0"
              value={formData.stock ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                stock: e.target.value ? parseInt(e.target.value) : null
              })}
              className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
              placeholder="비워두면 무제한"
            />
          </div>
        )}

        {/* Google Drive 다운로드 링크 (보이스팩만) */}
        {formData.type === 'VOICE_PACK' && (
          <div>
            <label htmlFor="digital_file_url" className="block text-sm font-medium leading-6 text-gray-900">
              Google Drive 다운로드 링크 <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              구매 후 사용자에게 제공될 Google Drive 공유 링크를 입력하세요
            </p>
            <input
              type="url"
              id="digital_file_url"
              required={formData.type === 'VOICE_PACK'}
              value={formData.digital_file_url}
              onChange={(e) => setFormData({ ...formData, digital_file_url: e.target.value })}
              className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
              placeholder="https://drive.google.com/file/d/..."
            />
            {formData.digital_file_url && (
              <p className="text-xs text-gray-600 mt-1">
                ✓ 링크가 입력되었습니다
              </p>
            )}
          </div>
        )}

        {/* 설명 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">
            설명 (선택)
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            placeholder="상품 설명..."
          />
        </div>

        {/* 활성 상태 */}
        <div className="relative flex items-start">
          <div className="flex h-6 items-center">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor="is_active" className="font-medium text-gray-900">
              활성화
            </label>
            <p className="text-gray-500">상품을 공개 페이지에 표시합니다</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-x-3 mt-6">
        <Link
          href="/admin/products"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
