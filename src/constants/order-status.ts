/**
 * 주문 및 주문 아이템 상태 관련 상수
 *
 * ## 주문 상태 (order_status)
 * 주문 전체의 대표 상태를 나타냅니다.
 * 순서: PENDING → PAID → MAKING → READY_TO_SHIP → SHIPPING → DONE
 *
 * ## 개별 상품 상태 (order_item_status)
 * 각 주문 상품의 현재 처리 상태를 나타냅니다.
 * 주문 상태 변경 시 자동으로 업데이트되며, 상품 타입(디지털/실물)에 따라 다르게 설정됩니다.
 *
 * ### 주문 상태별 개별 상품 상태 매핑
 * | 주문 상태 | 디지털 상품 | 실물 상품 |
 * |-----------|-------------|-----------|
 * | PENDING | PENDING | PENDING |
 * | PAID | COMPLETED | READY |
 * | MAKING | COMPLETED | PROCESSING |
 * | READY_TO_SHIP | COMPLETED | READY |
 * | SHIPPING | COMPLETED | SHIPPED |
 * | DONE | COMPLETED | COMPLETED |
 *
 * ## 참고
 * - 디지털 상품(보이스팩)은 입금 확인 시점에 즉시 완료(COMPLETED) 처리됩니다.
 * - 실물 상품은 제작/포장/발송 단계를 거쳐 점진적으로 상태가 변경됩니다.
 * - 세트 상품(BUNDLE)은 실물 상품으로 분류되어 처리됩니다.
 */

import type { Enums } from "@/types";

type OrderStatus = Enums<"order_status">;
type OrderItemStatus = Enums<"order_item_status">;
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
 * 주문 아이템 상태 설정
 */
export const ITEM_STATUS_CONFIG: Record<
  OrderItemStatus,
  { label: string; intent: "default" | "success" | "warning" | "error" }
> = {
  PENDING: { label: "입금대기", intent: "warning" },
  READY: { label: "다운로드 가능", intent: "default" },
  PROCESSING: { label: "제작중", intent: "warning" },
  SHIPPED: { label: "배송중", intent: "warning" },
  DELIVERED: { label: "배송완료", intent: "success" },
  COMPLETED: { label: "완료", intent: "success" },
};

/**
 * 주문 아이템 상태 레이블 (간단한 형태)
 */
export const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  PENDING: "입금대기",
  READY: "다운로드 가능",
  PROCESSING: "제작중",
  SHIPPED: "배송중",
  DELIVERED: "배송완료",
  COMPLETED: "완료",
};

/**
 * 주문 아이템 상태 색상 (Tailwind CSS 클래스)
 */
export const ITEM_STATUS_COLORS: Record<OrderItemStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  READY: "bg-gray-100 text-gray-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-100 text-green-800",
};

/**
 * 상품 타입 레이블
 */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  VOICE_PACK: "디지털 상품",
  PHYSICAL_GOODS: "실물 상품",
  BUNDLE: "세트 상품",
};
