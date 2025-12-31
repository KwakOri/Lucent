-- Add buyer information fields to orders table
-- 주문자 정보 필드 추가 (주문 시점의 정보를 스냅샷으로 저장)

ALTER TABLE orders
ADD COLUMN buyer_name VARCHAR(100),
ADD COLUMN buyer_email VARCHAR(255),
ADD COLUMN buyer_phone VARCHAR(20);

-- Add comments
COMMENT ON COLUMN orders.buyer_name IS '주문자 이름 (주문 시점)';
COMMENT ON COLUMN orders.buyer_email IS '주문자 이메일 (주문 시점)';
COMMENT ON COLUMN orders.buyer_phone IS '주문자 연락처 (주문 시점)';
