/**
 * 주문 API에 로깅 적용 예시
 *
 * 이 파일은 실제 주문 API를 구현할 때 참고하는 예시 코드입니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { LogService } from '@/lib/server/services/log.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser } from '@/lib/server/utils/supabase';

interface ExampleOrderItem {
  name: string;
  type: string;
}

// ===== 주문 생성 API 예시 =====

export async function createOrderExample(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { items, shippingAddress, totalAmount } = (await request.json()) as {
      items: ExampleOrderItem[];
      shippingAddress: unknown;
      totalAmount: number;
    };

    // TODO: 주문 생성 로직
    // const order = await OrderService.createOrder({ userId: user.id, items, shippingAddress });

    const orderId = 'created-order-id'; // 실제로는 DB에서 생성된 order.id
    const productNames = items.map((item) => item.name).join(', ');

    // 주문 생성 로그 기록
    await LogService.logOrderCreated(orderId, user.id, totalAmount, {
      productNames,
      itemCount: items.length,
      hasPhysicalGoods: items.some((item) => item.type === 'PHYSICAL_GOODS'),
    });

    return successResponse({ orderId, status: 'PENDING' });
  } catch (error) {
    return handleApiError(error);
  }
}

// ===== 주문 상태 변경 API 예시 (관리자) =====

export async function updateOrderStatusExample(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin) {
      // 관리자 권한 체크 로직 필요
      return NextResponse.json(
        { status: 'error', message: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const { newStatus } = await request.json();

    // TODO: 주문 정보 조회 및 상태 변경
    // const order = await OrderService.getOrderById(params.orderId);
    // const updatedOrder = await OrderService.updateStatus(params.orderId, newStatus);

    const order = {
      id: params.orderId,
      user_id: 'order-user-id',
      status: 'PENDING', // 기존 상태
    };

    // 주문 상태 변경 로그 기록
    await LogService.logOrderStatusChanged(
      params.orderId,
      order.user_id,
      admin.id,
      order.status, // 기존 상태
      newStatus // 새 상태
    );

    return successResponse({ orderId: params.orderId, status: newStatus });
  } catch (error) {
    return handleApiError(error);
  }
}

// ===== 주문 취소 API 예시 =====

export async function cancelOrderExample(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { reason } = await request.json();

    // TODO: 주문 취소 로직
    // await OrderService.cancelOrder(params.orderId, user.id);

    // 주문 취소 로그 기록
    await LogService.logOrderCancelled(params.orderId, user.id, reason);

    return successResponse({ message: '주문이 취소되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}

// ===== 환불 요청 API 예시 =====

export async function requestRefundExample(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { reason } = await request.json();

    // TODO: 환불 요청 로직
    // await OrderService.requestRefund(params.orderId, user.id, reason);

    // 환불 요청 로그 기록
    await LogService.logRefundRequested(params.orderId, user.id, reason);

    return successResponse({ message: '환불이 요청되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}

// ===== 환불 승인 API 예시 (관리자) =====

export async function approveRefundExample(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin) {
      return NextResponse.json(
        { status: 'error', message: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // TODO: 환불 승인 로직
    // const order = await OrderService.getOrderById(params.orderId);
    // await OrderService.approveRefund(params.orderId);

    const order = {
      user_id: 'order-user-id',
    };

    // 환불 승인 로그 기록
    await LogService.logRefundApproved(params.orderId, order.user_id, admin.id);

    return successResponse({ message: '환불이 승인되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}

// ===== 환불 완료 API 예시 (관리자) =====

export async function completeRefundExample(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin) {
      return NextResponse.json(
        { status: 'error', message: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const { amount } = await request.json();

    // TODO: 환불 완료 로직
    // const order = await OrderService.getOrderById(params.orderId);
    // await OrderService.completeRefund(params.orderId);

    const order = {
      user_id: 'order-user-id',
    };

    // 환불 완료 로그 기록
    await LogService.logRefundCompleted(params.orderId, order.user_id, admin.id, amount);

    return successResponse({ message: '환불이 완료되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
