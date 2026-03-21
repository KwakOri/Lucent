/**
 * Orders API Tests
 *
 * orders 라우트는 backend 프록시 동작을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as ordersGET, POST as ordersPOST } from '@/app/api/orders/route';
import {
  DELETE as orderDELETE,
  GET as orderGET,
  PATCH as orderPATCH,
} from '@/app/api/orders/[id]/route';
import { PATCH as orderStatusPATCH } from '@/app/api/orders/[id]/status/route';
import { PATCH as orderItemsStatusPATCH } from '@/app/api/orders/[id]/items/status/route';
import { GET as orderItemDownloadGET } from '@/app/api/orders/[id]/items/[itemId]/download/route';
import { GET as orderItemShipmentGET } from '@/app/api/orders/[id]/items/[itemId]/shipment/route';
import { createMockRequest, parseResponse } from '../utils';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_API_URL = 'http://backend.test';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /api/orders 요청을 검색 파라미터와 함께 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: [{ id: 'order-1' }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/orders',
      searchParams: {
        page: '1',
        limit: '20',
        status: 'PENDING',
      },
    });

    const response = await ordersGET(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders?page=1&limit=20&status=PENDING',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POST /api/orders 성공 응답을 201로 유지한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          status: 'success',
          data: { id: 'order-123' },
        },
        200,
      ),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/orders',
      body: {
        items: [{ productId: 'product-123', quantity: 1 }],
      },
    });

    const response = await ordersPOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(201);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('GET /api/orders/[id] 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: { id: 'order-123' },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/orders/order-123',
    });

    const response = await orderGET(request, {
      params: Promise.resolve({ id: 'order-123' }),
    });
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders/order-123',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('PATCH /api/orders/[id] 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: { order: { id: 'order-123', status: 'PAID' } },
      }),
    );

    const request = createMockRequest({
      method: 'PATCH',
      url: 'http://localhost:3000/api/orders/order-123',
      body: {
        status: 'PAID',
      },
    });

    const response = await orderPATCH(request, {
      params: Promise.resolve({ id: 'order-123' }),
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders/order-123',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('DELETE /api/orders/[id] 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: { success: true },
      }),
    );

    const request = createMockRequest({
      method: 'DELETE',
      url: 'http://localhost:3000/api/orders/order-123',
    });

    const response = await orderDELETE(request, {
      params: Promise.resolve({ id: 'order-123' }),
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders/order-123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('PATCH /api/orders/[id]/status 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 'success', data: {} }));

    const request = createMockRequest({
      method: 'PATCH',
      url: 'http://localhost:3000/api/orders/order-123/status',
      body: {
        status: 'DONE',
      },
    });

    const response = await orderStatusPATCH(request, {
      params: Promise.resolve({ id: 'order-123' }),
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders/order-123/status',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('PATCH /api/orders/[id]/items/status 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 'success', data: {} }));

    const request = createMockRequest({
      method: 'PATCH',
      url: 'http://localhost:3000/api/orders/order-123/items/status',
      body: {
        itemIds: ['item-1', 'item-2'],
        status: 'COMPLETED',
      },
    });

    const response = await orderItemsStatusPATCH(request, {
      params: Promise.resolve({ id: 'order-123' }),
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders/order-123/items/status',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('GET /api/orders/[id]/items/[itemId]/download 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          downloadUrl: 'https://example.com/file.zip',
        },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/orders/order-123/items/item-1/download',
    });

    const response = await orderItemDownloadGET(request, {
      params: Promise.resolve({ id: 'order-123', itemId: 'item-1' }),
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders/order-123/items/item-1/download',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('GET /api/orders/[id]/items/[itemId]/shipment 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          carrier: 'CJ',
          trackingNumber: '1234567890',
        },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/orders/order-123/items/item-1/shipment',
    });

    const response = await orderItemShipmentGET(request, {
      params: Promise.resolve({ id: 'order-123', itemId: 'item-1' }),
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/orders/order-123/items/item-1/shipment',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('backend 에러 응답을 그대로 전달한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          status: 'error',
          message: '관리자 권한이 필요합니다',
          errorCode: 'UNAUTHORIZED',
        },
        403,
      ),
    );

    const request = createMockRequest({
      method: 'PATCH',
      url: 'http://localhost:3000/api/orders/order-123/status',
      body: {
        status: 'DONE',
      },
    });

    const response = await orderStatusPATCH(request, {
      params: Promise.resolve({ id: 'order-123' }),
    });
    const data = await parseResponse(response);

    expect(response.status).toBe(403);
    expect(data.status).toBe('error');
  });
});
