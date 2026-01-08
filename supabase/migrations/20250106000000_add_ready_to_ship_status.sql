-- Add READY_TO_SHIP status to order_status ENUM
-- Created: 2025-01-06
-- Description: MAKING과 SHIPPING 사이에 출고중(READY_TO_SHIP) 상태 추가
-- Order: PENDING → PAID → MAKING → READY_TO_SHIP → SHIPPING → DONE

-- =====================================================
-- 1. ENUM 타입에 READY_TO_SHIP 추가
-- =====================================================

-- Note: PostgreSQL에서 ENUM에 값 추가는 트랜잭션 외부에서 실행되어야 함
-- BEFORE/AFTER를 사용하여 순서를 지정할 수 있음
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'READY_TO_SHIP' AFTER 'MAKING';

-- =====================================================
-- 마이그레이션 완료
-- =====================================================

-- 마이그레이션 성공 로그
DO $$ BEGIN
  RAISE NOTICE 'READY_TO_SHIP status added to order_status ENUM successfully';
END $$;
