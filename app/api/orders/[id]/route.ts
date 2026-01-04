/**
 * Order Detail API Routes
 *
 * GET /api/orders/:id - 주문 상세 조회
 * PATCH /api/orders/:id - 주문 상태 변경 (관리자)
 * DELETE /api/orders/:id - 주문 취소 (고객, PENDING 상태만)
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import type { UpdateOrderStatusRequest } from '@/types/api';

/**
 * 주문 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    const { id } = await params;

    const order = await OrderService.getOrderById(
      id,
      adminCheck ? undefined : user.id // 관리자가 아니면 본인 확인
    );

    return successResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 주문 상태 변경 (관리자)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const body = await request.json() as UpdateOrderStatusRequest;
    const { status } = body;

    if (!status) {
      return handleApiError(new Error('변경할 상태를 지정해주세요'));
    }

    const { id } = await params;
    const order = await OrderService.updateOrderStatus(
      id,
      status,
      user.id
    );

    return successResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 주문 취소 (고객)
 *
 * - 입금대기(PENDING) 상태일 때만 취소 가능
 * - 본인 주문만 취소 가능
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const { id } = await params;
    const result = await OrderService.cancelOrder(id, user.id);

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
