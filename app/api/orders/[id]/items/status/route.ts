/**
 * Order Items Status API
 *
 * PATCH /api/orders/[id]/items/status - 주문 아이템 상태 일괄 변경 (관리자)
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { isAdmin } from '@/lib/server/utils/supabase';
import type { Enums } from '@/types/database';

/**
 * 주문 아이템 상태 일괄 변경 (관리자)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'), 403);
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { itemIds, status } = body as {
      itemIds: string[];
      status: Enums<'order_item_status'>;
    };

    if (!itemIds || itemIds.length === 0) {
      return handleApiError(new Error('변경할 아이템을 선택해주세요'), 400);
    }

    if (!status) {
      return handleApiError(new Error('변경할 상태를 선택해주세요'), 400);
    }

    // 각 아이템 상태 변경
    const results = [];
    for (const itemId of itemIds) {
      const updatedItem = await OrderService.updateItemStatus(itemId, status);
      results.push(updatedItem);
    }

    return successResponse({ updatedItems: results });
  } catch (error) {
    return handleApiError(error);
  }
}
