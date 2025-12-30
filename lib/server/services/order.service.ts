/**
 * Order Service
 *
 * 주문 관련 비즈니스 로직
 * - 주문 생성
 * - 주문 조회 (본인/관리자)
 * - 주문 상태 변경 (관리자)
 * - 디지털 상품 다운로드
 *
 * 중요: 모든 주문 이벤트는 LogService로 기록됩니다.
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError, NotFoundError, AuthorizationError } from '@/lib/server/utils/errors';
import { LogService } from './log.service';
import { Tables, TablesInsert, Enums } from '@/types/database';

type Order = Tables<'orders'>;
type OrderInsert = TablesInsert<'orders'>;
type OrderItem = Tables<'order_items'>;
type OrderStatus = Enums<'order_status'>;

interface CreateOrderInput {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingMemo?: string;
}

interface OrderWithDetails extends Order {
  items: Array<OrderItem & {
    product?: {
      id: string;
      name: string;
      type: Enums<'product_type'>;
    };
  }>;
}

export class OrderService {
  /**
   * 주문 생성
   */
  static async createOrder(
    input: CreateOrderInput,
    ipAddress?: string
  ): Promise<OrderWithDetails> {
    const supabase = await createServerClient();
    const { userId, items, shippingName, shippingPhone, shippingAddress, shippingMemo } = input;

    // 상품 정보 조회
    const productIds = items.map((item) => item.productId);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock, type')
      .in('id', productIds);

    if (productsError || !products) {
      throw new ApiError('상품 정보 조회 실패', 500, 'PRODUCTS_FETCH_FAILED');
    }

    // 재고 확인
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundError(`상품을 찾을 수 없습니다: ${item.productId}`);
      }

      // 실물 상품인 경우 재고 확인
      if (product.type === 'PHYSICAL_GOODS') {
        if (product.stock !== null && product.stock < item.quantity) {
          throw new ApiError(
            `재고가 부족합니다: ${product.name}`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }
      }
    }

    // 총 금액 계산
    let totalPrice = 0;
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        totalPrice += product.price * item.quantity;
      }
    }

    // 주문 번호 생성
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        total_price: totalPrice,
        status: 'PENDING',
        shipping_name: shippingName || null,
        shipping_phone: shippingPhone || null,
        shipping_address: shippingAddress || null,
        shipping_memo: shippingMemo || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new ApiError('주문 생성 실패', 500, 'ORDER_CREATE_FAILED');
    }

    // 주문 항목 생성
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        order_id: order.id,
        product_id: item.productId,
        product_name: product!.name,
        product_type: product!.type,
        quantity: item.quantity,
        price_snapshot: product!.price,
      };
    });

    const { data: createdItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      // 주문 항목 생성 실패 시 주문 삭제
      await supabase.from('orders').delete().eq('id', order.id);
      throw new ApiError('주문 항목 생성 실패', 500, 'ORDER_ITEMS_CREATE_FAILED');
    }

    // 재고 차감 (실물 상품만)
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product && product.type === 'PHYSICAL_GOODS' && product.stock !== null) {
        await supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.productId);
      }
    }

    // ✅ 로그 기록
    await LogService.logOrderCreated(order.id, userId, totalPrice, {
      orderNumber: order.order_number,
      itemCount: items.length,
      hasPhysicalGoods: products.some((p) => p.type === 'PHYSICAL_GOODS'),
    });

    return {
      ...order,
      items: createdItems,
    };
  }

  /**
   * 본인 주문 목록 조회
   */
  static async getUserOrders(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ orders: OrderWithDetails[]; total: number }> {
    const supabase = await createServerClient();
    const { page = 1, limit = 20 } = options;

    let query = supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items (
          *,
          product:products (
            id,
            name,
            type
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError('주문 목록 조회 실패', 500, 'ORDERS_FETCH_FAILED');
    }

    return {
      orders: data as OrderWithDetails[],
      total: count || 0,
    };
  }

  /**
   * 주문 상세 조회
   */
  static async getOrderById(
    orderId: string,
    userId?: string
  ): Promise<OrderWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items (
          *,
          product:products (
            id,
            name,
            type,
            digital_file_url,
            sample_audio_url
          )
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('주문을 찾을 수 없습니다', 'ORDER_NOT_FOUND');
    }

    if (error) {
      throw new ApiError('주문 조회 실패', 500, 'ORDER_FETCH_FAILED');
    }

    // 본인 확인 (userId 제공 시)
    if (userId && data.user_id !== userId) {
      throw new AuthorizationError('주문 조회 권한이 없습니다');
    }

    return data as OrderWithDetails;
  }

  /**
   * 주문 상태 변경 (관리자)
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminId: string
  ): Promise<Order> {
    const supabase = await createServerClient();

    // 기존 주문 조회
    const { data: order } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      throw new NotFoundError('주문을 찾을 수 없습니다', 'ORDER_NOT_FOUND');
    }

    const oldStatus = order.status;

    // 상태 업데이트
    const { data, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new ApiError('주문 상태 변경 실패', 500, 'ORDER_STATUS_UPDATE_FAILED');
    }

    // ✅ 로그 기록
    await LogService.logOrderStatusChanged(
      orderId,
      order.user_id,
      adminId,
      oldStatus,
      newStatus
    );

    return data;
  }

  /**
   * 주문 취소 (사용자)
   */
  static async cancelOrder(
    orderId: string,
    userId: string,
    reason?: string
  ): Promise<Order> {
    const supabase = await createServerClient();

    // 주문 확인
    const { data: order } = await supabase
      .from('orders')
      .select('status, user_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      throw new NotFoundError('주문을 찾을 수 없습니다');
    }

    // 본인 확인
    if (order.user_id !== userId) {
      throw new AuthorizationError('주문 취소 권한이 없습니다');
    }

    // 취소 가능 상태 확인
    if (order.status !== 'PENDING' && order.status !== 'PAID') {
      throw new ApiError(
        '이미 처리 중인 주문은 취소할 수 없습니다',
        400,
        'ORDER_CANNOT_CANCEL'
      );
    }

    // 상태 변경
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'DONE' }) // TODO: CANCELLED 상태 추가 필요
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new ApiError('주문 취소 실패', 500, 'ORDER_CANCEL_FAILED');
    }

    // ✅ 로그 기록
    await LogService.logOrderCancelled(orderId, userId, reason);

    return data;
  }

  /**
   * 모든 주문 목록 조회 (관리자)
   */
  static async getAllOrders(
    options: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<{ orders: OrderWithDetails[]; total: number }> {
    const supabase = await createServerClient();
    const { page = 1, limit = 50, status, dateFrom, dateTo } = options;

    let query = supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items (
          *,
          product:products (
            id,
            name,
            type
          )
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError('주문 목록 조회 실패', 500, 'ORDERS_FETCH_FAILED');
    }

    return {
      orders: data as OrderWithDetails[],
      total: count || 0,
    };
  }
}
