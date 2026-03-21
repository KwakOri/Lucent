/**
 * 주문 및 주문 아이템 상태 관련 상수
 *
 * ## 주문 상태 (order_status)
 * 주문 전체와 개별 상품 모두 동일한 상태값을 사용합니다.
 * 순서: PENDING → PAID → MAKING → READY_TO_SHIP → SHIPPING → DONE
 *
 * ## 개별 상품 상태 (item_status in order_items)
 * 각 주문 상품의 현재 처리 상태를 나타냅니다.
 * **주문 상태와 동일한 ENUM 값(order_status)을 사용**합니다.
 * 주문 상태 변경 시 자동으로 업데이트되며, 상품 타입(디지털/실물)에 따라 다르게 설정됩니다.
 *
 * ### 주문 상태별 개별 상품 상태 매핑
 * | 주문 상태 | 디지털 상품 | 실물 상품 |
 * |-----------|-------------|-----------|
 * | PENDING | PENDING | PENDING |
 * | PAID | DONE | PAID |
 * | MAKING | DONE | MAKING |
 * | READY_TO_SHIP | DONE | READY_TO_SHIP |
 * | SHIPPING | DONE | SHIPPING |
 * | DONE | DONE | DONE |
 *
 * ## 레거시 호환성
 * - normalizeItemStatus() 함수를 사용하여 레거시 상태값을 새 상태값으로 변환합니다.
 * - 레거시 값: PROCESSING, READY, SHIPPED, DELIVERED, COMPLETED
 * - DB 마이그레이션 전까지 프론트엔드에서 레거시 값을 자동 변환하여 표시합니다.
 *
 * ## 참고
 * - 디지털 상품(보이스팩)은 입금 확인 시점에 즉시 완료(DONE) 처리됩니다.
 * - 실물 상품은 제작/포장/발송 단계를 거쳐 점진적으로 상태가 변경됩니다.
 * - 세트 상품(BUNDLE)은 실물 상품으로 분류되어 처리됩니다.
 */

import type { Enums } from "@/types";

type OrderStatus = Enums<"order_status">;
type ProductType = Enums<"product_type">;

/**
 * 주문 상태 설정
 */
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; intent: "default" | "success" | "warning" | "error" }
> = {
  PENDING: { label: "입금대기", intent: "warning" },
  PAID: { label: "입금확인", intent: "default" },
  MAKING: { label: "제작중", intent: "warning" },
  READY_TO_SHIP: { label: "출고중", intent: "default" },
  SHIPPING: { label: "배송중", intent: "warning" },
  DONE: { label: "완료", intent: "default" },
};

/**
 * 주문 상태 레이블 (간단한 형태)
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "입금대기",
  PAID: "입금확인",
  MAKING: "제작중",
  READY_TO_SHIP: "출고중",
  SHIPPING: "배송중",
  DONE: "완료",
};

/**
 * 주문 상태 색상 (Tailwind CSS 클래스)
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  MAKING: "bg-blue-100 text-blue-800",
  READY_TO_SHIP: "bg-teal-100 text-teal-800",
  SHIPPING: "bg-orange-100 text-orange-800",
  DONE: "bg-gray-100 text-gray-800",
};

/**
 * @deprecated 개별 상품 상태도 주문 상태와 동일한 값 사용
 * ORDER_STATUS_CONFIG 사용하고 normalizeItemStatus()로 레거시 값 변환
 */
export const ITEM_STATUS_CONFIG = ORDER_STATUS_CONFIG;

/**
 * @deprecated 개별 상품 상태도 주문 상태와 동일한 값 사용
 * ORDER_STATUS_LABELS 사용하고 normalizeItemStatus()로 레거시 값 변환
 */
export const ITEM_STATUS_LABELS = ORDER_STATUS_LABELS;

/**
 * @deprecated 개별 상품 상태도 주문 상태와 동일한 값 사용
 * ORDER_STATUS_COLORS 사용하고 normalizeItemStatus()로 레거시 값 변환
 */
export const ITEM_STATUS_COLORS = ORDER_STATUS_COLORS;

/**
 * 상품 타입 레이블
 */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  VOICE_PACK: "디지털 상품",
  PHYSICAL_GOODS: "실물 상품",
  BUNDLE: "세트 상품",
};

/**
 * 레거시 개별 상품 상태값을 새 상태값으로 변환
 *
 * DB 마이그레이션 전 호환성을 위한 매핑 함수
 * 프론트엔드에서 레거시 데이터를 올바르게 표시하기 위해 사용
 *
 * @param legacyStatus - 레거시 order_item_status 값
 * @returns 변환된 order_status 값
 */
export function normalizeItemStatus(legacyStatus: string): OrderStatus {
  const mapping: Record<string, OrderStatus> = {
    // 새 상태값 (그대로 유지)
    PENDING: "PENDING",
    PAID: "PAID",
    MAKING: "MAKING",
    READY_TO_SHIP: "READY_TO_SHIP",
    SHIPPING: "SHIPPING",
    DONE: "DONE",

    // 레거시 상태값 → 새 상태값
    PROCESSING: "MAKING",       // 제작중
    READY: "PAID",              // 입금확인 (다운로드 가능 = 입금 확인됨)
    SHIPPED: "SHIPPING",        // 배송중
    DELIVERED: "SHIPPING",      // 배송완료 → 배송중으로 (DONE 직전 단계)
    COMPLETED: "DONE",          // 완료
  };

  return mapping[legacyStatus] || "PENDING";
}
