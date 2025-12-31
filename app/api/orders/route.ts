/**
 * Orders API Routes
 *
 * GET /api/orders - 주문 목록 조회 (본인 or 관리자)
 * POST /api/orders - 주문 생성
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { handleApiError, paginatedResponse, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import { getClientIp } from '@/lib/server/utils/request';
import type { CreateOrderRequest, GetOrdersQuery } from '@/types/api';
import type { Enums } from '@/types/database';

/**
 * 주문 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const adminCheck = await isAdmin();

    let result;
    if (adminCheck) {
      // 관리자: 모든 주문 조회
      const status = searchParams.get('status') as Enums<'order_status'> | undefined;
      const dateFrom = searchParams.get('dateFrom') || undefined;
      const dateTo = searchParams.get('dateTo') || undefined;

      result = await OrderService.getAllOrders({
        page,
        limit,
        status,
        dateFrom,
        dateTo,
      });
    } else {
      // 일반 사용자: 본인 주문만 조회
      result = await OrderService.getUserOrders(user.id, { page, limit });
    }

    return paginatedResponse(result.orders, {
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 주문 생성
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const body = await request.json() as CreateOrderRequest;
    const {
      items,
      buyerName,
      buyerEmail,
      buyerPhone,
      shippingName,
      shippingPhone,
      shippingMainAddress,
      shippingDetailAddress,
      shippingMemo
    } = body;

    if (!items || items.length === 0) {
      return handleApiError(new Error('주문 상품이 없습니다'));
    }

    const order = await OrderService.createOrder(
      {
        userId: user.id,
        items,
        buyerName,
        buyerEmail,
        buyerPhone,
        shippingName,
        shippingPhone,
        shippingMainAddress,
        shippingDetailAddress,
        shippingMemo,
      },
      getClientIp(request)
    );

    return successResponse(order, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
