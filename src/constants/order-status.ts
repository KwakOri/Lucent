/**
 * 주문 및 주문 아이템 상태 관련 상수
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
 * 상품 타입 레이블
 */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  VOICE_PACK: "디지털 상품",
  PHYSICAL_GOODS: "실물 상품",
  BUNDLE: "세트 상품",
};
