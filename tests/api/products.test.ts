/**
 * Products API Tests
 *
 * 상품 API 엔드포인트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as productsGET, POST as productsPOST } from '@/app/api/products/route';
import { GET as productGET, PATCH as productPATCH, DELETE as productDELETE } from '@/app/api/products/[id]/route';
import { ProductService } from '@/lib/server/services/product.service';
import { isAdmin } from '@/lib/server/utils/supabase';
import { createMockRequest, parseResponse } from '../utils';
import { mockDigitalProduct, mockPhysicalProduct } from '../utils/fixtures';

// Mock ProductService and isAdmin
vi.mock('@/lib/server/services/product.service', () => ({
  ProductService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

vi.mock('@/lib/server/utils/supabase', () => ({
  isAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
  createServerClient: vi.fn(),
}));

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('상품 목록 조회 성공', async () => {
      vi.mocked(ProductService.getProducts).mockResolvedValue({
        products: [mockDigitalProduct, mockPhysicalProduct],
        total: 2,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products',
        searchParams: {
          page: '1',
          limit: '20',
        },
      });

      const response = await productsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('아티스트별 상품 필터링', async () => {
      vi.mocked(ProductService.getProducts).mockResolvedValue({
        products: [mockDigitalProduct],
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products',
        searchParams: {
          artistId: 'miruru',
        },
      });

      const response = await productsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(ProductService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          artistId: 'miruru',
        })
      );
    });

    it('상품 타입별 필터링', async () => {
      vi.mocked(ProductService.getProducts).mockResolvedValue({
        products: [mockDigitalProduct],
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products',
        searchParams: {
          type: 'digital',
        },
      });

      const response = await productsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(ProductService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'digital',
        })
      );
    });

    it('페이지네이션 파라미터 처리', async () => {
      vi.mocked(ProductService.getProducts).mockResolvedValue({
        products: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products',
        searchParams: {
          page: '2',
          limit: '10',
        },
      });

      const response = await productsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(ProductService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      );
    });
  });

  describe('POST /api/products', () => {
    it('관리자 권한으로 상품 생성 성공', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(ProductService.createProduct).mockResolvedValue(mockDigitalProduct);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/products',
        body: {
          type: 'digital',
          name: 'Test Voice Pack',
          description: 'Test description',
          price: 5000,
          artist_id: 'miruru',
          category: 'voice_pack',
        },
      });

      const response = await productsPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.status).toBe('success');
      expect(data.data.id).toBe(mockDigitalProduct.id);
    });

    it('관리자 권한 없이 상품 생성 시 403 에러', async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/products',
        body: {
          type: 'digital',
          name: 'Test Voice Pack',
        },
      });

      const response = await productsPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('관리자');
    });
  });

  describe('GET /api/products/[id]', () => {
    it('상품 상세 조회 성공', async () => {
      vi.mocked(ProductService.getProduct).mockResolvedValue(mockDigitalProduct);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products/product-digital-123',
      });

      const response = await productGET(request, { params: { id: 'product-digital-123' } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data.id).toBe('product-digital-123');
    });

    it('존재하지 않는 상품 조회 시 404 에러', async () => {
      vi.mocked(ProductService.getProduct).mockRejectedValue(
        new Error('상품을 찾을 수 없습니다')
      );

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products/nonexistent',
      });

      const response = await productGET(request, { params: { id: 'nonexistent' } });
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });
  });

  describe('PATCH /api/products/[id]', () => {
    it('관리자 권한으로 상품 수정 성공', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(ProductService.updateProduct).mockResolvedValue({
        ...mockDigitalProduct,
        name: 'Updated Voice Pack',
      });

      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/products/product-digital-123',
        body: {
          name: 'Updated Voice Pack',
        },
      });

      const response = await productPATCH(request, { params: { id: 'product-digital-123' } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data.name).toBe('Updated Voice Pack');
    });

    it('관리자 권한 없이 상품 수정 시 403 에러', async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);

      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/products/product-digital-123',
        body: {
          name: 'Updated Voice Pack',
        },
      });

      const response = await productPATCH(request, { params: { id: 'product-digital-123' } });
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });
  });

  describe('DELETE /api/products/[id]', () => {
    it('관리자 권한으로 상품 삭제 성공', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(ProductService.deleteProduct).mockResolvedValue(undefined);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/products/product-digital-123',
      });

      const response = await productDELETE(request, { params: { id: 'product-digital-123' } });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
    });

    it('관리자 권한 없이 상품 삭제 시 403 에러', async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/products/product-digital-123',
      });

      const response = await productDELETE(request, { params: { id: 'product-digital-123' } });
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });
  });
});
