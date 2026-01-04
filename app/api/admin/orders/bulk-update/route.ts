/**
 * Bulk Update Orders API
 *
 * 관리자 전용: 여러 주문의 상태를 일괄 변경
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { createServerClient } from '@/lib/server/utils/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 관리자 권한 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증되지 않았습니다' }, { status: 401 });
    }

    // TODO: 관리자 권한 체크 (실제 구현 시 추가)
    // const isAdmin = await checkAdminRole(user.id);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    // }

    const body = await request.json();
    const { orderIds, status } = body;

    // 입력 검증
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: '주문 ID 배열이 필요합니다' }, { status: 400 });
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: '상태값이 필요합니다' }, { status: 400 });
    }

    const validStatuses = ['PENDING', 'PAID', 'MAKING', 'SHIPPING', 'DONE'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태값입니다' }, { status: 400 });
    }

    // 일괄 업데이트 실행
    const { data, error } = await supabase
      .from('orders')
      .update({ status: status as 'PENDING' | 'PAID' | 'MAKING' | 'SHIPPING' | 'DONE', updated_at: new Date().toISOString() })
      .in('id', orderIds)
      .select();

    if (error) {
      console.error('Bulk update error:', error);
      return NextResponse.json({ error: '일괄 업데이트에 실패했습니다' }, { status: 500 });
    }

    return successResponse({
      message: `${data.length}개 주문의 상태가 변경되었습니다`,
      updatedCount: data.length,
      updatedOrders: data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
