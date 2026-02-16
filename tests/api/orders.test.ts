/**
 * Orders API Tests
 *
 * 주문 API 엔드포인트 테스트
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as ordersGET, POST as ordersPOST } from '@/app/api/orders/route';
import { GET as orderGET, PATCH as orderPATCH } from '@/app/api/orders/[id]/route';
import { OrderService } from '@/lib/server/services/order.service';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import { createMockRequest, parseResponse } from '../utils';
import { mockAdminUser, mockOrder, mockUser } from '../utils/fixtures';

vi.mock('@/lib/server/services/order.service', () => ({
  OrderService: {
    getUserOrders: vi.fn(),
    getAllOrders: vi.fn(),
    createOrder: vi.fn(),
    getOrderById: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

vi.mock('@/lib/server/utils/supabase', () => ({
  getCurrentUser: vi.fn(),
  isAdmin: vi.fn(),
}));

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    it('로그인한 사용자의 주문 목록 조회 성공', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(OrderService.getUserOrders).mockResolvedValue({
        orders: [mockOrder as never],
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders',
        searchParams: {
          page: '1',
          limit: '20',
        },
      });

      const response = await ordersGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data).toHaveLength(1);
      expect(OrderService.getUserOrders).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });

    it('관리자의 전체 주문 목록 조회 성공', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as never);
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(OrderService.getAllOrders).mockResolvedValue({
        orders: [mockOrder as never],
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders',
        searchParams: {
          page: '1',
          limit: '20',
        },
      });

      const response = await ordersGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(OrderService.getAllOrders).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });

    it('로그인하지 않은 사용자의 요청 시 에러', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders',
      });

      const response = await ordersGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('로그인');
    });

    it('관리자의 상태별 필터링', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as never);
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(OrderService.getAllOrders).mockResolvedValue({
        orders: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders',
        searchParams: {
          status: 'PENDING',
        },
      });

      const response = await ordersGET(request);

      expect(response.status).toBe(200);
      expect(OrderService.getAllOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' }),
      );
    });
  });

  describe('POST /api/orders', () => {
    it('주문 생성 성공', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(OrderService.createOrder).mockResolvedValue(mockOrder as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/orders',
        body: {
          items: [{ productId: 'product-123', quantity: 1 }],
          shippingName: 'Test User',
          shippingPhone: '010-1234-5678',
          shippingMainAddress: 'Test Main Address',
          shippingDetailAddress: 'Test Detail Address',
        },
      });

      const response = await ordersPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.status).toBe('success');
      expect(data.data.id).toBe(mockOrder.id);
    });

    it('로그인하지 않은 사용자의 주문 생성 시 에러', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/orders',
        body: {
          items: [{ productId: 'product-123', quantity: 1 }],
        },
      });

      const response = await ordersPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });

    it('주문 상품이 없을 때 에러', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/orders',
        body: {
          items: [],
        },
      });

      const response = await ordersPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('주문 상품');
    });

    it('배송지 정보와 함께 주문 생성', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(OrderService.createOrder).mockResolvedValue(mockOrder as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/orders',
        body: {
          items: [{ productId: 'product-123', quantity: 2 }],
          shippingName: 'Test User',
          shippingPhone: '010-1234-5678',
          shippingMainAddress: 'Test Main Address 123',
          shippingDetailAddress: 'Test Detail Address 123',
          shippingMemo: 'Please leave at door',
        },
      });

      const response = await ordersPOST(request);

      expect(response.status).toBe(201);
      expect(OrderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          shippingName: 'Test User',
          shippingPhone: '010-1234-5678',
          shippingMainAddress: 'Test Main Address 123',
          shippingDetailAddress: 'Test Detail Address 123',
          shippingMemo: 'Please leave at door',
        }),
        undefined,
      );
    });
  });

  describe('GET /api/orders/[id]', () => {
    it('본인 주문 상세 조회 성공', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(OrderService.getOrderById).mockResolvedValue(mockOrder as never);

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
      expect(data.data.id).toBe('order-123');
      expect(OrderService.getOrderById).toHaveBeenCalledWith('order-123', mockUser.id);
    });

    it('로그인하지 않은 사용자의 주문 조회 시 에러', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders/order-123',
      });

      const response = await orderGET(request, {
        params: Promise.resolve({ id: 'order-123' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });
  });

  describe('PATCH /api/orders/[id]', () => {
    it('관리자가 주문 상태 변경 성공', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as never);
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(OrderService.updateOrderStatus).mockResolvedValue({
        order: {
          ...mockOrder,
          status: 'PAID',
        },
        emailSent: true,
        sentTo: 'user@example.com',
      } as never);

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
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data.order.status).toBe('PAID');
      expect(OrderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-123',
        'PAID',
        mockAdminUser.id,
      );
    });

    it('관리자 권한 없이 주문 상태 변경 시 에러', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(isAdmin).mockResolvedValue(false);

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
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });

    it('상태 정보 없이 요청 시 에러', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as never);
      vi.mocked(isAdmin).mockResolvedValue(true);

      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/orders/order-123',
        body: {},
      });

      const response = await orderPATCH(request, {
        params: Promise.resolve({ id: 'order-123' }),
      });
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('상태');
    });
  });
});
