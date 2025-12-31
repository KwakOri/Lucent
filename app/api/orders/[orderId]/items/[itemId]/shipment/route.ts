/**
 * 배송 추적 정보 조회 API
 *
 * GET /api/orders/:orderId/items/:itemId/shipment
 *
 * 고객이 자신의 주문 상품에 대한 배송 추적 정보를 조회합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { createServerClient } from '@/lib/server/utils/supabase';
import { handleApiError } from '@/lib/server/utils/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    // params await (Next.js 15)
    const { orderId, itemId } = await params;

    // 인증 확인
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 배송 추적 정보 조회
    const tracking = await OrderService.getShipmentTracking(
      itemId,
      user.id
    );

    if (!tracking) {
      return NextResponse.json({
        status: 'success',
        data: null,
        message: '배송 정보가 없습니다',
      });
    }

    return NextResponse.json({
      status: 'success',
      data: tracking,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
