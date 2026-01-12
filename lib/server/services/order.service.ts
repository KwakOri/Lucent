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

import { SHIPPING_FEE } from "@/constants";
import {
  ApiError,
  AuthorizationError,
  NotFoundError,
} from "@/lib/server/utils/errors";
import { createServerClient } from "@/lib/server/utils/supabase";
import { Enums, Tables, TablesInsert, TablesUpdate } from "@/types/database";
import { LogService } from "./log.service";

type Order = Tables<"orders">;
type OrderInsert = TablesInsert<"orders">;
type OrderItem = Tables<"order_items">;
type OrderStatus = Enums<"order_status">;
type Shipment = Tables<"shipments">;
type ShipmentInsert = TablesInsert<"shipments">;

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
  shippingMainAddress?: string;
  shippingDetailAddress?: string;
  shippingMemo?: string;
}

interface OrderWithDetails extends Order {
  items: Array<
    OrderItem & {
      product?: {
        id: string;
        name: string;
        type: Enums<"product_type">;
      };
    }
  >;
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
      shippingMainAddress,
      shippingDetailAddress,
      shippingMemo,
    } = input;

    // 상품 정보 조회
    const productIds = items.map((item) => item.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock, type")
      .in("id", productIds);

    if (productsError || !products) {
      throw new ApiError("상품 정보 조회 실패", 500, "PRODUCTS_FETCH_FAILED");
    }

    // 재고 확인
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundError(`상품을 찾을 수 없습니다: ${item.productId}`);
      }

      // 실물 상품인 경우 재고 확인
      if (product.type === "PHYSICAL_GOODS") {
        if (product.stock !== null && product.stock < item.quantity) {
          throw new ApiError(
            `재고가 부족합니다: ${product.name}`,
            400,
            "INSUFFICIENT_STOCK"
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

    // 배송비 추가 (실물 굿즈 또는 번들 상품이 포함된 경우)
    const hasPhysicalProduct = products.some(
      (p) => p.type === "PHYSICAL_GOODS" || p.type === "BUNDLE"
    );
    if (hasPhysicalProduct) {
      totalPrice += SHIPPING_FEE;
    }

    // 주문 번호 생성
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 주문 상태 결정: 0원이면 즉시 완료, 아니면 입금대기
    const orderStatus: OrderStatus = totalPrice === 0 ? "DONE" : "PENDING";

    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        order_number: orderNumber,
        total_price: totalPrice,
        status: orderStatus,
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        shipping_name: shippingName || null,
        shipping_phone: shippingPhone || null,
        shipping_main_address: shippingMainAddress || null,
        shipping_detail_address: shippingDetailAddress || null,
        shipping_memo: shippingMemo || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new ApiError("주문 생성 실패", 500, "ORDER_CREATE_FAILED");
    }

    // 주문 항목 생성 (개별 아이템 가격에 따라 상태 결정)
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      // 개별 아이템이 0원이면 즉시 완료, 아니면 입금대기
      // 개별 상품 상태도 주문 상태와 동일한 값 사용
      const itemStatus: OrderStatus = product!.price === 0 ? "DONE" : "PENDING";

      return {
        order_id: order.id,
        product_id: item.productId,
        product_name: product!.name,
        product_type: product!.type,
        quantity: item.quantity,
        price_snapshot: product!.price,
        // DB 마이그레이션 전까지 타입 캐스팅 필요
        item_status: itemStatus as any,
      };
    });

    const { data: createdItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      // 주문 항목 생성 실패 시 주문 삭제
      await supabase.from("orders").delete().eq("id", order.id);
      throw new ApiError(
        "주문 항목 생성 실패",
        500,
        "ORDER_ITEMS_CREATE_FAILED"
      );
    }

    // 재고 차감 (실물 상품만)
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (
        product &&
        product.type === "PHYSICAL_GOODS" &&
        product.stock !== null
      ) {
        await supabase
          .from("products")
          .update({ stock: product.stock - item.quantity })
          .eq("id", item.productId);
      }
    }

    // ✅ 로그 기록
    await LogService.logOrderCreated(order.id, userId, totalPrice, {
      orderNumber: order.order_number,
      itemCount: items.length,
      hasPhysicalGoods: products.some((p) => p.type === "PHYSICAL_GOODS"),
      isFreeOrder: totalPrice === 0,
      autoCompleted: totalPrice === 0,
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
      .from("orders")
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
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError("주문 목록 조회 실패", 500, "ORDERS_FETCH_FAILED");
    }

    return {
      orders: data as OrderWithDetails[],
      total: count || 0,
    };
  }

  /**
   * 주문 상세 조회
   *
   * v2: shipments 정보 포함
   */
  static async getOrderById(
    orderId: string,
    userId?: string
  ): Promise<OrderWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("orders")
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
          ),
          shipment:shipments (
            id,
            carrier,
            tracking_number,
            shipping_status,
            shipped_at,
            delivered_at
          )
        )
      `
      )
      .eq("id", orderId)
      .single();

    if (error && error.code === "PGRST116") {
      throw new NotFoundError("주문을 찾을 수 없습니다", "ORDER_NOT_FOUND");
    }

    if (error) {
      throw new ApiError("주문 조회 실패", 500, "ORDER_FETCH_FAILED");
    }

    // 본인 확인 (userId 제공 시)
    if (userId && data.user_id !== userId) {
      throw new AuthorizationError("주문 조회 권한이 없습니다");
    }

    return data as OrderWithDetails;
  }

  /**
   * 주문 상태 변경 (관리자)
   *
   * v2: order_items의 item_status도 함께 업데이트
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminId: string
  ): Promise<{ order: Order; emailSent: boolean; sentTo?: string }> {
    const supabase = await createServerClient();

    // 기존 주문 조회 (주문 항목 포함)
    const { data: orderData } = await supabase
      .from("orders")
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
      `
      )
      .eq("id", orderId)
      .single();

    if (!orderData) {
      throw new NotFoundError("주문을 찾을 수 없습니다", "ORDER_NOT_FOUND");
    }

    const oldStatus = orderData.status;

    // 상태 업데이트
    const { data, error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      throw new ApiError(
        "주문 상태 변경 실패",
        500,
        "ORDER_STATUS_UPDATE_FAILED"
      );
    }

    // v2: order_items의 item_status도 함께 업데이트
    // 디지털/실물 상품을 구분하여 처리
    const digitalItems = orderData.items.filter(
      (item) => item.product?.type === "VOICE_PACK"
    );
    const physicalItems = orderData.items.filter(
      (item) =>
        item.product?.type === "PHYSICAL_GOODS" ||
        item.product?.type === "BUNDLE"
    );

    // 주문 상태에 따른 개별 상품 상태 결정
    // 개별 상품 상태도 주문 상태와 동일한 값 사용
    let digitalItemStatus: OrderStatus = "PENDING";
    let physicalItemStatus: OrderStatus = "PENDING";

    switch (newStatus) {
      case "PENDING":
        // 입금 대기: 모든 상품 대기 상태
        digitalItemStatus = "PENDING";
        physicalItemStatus = "PENDING";
        break;

      case "PAID":
        // 입금 확인: 디지털 즉시 완료, 실물은 입금 확인 상태 유지
        digitalItemStatus = "DONE";
        physicalItemStatus = "PAID";
        break;

      case "MAKING":
        // 제작중: 디지털 완료, 실물 제작중
        digitalItemStatus = "DONE";
        physicalItemStatus = "MAKING";
        break;

      case "READY_TO_SHIP":
        // 출고중: 디지털 완료, 실물 출고중
        digitalItemStatus = "DONE";
        physicalItemStatus = "READY_TO_SHIP";
        break;

      case "SHIPPING":
        // 배송중: 디지털 완료, 실물 배송중
        digitalItemStatus = "DONE";
        physicalItemStatus = "SHIPPING";
        break;

      case "DONE":
        // 완료: 모든 상품 완료
        digitalItemStatus = "DONE";
        physicalItemStatus = "DONE";
        break;
    }

    // 디지털 상품 상태 업데이트
    if (digitalItems.length > 0) {
      await this.updateItemsStatus(
        orderId,
        digitalItems.map((item) => item.id),
        digitalItemStatus
      );
    }

    // 실물 상품 상태 업데이트
    if (physicalItems.length > 0) {
      await this.updateItemsStatus(
        orderId,
        physicalItems.map((item) => item.id),
        physicalItemStatus
      );
    }

    // ✅ 로그 기록
    await LogService.logOrderStatusChanged(
      orderId,
      orderData.user_id,
      adminId,
      oldStatus,
      newStatus
    );

    let emailSent = false;
    let sentTo: string | undefined;

    // 입금 확인 시 (PENDING → PAID) 보이스팩이 포함되어 있으면 이메일 발송
    if (newStatus === "PAID" && oldStatus === "PENDING") {
      const hasVoicePack = orderData.items.some(
        (item) => item.product?.type === "VOICE_PACK"
      );

      if (hasVoicePack && orderData.buyer_email) {
        // 구매 완료 이메일 발송
        const { sendPurchaseCompleteEmail } = await import(
          "@/lib/server/utils/email"
        );

        // 첫 번째 보이스팩 상품명 사용
        const voicePackItem = orderData.items.find(
          (item) => item.product?.type === "VOICE_PACK"
        );
        const productName = voicePackItem?.product?.name || "보이스팩";

        await sendPurchaseCompleteEmail({
          email: orderData.buyer_email,
          buyerName: orderData.buyer_name || "고객",
          productName,
          orderNumber: orderData.order_number,
          totalPrice: orderData.total_price,
        });

        emailSent = true;
        sentTo = orderData.buyer_email;

        // 이메일 발송 로그
        await LogService.log({
          severity: "info",
          eventCategory: "EMAIL",
          eventType: "PURCHASE_COMPLETE_EMAIL_SENT",
          message: "보이스팩 구매 완료 이메일 발송",
          userId: orderData.user_id,
          metadata: {
            orderId,
            orderNumber: orderData.order_number,
            email: orderData.buyer_email,
            productName,
          },
        });
      }
    }

    return { order: data, emailSent, sentTo };
  }

  /**
   * 주문 취소 (사용자)
   *
   * - PENDING(입금대기) 상태에서만 취소 가능
   * - 본인 주문만 취소 가능
   * - 주문 및 주문 아이템 삭제
   * - 로그 기록
   */
  static async cancelOrder(
    orderId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = await createServerClient();

    // 주문 확인
    const { data: order } = await supabase
      .from("orders")
      .select("status, user_id, order_number")
      .eq("id", orderId)
      .single();

    if (!order) {
      throw new NotFoundError("주문을 찾을 수 없습니다");
    }

    // 본인 확인
    if (order.user_id !== userId) {
      throw new AuthorizationError("주문 취소 권한이 없습니다");
    }

    // 취소 가능 상태 확인 - PENDING(입금대기)일 때만 취소 가능
    if (order.status !== "PENDING") {
      throw new ApiError(
        "입금대기 상태의 주문만 취소할 수 있습니다",
        400,
        "ORDER_CANNOT_CANCEL"
      );
    }

    // ✅ 로그 기록 (삭제 전에 기록)
    await LogService.logOrderCancelled(orderId, userId, reason || "고객 요청");

    // 주문 아이템 삭제
    const { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (itemsError) {
      throw new ApiError(
        "주문 아이템 삭제 실패",
        500,
        "ORDER_ITEMS_DELETE_FAILED"
      );
    }

    // 주문 삭제
    const { error: orderError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (orderError) {
      throw new ApiError("주문 취소 실패", 500, "ORDER_CANCEL_FAILED");
    }

    return {
      success: true,
      message: `주문 ${order.order_number}이(가) 취소되었습니다`,
    };
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
      .from("orders")
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
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError("주문 목록 조회 실패", 500, "ORDERS_FETCH_FAILED");
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
    filename: string;
  }> {
    const supabase = await createServerClient();

    // 1. 주문 아이템 조회
    const { data: orderItem, error: itemError } = await supabase
      .from("order_items")
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
      .eq("id", itemId)
      .eq("order_id", orderId)
      .single();

    if (itemError || !orderItem) {
      throw new NotFoundError(
        "주문 아이템을 찾을 수 없습니다",
        "ORDER_ITEM_NOT_FOUND"
      );
    }

    // 2. 권한 확인
    const order = orderItem.order;
    if (order.user_id !== userId) {
      // 로그: 권한 없는 다운로드 시도
      await LogService.logUnauthorizedDownload(
        orderItem.product.id,
        userId,
        undefined
      );
      throw new AuthorizationError("다운로드 권한이 없습니다");
    }

    // 3. 주문 상태 확인 (PAID 이상만 다운로드 가능)
    const validStatuses: OrderStatus[] = ["PAID", "MAKING", "SHIPPING", "DONE"];
    if (!validStatuses.includes(order.status)) {
      throw new ApiError(
        "결제가 완료된 주문만 다운로드할 수 있습니다",
        403,
        "PAYMENT_NOT_COMPLETED"
      );
    }

    // 4. 디지털 상품인지 확인
    const product = orderItem.product;
    if (product.type !== "VOICE_PACK") {
      throw new ApiError(
        "디지털 상품만 다운로드할 수 있습니다",
        400,
        "NOT_DIGITAL_PRODUCT"
      );
    }

    // 5. 디지털 파일 URL 확인
    if (!product.digital_file_url) {
      throw new ApiError(
        "다운로드 가능한 파일이 없습니다",
        404,
        "DIGITAL_FILE_NOT_FOUND"
      );
    }

    // 6. 파일명 생성 (상품명 + .zip)
    const filename = `${product.name.replace(/[^a-zA-Z0-9가-힣\s]/g, "_")}.zip`;

    // 7. Google Drive 링크 반환 (R2 대신 Google Drive 사용)
    // digital_file_url이 이미 Google Drive 링크임
    const downloadUrl = product.digital_file_url;
    const expiresIn = 3600; // 1시간 (Google Drive는 만료 없지만 호환성 유지)

    // ===== 이전 R2 Presigned URL 생성 로직 (주석 처리) =====
    // const { generateSignedUrl } = await import("@/lib/server/utils/r2");
    // const url = new URL(product.digital_file_url);
    // const r2Key = url.pathname.substring(1);
    // const downloadUrl = await generateSignedUrl({
    //   key: r2Key,
    //   expiresIn,
    //   filename,
    // });
    // ===== R2 로직 끝 =====

    // 8. 다운로드 횟수 증가 및 마지막 다운로드 시간 업데이트
    const newDownloadCount = (orderItem.download_count || 0) + 1;
    await supabase
      .from("order_items")
      .update({
        download_count: newDownloadCount,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    // 9. 로그 기록
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
      filename,
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
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING"),
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
      .from("orders")
      .select(
        `
        id,
        order_number,
        buyer_name,
        shipping_name,
        total_price,
        status,
        created_at
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new ApiError(
        "최근 주문 조회 실패",
        500,
        "RECENT_ORDERS_FETCH_FAILED"
      );
    }

    return data || [];
  }

  /**
   * 내 보이스팩 목록 조회 (사용자)
   */
  static async getMyVoicePacks(userId: string): Promise<any[]> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("order_items")
      .select(
        `
        id,
        order_id,
        download_count,
        last_downloaded_at,
        product:products (
          id,
          name,
          type,
          digital_file_url,
          sample_audio_url
        ),
        order:orders (
          id,
          order_number,
          status,
          created_at,
          user_id
        )
      `
      )
      .eq("order.user_id", userId)
      .in("order.status", ["PAID", "DONE"])
      .eq("product.type", "VOICE_PACK")
      .order("order.created_at", { ascending: false });

    if (error) {
      throw new ApiError(
        "보이스팩 목록 조회 실패",
        500,
        "VOICEPACKS_FETCH_FAILED"
      );
    }

    // 데이터 변환
    const voicepacks = (data || []).map((item) => ({
      itemId: item.id,
      orderId: item.order_id,
      orderNumber: item.order?.order_number,
      productId: item.product?.id,
      productName: item.product?.name,
      purchasedAt: item.order?.created_at,
      downloadCount: item.download_count || 0,
      lastDownloadedAt: item.last_downloaded_at,
      canDownload: true, // PAID 또는 DONE 상태만 조회했으므로 항상 true
    }));

    return voicepacks;
  }

  // =====================================================
  // Order System V2: 개별 주문 상품 상태 관리
  // =====================================================

  /**
   * 개별 주문 상품 상태 업데이트
   *
   * 개별 상품 상태도 주문 상태와 동일한 값 사용
   */
  static async updateItemStatus(
    itemId: string,
    newStatus: OrderStatus,
    adminId?: string
  ): Promise<OrderItem> {
    const supabase = await createServerClient();

    // 기존 상태 조회
    const { data: item } = await supabase
      .from("order_items")
      .select("id, item_status, order_id, product_id")
      .eq("id", itemId)
      .single();

    if (!item) {
      throw new NotFoundError(
        "주문 상품을 찾을 수 없습니다",
        "ORDER_ITEM_NOT_FOUND"
      );
    }

    const oldStatus = item.item_status;

    // 상태 업데이트
    const { data, error } = await supabase
      .from("order_items")
      // DB 마이그레이션 전까지 타입 캐스팅 필요
      .update({ item_status: newStatus as any })
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      throw new ApiError(
        "주문 상품 상태 변경 실패",
        500,
        "ITEM_STATUS_UPDATE_FAILED"
      );
    }

    // 로그 기록
    await LogService.log({
      severity: "info",
      eventCategory: "ORDER",
      eventType: "ORDER_ITEM_STATUS_CHANGED",
      message: `주문 상품 상태 변경: ${oldStatus} → ${newStatus}`,
      userId: adminId,
      metadata: {
        itemId,
        orderId: item.order_id,
        productId: item.product_id,
        oldStatus,
        newStatus,
      },
    });

    return data;
  }

  /**
   * 주문 상태 변경 시 모든 order_items의 상태도 함께 업데이트
   *
   * 개별 상품 상태도 주문 상태와 동일한 값 사용
   */
  static async updateAllItemsStatus(
    orderId: string,
    newStatus: OrderStatus
  ): Promise<void> {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from("order_items")
      // DB 마이그레이션 전까지 타입 캐스팅 필요
      .update({ item_status: newStatus as any })
      .eq("order_id", orderId);

    if (error) {
      throw new ApiError(
        "주문 상품 상태 일괄 변경 실패",
        500,
        "ITEMS_STATUS_UPDATE_FAILED"
      );
    }
  }

  /**
   * 특정 주문 아이템들의 상태 업데이트 (선택적)
   *
   * 개별 상품 상태도 주문 상태와 동일한 값 사용
   */
  static async updateItemsStatus(
    orderId: string,
    itemIds: string[],
    newStatus: OrderStatus
  ): Promise<void> {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from("order_items")
      // DB 마이그레이션 전까지 타입 캐스팅 필요
      .update({ item_status: newStatus as any })
      .eq("order_id", orderId)
      .in("id", itemIds);

    if (error) {
      throw new ApiError(
        "주문 상품 상태 변경 실패",
        500,
        "ITEMS_STATUS_UPDATE_FAILED"
      );
    }
  }

  // =====================================================
  // Order System V2: 배송 정보 관리
  // =====================================================

  /**
   * 배송 정보 생성 (실물 상품)
   */
  static async createShipment(
    input: {
      orderItemId: string;
      recipientName: string;
      recipientPhone: string;
      recipientAddress: string;
      deliveryMemo?: string;
      carrier?: string;
      trackingNumber?: string;
    },
    adminId?: string
  ): Promise<Shipment> {
    const supabase = await createServerClient();

    // order_item 확인
    const { data: item } = await supabase
      .from("order_items")
      .select("id, order_id, product_type")
      .eq("id", input.orderItemId)
      .single();

    if (!item) {
      throw new NotFoundError(
        "주문 상품을 찾을 수 없습니다",
        "ORDER_ITEM_NOT_FOUND"
      );
    }

    // 실물 상품인지 확인 (PHYSICAL_GOODS, PHYSICAL, BUNDLE만 가능)
    if (item.product_type === "VOICE_PACK") {
      throw new ApiError(
        "디지털 상품은 배송 정보를 생성할 수 없습니다",
        400,
        "NOT_PHYSICAL_PRODUCT"
      );
    }

    // 배송 정보 생성
    const { data, error } = await supabase
      .from("shipments")
      .insert({
        order_item_id: input.orderItemId,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: input.recipientAddress,
        delivery_memo: input.deliveryMemo || null,
        carrier: input.carrier || null,
        tracking_number: input.trackingNumber || null,
        shipping_status: "PREPARING",
      })
      .select()
      .single();

    if (error) {
      throw new ApiError("배송 정보 생성 실패", 500, "SHIPMENT_CREATE_FAILED");
    }

    // 로그 기록
    await LogService.log({
      severity: "info",
      eventCategory: "ORDER",
      eventType: "SHIPMENT_CREATED",
      message: "배송 정보 생성",
      userId: adminId,
      metadata: {
        shipmentId: data.id,
        orderItemId: input.orderItemId,
        orderId: item.order_id,
        recipientName: input.recipientName,
      },
    });

    return data;
  }

  /**
   * 배송 정보 조회
   */
  static async getShipmentInfo(
    orderItemId: string,
    userId?: string
  ): Promise<Shipment | null> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("shipments")
      .select(
        `
        *,
        order_item:order_items (
          id,
          order_id,
          order:orders (
            id,
            user_id
          )
        )
      `
      )
      .eq("order_item_id", orderItemId)
      .single();

    if (error && error.code === "PGRST116") {
      // 배송 정보 없음 (정상)
      return null;
    }

    if (error) {
      throw new ApiError("배송 정보 조회 실패", 500, "SHIPMENT_FETCH_FAILED");
    }

    // 권한 확인 (userId 제공 시)
    if (userId) {
      const orderItem = data.order_item;
      if (orderItem?.order?.user_id !== userId) {
        throw new AuthorizationError("배송 정보 조회 권한이 없습니다");
      }
    }

    return data;
  }

  /**
   * 배송 정보 업데이트 (관리자)
   */
  static async updateShipment(
    shipmentId: string,
    updates: {
      carrier?: string;
      trackingNumber?: string;
      shippingStatus?: string;
      recipientName?: string;
      recipientPhone?: string;
      recipientAddress?: string;
      deliveryMemo?: string;
      adminMemo?: string;
    },
    adminId?: string
  ): Promise<Shipment> {
    const supabase = await createServerClient();

    // 배송 정보 확인
    const { data: existingShipment } = await supabase
      .from("shipments")
      .select("id, shipping_status")
      .eq("id", shipmentId)
      .single();

    if (!existingShipment) {
      throw new NotFoundError(
        "배송 정보를 찾을 수 없습니다",
        "SHIPMENT_NOT_FOUND"
      );
    }

    const oldStatus = existingShipment.shipping_status;

    // 업데이트 데이터 준비
    const updateData: TablesUpdate<"shipments"> = {};
    if (updates.carrier !== undefined) updateData.carrier = updates.carrier;
    if (updates.trackingNumber !== undefined)
      updateData.tracking_number = updates.trackingNumber;
    if (updates.shippingStatus !== undefined)
      updateData.shipping_status = updates.shippingStatus;
    if (updates.recipientName !== undefined)
      updateData.recipient_name = updates.recipientName;
    if (updates.recipientPhone !== undefined)
      updateData.recipient_phone = updates.recipientPhone;
    if (updates.recipientAddress !== undefined)
      updateData.recipient_address = updates.recipientAddress;
    if (updates.deliveryMemo !== undefined)
      updateData.delivery_memo = updates.deliveryMemo;
    if (updates.adminMemo !== undefined)
      updateData.admin_memo = updates.adminMemo;

    // 발송 시간 기록 (상태가 SHIPPED로 변경될 때)
    if (updates.shippingStatus === "SHIPPED" && oldStatus !== "SHIPPED") {
      updateData.shipped_at = new Date().toISOString();
    }

    // 배송 완료 시간 기록 (상태가 DELIVERED로 변경될 때)
    if (updates.shippingStatus === "DELIVERED" && oldStatus !== "DELIVERED") {
      updateData.delivered_at = new Date().toISOString();
    }

    // 업데이트 실행
    const { data, error } = await supabase
      .from("shipments")
      .update(updateData)
      .eq("id", shipmentId)
      .select()
      .single();

    if (error) {
      throw new ApiError(
        "배송 정보 업데이트 실패",
        500,
        "SHIPMENT_UPDATE_FAILED"
      );
    }

    // 로그 기록
    await LogService.log({
      severity: "info",
      eventCategory: "ORDER",
      eventType: "SHIPMENT_UPDATED",
      message: `배송 정보 업데이트`,
      userId: adminId,
      metadata: {
        shipmentId,
        updates: JSON.parse(JSON.stringify(updates)),
        oldStatus,
        newStatus: updates.shippingStatus || null,
      },
    });

    return data;
  }

  /**
   * 배송 추적 정보 조회 (고객용)
   */
  static async getShipmentTracking(
    orderItemId: string,
    userId: string
  ): Promise<{
    carrier: string | null;
    trackingNumber: string | null;
    shippingStatus: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null> {
    const shipment = await this.getShipmentInfo(orderItemId, userId);

    if (!shipment) {
      return null;
    }

    return {
      carrier: shipment.carrier,
      trackingNumber: shipment.tracking_number,
      shippingStatus: shipment.shipping_status || "PREPARING",
      shippedAt: shipment.shipped_at,
      deliveredAt: shipment.delivered_at,
    };
  }
}
