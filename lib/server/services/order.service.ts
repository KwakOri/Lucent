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
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
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
    const {
      userId,
      items,
      buyerName,
      buyerEmail,
      buyerPhone,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingMemo
    } = input;

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
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
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

  /**
   * 디지털 상품 다운로드 링크 생성
   */
  static async generateDownloadLink(
    orderId: string,
    itemId: string,
    userId: string
  ): Promise<{
    downloadUrl: string;
    expiresIn: number;
    expiresAt: string;
  }> {
    const supabase = await createServerClient();

    // 1. 주문 아이템 조회
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select(
        `
        *,
        order:orders (
          id,
          user_id,
          status
        ),
        product:products (
          id,
          name,
          type,
          digital_file_url
        )
      `
      )
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single();

    if (itemError || !orderItem) {
      throw new NotFoundError('주문 아이템을 찾을 수 없습니다', 'ORDER_ITEM_NOT_FOUND');
    }

    // 2. 권한 확인
    const order = orderItem.order as any;
    if (order.user_id !== userId) {
      // 로그: 권한 없는 다운로드 시도
      await LogService.logUnauthorizedDownload(
        (orderItem.product as any).id,
        userId,
        undefined
      );
      throw new AuthorizationError('다운로드 권한이 없습니다');
    }

    // 3. 주문 상태 확인 (PAID 이상만 다운로드 가능)
    const validStatuses: OrderStatus[] = ['PAID', 'MAKING', 'SHIPPING', 'DONE'];
    if (!validStatuses.includes(order.status)) {
      throw new ApiError(
        '결제가 완료된 주문만 다운로드할 수 있습니다',
        403,
        'PAYMENT_NOT_COMPLETED'
      );
    }

    // 4. 디지털 상품인지 확인
    const product = orderItem.product as any;
    if (product.type !== 'VOICE_PACK') {
      throw new ApiError(
        '디지털 상품만 다운로드할 수 있습니다',
        400,
        'NOT_DIGITAL_PRODUCT'
      );
    }

    // 5. 디지털 파일 URL 확인
    if (!product.digital_file_url) {
      throw new ApiError(
        '다운로드 가능한 파일이 없습니다',
        404,
        'DIGITAL_FILE_NOT_FOUND'
      );
    }

    // 6. Presigned URL 생성 (R2)
    const { generateSignedUrl } = await import('@/lib/server/utils/r2');

    // R2 키 추출 (URL에서 경로 부분만)
    const url = new URL(product.digital_file_url);
    const r2Key = url.pathname.substring(1); // 맨 앞 '/' 제거

    const expiresIn = 3600; // 1시간
    const downloadUrl = await generateSignedUrl({
      key: r2Key,
      expiresIn,
    });

    // 7. 다운로드 횟수 증가
    const newDownloadCount = (orderItem.download_count || 0) + 1;
    await supabase
      .from('order_items')
      .update({ download_count: newDownloadCount })
      .eq('id', itemId);

    // 8. 로그 기록
    await LogService.logDigitalProductDownload(
      product.id,
      orderId,
      userId,
      undefined,
      {
        productName: product.name,
        downloadCount: newDownloadCount,
      }
    );

    return {
      downloadUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  /**
   * 주문 통계 조회 (관리자용)
   */
  static async getOrdersStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
  }> {
    const supabase = await createServerClient();

    const [totalResult, pendingResult] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
    ]);

    return {
      totalOrders: totalResult.count || 0,
      pendingOrders: pendingResult.count || 0,
    };
  }

  /**
   * 최근 주문 조회 (관리자용)
   */
  static async getRecentOrders(limit: number = 5): Promise<any[]> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        shipping_name,
        total_price,
        status,
        created_at
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new ApiError('최근 주문 조회 실패', 500, 'RECENT_ORDERS_FETCH_FAILED');
    }

    return data || [];
  }
}
