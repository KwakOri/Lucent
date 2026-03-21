/**
 * 애플리케이션 상수
 */

/**
 * 배송비 (원)
 * - 실물 굿즈 또는 실물 굿즈가 포함된 번들 상품에 적용
 */
export const SHIPPING_FEE = 3500;

/**
 * 주문 및 주문 아이템 상태 관련 상수
 */
export {
  ORDER_STATUS_CONFIG,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ITEM_STATUS_CONFIG,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  PRODUCT_TYPE_LABELS,
  normalizeItemStatus,
} from './order-status';
