/**
 * GET /api/orders/:orderId/items/:itemId/download
 *
 * 디지털 상품 다운로드 링크 생성
 * - 구매한 디지털 상품 다운로드
 * - 인증 필요
 * - 주문 상태 확인 (PAID 이상)
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { getCurrentUser } from '@/lib/server/utils/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/server/utils/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params;

    // 1. 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('로그인이 필요합니다', 401, 'UNAUTHENTICATED');
    }

    // 2. 다운로드 링크 생성
    const downloadInfo = await OrderService.generateDownloadLink(orderId, itemId, user.id);

    return successResponse(downloadInfo);
  } catch (error) {
    return handleApiError(error);
  }
}
