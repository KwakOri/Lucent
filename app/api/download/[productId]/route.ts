/**
 * Download API Route
 *
 * GET /api/download/:productId - 상품 다운로드 (구매 확인 후 Google Drive 리다이렉트)
 */

import { LogService } from "@/lib/server/services/log.service";
import { createServerClient } from "@/lib/server/utils/supabase";
import { NextRequest, NextResponse } from "next/server";

interface DownloadParams {
  params: Promise<{
    productId: string;
  }>;
}

/**
 * 상품 다운로드
 *
 * 1. 사용자 인증 확인
 * 2. 구매 내역 확인
 * 3. 다운로드 로그 기록
 * 4. Google Drive 링크로 리다이렉트
 */
export async function GET(request: NextRequest, { params }: DownloadParams) {
  try {
    const { productId } = await params;
    const supabase = await createServerClient();

    console.log("[Download] 다운로드 요청:", productId);

    // 1. 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[Download] 인증 실패:", authError);
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    console.log("[Download] 사용자 인증 완료:", user.id);

    // 2. 상품 정보 조회
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, digital_file_url, type")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error("[Download] 상품 조회 실패:", productError);
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (!product.digital_file_url) {
      console.error("[Download] 다운로드 링크 없음");
      return NextResponse.json(
        { error: "다운로드 링크가 설정되지 않았습니다" },
        { status: 400 }
      );
    }

    console.log("[Download] 상품 조회 완료:", product.name);

    // 3. 구매 내역 확인 (주문 + 주문 아이템 조인)
    const { data: orderItems, error: orderError } = await supabase
      .from("order_items")
      .select(
        `
        id,
        item_status,
        orders!inner (
          id,
          user_id,
          status
        )
      `
      )
      .eq("product_id", productId)
      .eq("orders.user_id", user.id)
      .in("orders.status", ["DONE"])
      .in("item_status", ["COMPLETED"]);

    if (orderError) {
      console.error("[Download] 주문 조회 실패:", orderError);
      return NextResponse.json(
        { error: "주문 내역 조회 실패" },
        { status: 500 }
      );
    }

    if (!orderItems || orderItems.length === 0) {
      console.warn("[Download] 구매 내역 없음:", {
        userId: user.id,
        productId,
      });

      // 구매하지 않은 접근 시도 로그
      await LogService.log({
        eventType: "DOWNLOAD_UNAUTHORIZED",
        message: "구매하지 않은 상품 다운로드 시도",
        userId: user.id,
        metadata: {
          productId,
          productName: product.name,
          userEmail: user.email as string,
        },
      });

      return NextResponse.json(
        { error: "이 상품을 구매하지 않았습니다" },
        { status: 403 }
      );
    }

    console.log("[Download] 구매 확인 완료:", orderItems[0]);

    // 4. 다운로드 로그 기록
    await LogService.log({
      eventType: "DOWNLOAD_SUCCESS",
      message: "상품 다운로드",
      userId: user.id,
      metadata: {
        productId,
        productName: product.name,
        orderItemId: orderItems[0].id,
        userEmail: user.email as string,
      },
    });

    console.log(
      "[Download] Google Drive 링크로 리다이렉트:",
      product.digital_file_url
    );

    // 5. Google Drive 링크로 리다이렉트
    return NextResponse.redirect(product.digital_file_url);
  } catch (error) {
    console.error("[Download] 다운로드 실패:", error);

    // 에러 로그 기록
    await LogService.log({
      eventType: "DOWNLOAD_FAILED",
      message: "다운로드 중 오류 발생",
      userId: "unknown",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack || null : null,
      },
    });

    return NextResponse.json(
      { error: "다운로드 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
