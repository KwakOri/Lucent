-- Order System V2 Migration
-- Created: 2025-01-31
-- Description: 디지털/실물/세트 상품 통합 관리를 위한 주문 시스템 개선
-- Reference: /specs/database/order-system-v2.md

-- =====================================================
-- 1. ENUM 타입 확장
-- =====================================================

-- product_type에 'BUNDLE' 추가
-- Note: PostgreSQL에서 ENUM에 값 추가는 트랜잭션 외부에서 실행되어야 함
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'BUNDLE';

-- order_item_status ENUM 추가 (개별 주문 상품 상태)
DO $$ BEGIN
  CREATE TYPE order_item_status AS ENUM (
    'PENDING',      -- 입금 대기 중
    'PROCESSING',   -- 처리 중 (입금 확인됨, 준비 시작)
    'READY',        -- 준비 완료 (디지털: 다운로드 가능, 실물: 발송 대기)
    'SHIPPED',      -- 발송됨 (실물만)
    'DELIVERED',    -- 배송 완료 (실물만)
    'COMPLETED'     -- 완료 (디지털/실물 모두 완료)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. 신규 테이블: shipments (배송 정보)
-- =====================================================

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

    -- 배송 정보
    carrier VARCHAR(100),                     -- 택배사 (CJ대한통운, 우체국택배 등)
    tracking_number VARCHAR(100),             -- 운송장 번호
    shipping_status VARCHAR(50) DEFAULT 'PREPARING', -- 배송 상태

    -- 수령인 정보 (order_items별로 다를 수 있음)
    recipient_name VARCHAR(100) NOT NULL,     -- 수령인 이름
    recipient_phone VARCHAR(20) NOT NULL,     -- 수령인 연락처
    recipient_address TEXT NOT NULL,          -- 배송 주소
    delivery_memo TEXT,                       -- 배송 메모

    -- 배송 일시
    shipped_at TIMESTAMPTZ,                   -- 발송 일시
    delivered_at TIMESTAMPTZ,                 -- 배송 완료 일시

    -- 관리자 메모
    admin_memo TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_item_id ON shipments(order_item_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_shipping_status ON shipments(shipping_status);

COMMENT ON TABLE shipments IS '실물 상품 배송 정보 (order_items와 1:1 관계)';
COMMENT ON COLUMN shipments.carrier IS '택배사 (CJ대한통운, 우체국택배, 롯데택배 등)';
COMMENT ON COLUMN shipments.tracking_number IS '운송장 번호';
COMMENT ON COLUMN shipments.shipping_status IS '배송 상태 (PREPARING, SHIPPED, IN_TRANSIT, DELIVERED)';

-- =====================================================
-- 3. 신규 테이블: product_bundles (세트 상품 구성품)
-- =====================================================

CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT product_bundles_unique UNIQUE (bundle_product_id, component_product_id),
    CONSTRAINT product_bundles_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_product_bundles_bundle_id ON product_bundles(bundle_product_id);
CREATE INDEX IF NOT EXISTS idx_product_bundles_component_id ON product_bundles(component_product_id);

COMMENT ON TABLE product_bundles IS '세트 상품(BUNDLE)의 구성품 정의';
COMMENT ON COLUMN product_bundles.bundle_product_id IS '세트 상품 ID (type=BUNDLE)';
COMMENT ON COLUMN product_bundles.component_product_id IS '구성품 상품 ID (DIGITAL 또는 PHYSICAL)';
COMMENT ON COLUMN product_bundles.quantity IS '구성품 수량';

-- =====================================================
-- 4. 기존 테이블 수정: order_items
-- =====================================================

-- item_status 컬럼 추가 (개별 주문 상품 상태)
DO $$ BEGIN
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_status order_item_status NOT NULL DEFAULT 'PENDING';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_item_status ON order_items(item_status);

COMMENT ON COLUMN order_items.item_status IS '개별 주문 상품 상태 (PENDING, PROCESSING, READY, SHIPPED, DELIVERED, COMPLETED)';

-- =====================================================
-- 5. 기존 테이블 수정: orders (shipping 필드 nullable)
-- =====================================================

-- 디지털 상품 전용 주문을 위해 배송 정보 필드를 nullable로 변경
-- Note: 기존 데이터에 NOT NULL 제약조건이 있는 경우 데이터 검증 후 실행
DO $$ BEGIN
  ALTER TABLE orders ALTER COLUMN shipping_name DROP NOT NULL;
  ALTER TABLE orders ALTER COLUMN shipping_phone DROP NOT NULL;
  ALTER TABLE orders ALTER COLUMN shipping_address DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- =====================================================
-- 6. Triggers
-- =====================================================

-- shipments updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. 데이터 마이그레이션 (기존 주문)
-- =====================================================

-- 기존 order_items의 item_status 초기화
-- orders.status 기반으로 item_status 설정
UPDATE order_items
SET item_status = CASE
  WHEN (SELECT status FROM orders WHERE id = order_items.order_id) = 'PENDING' THEN 'PENDING'::order_item_status
  WHEN (SELECT status FROM orders WHERE id = order_items.order_id) = 'PAID' THEN 'READY'::order_item_status
  WHEN (SELECT status FROM orders WHERE id = order_items.order_id) IN ('MAKING', 'SHIPPING') THEN 'PROCESSING'::order_item_status
  WHEN (SELECT status FROM orders WHERE id = order_items.order_id) = 'DONE' THEN 'COMPLETED'::order_item_status
  ELSE 'PENDING'::order_item_status
END
WHERE item_status = 'PENDING'; -- 기본값인 경우만 업데이트

-- =====================================================
-- 8. 선택사항: order_notifications (알림톡 준비)
-- =====================================================
-- Phase 3에서 구현 예정, 주석 처리

/*
CREATE TABLE IF NOT EXISTS order_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'ORDER_CREATED', 'PAYMENT_CONFIRMED', 'SHIPPED', etc.
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_notifications_order_id ON order_notifications(order_id);
CREATE INDEX idx_order_notifications_status ON order_notifications(status);

COMMENT ON TABLE order_notifications IS '주문 알림톡 발송 기록 (카카오 알림톡)';
*/

-- =====================================================
-- 마이그레이션 완료
-- =====================================================

-- 마이그레이션 성공 로그
DO $$ BEGIN
  RAISE NOTICE 'Order System V2 Migration completed successfully';
END $$;
