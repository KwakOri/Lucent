/**
 * Migration: Split Address Fields
 *
 * 주소 필드를 메인 주소(검색 결과)와 상세 주소(사용자 입력)로 분리
 * - profiles.address → main_address + detail_address
 * - orders.shipping_address → shipping_main_address + shipping_detail_address
 */

-- ================================
-- 1. profiles 테이블 수정
-- ================================

-- 새로운 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN main_address TEXT,
  ADD COLUMN detail_address TEXT;

-- 기존 address 데이터를 main_address로 마이그레이션
UPDATE profiles
SET main_address = address
WHERE address IS NOT NULL;

-- 기존 address 컬럼 삭제
ALTER TABLE profiles
  DROP COLUMN address;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN profiles.main_address IS '메인 주소 (주소 검색 API로 입력된 도로명/지번 주소)';
COMMENT ON COLUMN profiles.detail_address IS '상세 주소 (사용자가 입력한 동/호수 등)';


-- ================================
-- 2. orders 테이블 수정
-- ================================

-- 새로운 컬럼 추가
ALTER TABLE orders
  ADD COLUMN shipping_main_address TEXT,
  ADD COLUMN shipping_detail_address TEXT;

-- 기존 shipping_address 데이터를 shipping_main_address로 마이그레이션
UPDATE orders
SET shipping_main_address = shipping_address
WHERE shipping_address IS NOT NULL;

-- 기존 shipping_address 컬럼 삭제
ALTER TABLE orders
  DROP COLUMN shipping_address;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN orders.shipping_main_address IS '배송 메인 주소 (주문 시점 스냅샷)';
COMMENT ON COLUMN orders.shipping_detail_address IS '배송 상세 주소 (주문 시점 스냅샷)';
