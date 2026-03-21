/**
 * Products API Tests
 *
 * products 라우트는 backend 프록시 동작을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as productsGET, POST as productsPOST } from '@/app/api/products/route';
import {
  DELETE as productDELETE,
  GET as productGET,
  PATCH as productPATCH,
} from '@/app/api/products/[id]/route';
import { createMockRequest, parseResponse } from '../utils';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_API_URL = 'http://backend.test';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GET /api/products', () => {
    it('상품 목록 조회 요청을 backend로 프록시한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: [{ id: 'product-1', name: '상품1' }],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      );

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products',
        searchParams: {
          page: '1',
          limit: '20',
          type: 'VOICE_PACK',
        },
      });

      const response = await productsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(fetch).toHaveBeenCalledWith(
        'http://backend.test/api/products?page=1&limit=20&type=VOICE_PACK',
        expect.objectContaining({
          method: 'GET',
          cache: 'no-store',
        }),
      );
    });
  });

  describe('POST /api/products', () => {
    it('상품 생성 성공 시 201로 응답한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse(
          {
            status: 'success',
            data: { id: 'product-created' },
          },
          200,
        ),
      );

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/products',
        body: {
          name: 'Test Product',
          slug: 'test-product',
          type: 'VOICE_PACK',
          project_id: 'project-1',
          price: 10000,
        },
      });

      const response = await productsPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.status).toBe('success');
      expect(fetch).toHaveBeenCalledWith(
        'http://backend.test/api/products',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('관리자 권한 오류를 backend 응답 그대로 전달한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse(
          {
            status: 'error',
            message: '관리자 권한이 필요합니다',
            errorCode: 'ADMIN_REQUIRED',
          },
          403,
        ),
      );

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/products',
        body: { name: 'NoAdmin' },
      });

      const response = await productsPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(403);
      expect(data.status).toBe('error');
      expect(data.message).toContain('관리자');
    });
  });

  describe('GET /api/products/[id]', () => {
    it('상품 상세 조회 요청을 backend로 프록시한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { id: 'product-digital-123' },
        }),
      );

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/products/product-digital-123',
      });

      const response = await productGET(request, {
        params: Promise.resolve({ id: 'product-digital-123' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(fetch).toHaveBeenCalledWith(
        'http://backend.test/api/products/product-digital-123',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('PATCH /api/products/[id]', () => {
    it('상품 수정 요청을 backend로 프록시한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { id: 'product-digital-123', name: 'Updated' },
        }),
      );

      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/products/product-digital-123',
        body: { name: 'Updated' },
      });

      const response = await productPATCH(request, {
        params: Promise.resolve({ id: 'product-digital-123' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(fetch).toHaveBeenCalledWith(
        'http://backend.test/api/products/product-digital-123',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  describe('DELETE /api/products/[id]', () => {
    it('상품 삭제 요청을 backend로 프록시한다', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { message: '상품이 삭제되었습니다' },
        }),
      );

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/products/product-digital-123',
      });

      const response = await productDELETE(request, {
        params: Promise.resolve({ id: 'product-digital-123' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(fetch).toHaveBeenCalledWith(
        'http://backend.test/api/products/product-digital-123',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
