/**
 * Order Status Update API
 *
 * 주문 상태 변경 API (관리자 전용)
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { AuthService } from '@/lib/server/services/auth.service';
import {
  handleApiError,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/server/utils/api-response';
import type { Enums } from '@/types';

/**
 * PATCH /api/orders/:id/status
 * 주문 상태 변경 (관리자만)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 인증 확인
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return unauthorizedResponse('로그인이 필요합니다');
    }

    // 2. 관리자 권한 확인
    const isAdmin = await AuthService.isAdmin(user.id);
    if (!isAdmin) {
      return forbiddenResponse('관리자만 접근 가능합니다');
    }

    // 3. 파라미터 파싱
    const { id: orderId } = await params;
    const body = await request.json();
    const { status } = body;

    // 4. 유효성 검증
    if (!status) {
      return badRequestResponse('상태값이 필요합니다');
    }

    const validStatuses: Enums<'order_status'>[] = [
      'PENDING',
      'PAID',
      'MAKING',
      'SHIPPING',
      'DONE',
    ];

    if (!validStatuses.includes(status)) {
      return badRequestResponse(
        `유효하지 않은 상태값입니다. 가능한 값: ${validStatuses.join(', ')}`
      );
    }

    // 5. 주문 상태 변경
    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      status,
      user.id
    );

    return successResponse(updatedOrder);
  } catch (error) {
    return handleApiError(error);
  }
}
