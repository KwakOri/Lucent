-- Unify order_items.item_status with order_status ENUM
-- Created: 2025-01-12
-- Description: 개별 상품 상태를 주문 상태와 통합 (무중단 마이그레이션 2단계)
-- Prerequisite: 프론트엔드 1단계 배포 완료 (normalizeItemStatus 함수 적용)

-- =====================================================
-- 마이그레이션 전 검증
-- =====================================================

-- 현재 item_status 값 분포 확인
DO $$
DECLARE
  legacy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM order_items
  WHERE item_status::TEXT IN ('PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED');

  RAISE NOTICE '레거시 상태값을 가진 order_items 개수: %', legacy_count;
END $$;

-- =====================================================
-- 1단계: item_status를 TEXT 타입으로 임시 변환
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'item_status를 TEXT 타입으로 임시 변환 중...';

  -- order_item_status → TEXT
  ALTER TABLE order_items
    ALTER COLUMN item_status TYPE TEXT
    USING item_status::TEXT;

  RAISE NOTICE 'item_status 타입 변경 완료: order_item_status → TEXT';
END $$;

-- =====================================================
-- 2단계: 레거시 상태값을 새 상태값으로 변환 (TEXT 타입이므로 제약 없음)
-- =====================================================

DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '레거시 상태값 변환 시작...';

  -- 레거시 상태값 → 새 상태값 매핑
  UPDATE order_items
  SET item_status = CASE
    WHEN item_status = 'PROCESSING' THEN 'MAKING'
    WHEN item_status = 'READY' THEN 'PAID'
    WHEN item_status = 'SHIPPED' THEN 'SHIPPING'
    WHEN item_status = 'DELIVERED' THEN 'SHIPPING'  -- DELIVERED는 SHIPPING으로 (DONE 직전 단계)
    WHEN item_status = 'COMPLETED' THEN 'DONE'
    ELSE item_status  -- 이미 새 상태값인 경우 그대로 유지
  END
  WHERE item_status IN ('PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '변환 완료: % 개 레코드 업데이트됨', updated_count;

  -- 변환 후 검증: 레거시 값이 남아있는지 확인
  IF EXISTS (
    SELECT 1 FROM order_items
    WHERE item_status IN ('PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED')
  ) THEN
    RAISE EXCEPTION '레거시 상태값 변환 실패: 일부 레코드가 변환되지 않았습니다';
  END IF;

  RAISE NOTICE '레거시 상태값 변환 검증 완료';
END $$;

-- =====================================================
-- 3단계: item_status를 order_status 타입으로 변환
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'item_status를 order_status 타입으로 변환 중...';

  -- DEFAULT 제거 (타입 변경 전)
  ALTER TABLE order_items
    ALTER COLUMN item_status DROP DEFAULT;

  RAISE NOTICE 'DEFAULT 제거 완료';

  -- TEXT → order_status
  ALTER TABLE order_items
    ALTER COLUMN item_status TYPE order_status
    USING item_status::order_status;

  RAISE NOTICE 'item_status 타입 변경 완료: TEXT → order_status';

  -- DEFAULT 다시 설정 (order_status 타입으로)
  ALTER TABLE order_items
    ALTER COLUMN item_status SET DEFAULT 'PENDING'::order_status;

  RAISE NOTICE 'DEFAULT 재설정 완료: PENDING';
END $$;

-- =====================================================
-- 4단계: order_item_status ENUM 타입 삭제
-- =====================================================

DO $$
BEGIN
  -- order_item_status ENUM을 사용하는 다른 컬럼이 있는지 확인
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND udt_name = 'order_item_status'
      AND table_name != 'order_items'
  ) THEN
    RAISE EXCEPTION 'order_item_status를 사용하는 다른 컬럼이 존재합니다. 삭제할 수 없습니다.';
  END IF;

  RAISE NOTICE 'order_item_status ENUM 타입 삭제 시작...';

  -- ENUM 타입 삭제
  DROP TYPE IF EXISTS order_item_status CASCADE;

  RAISE NOTICE 'order_item_status ENUM 타입 삭제 완료';
END $$;

-- =====================================================
-- 5단계: 마이그레이션 후 검증
-- =====================================================

DO $$
DECLARE
  total_items INTEGER;
  valid_statuses INTEGER;
BEGIN
  RAISE NOTICE '마이그레이션 검증 시작...';

  -- 전체 order_items 개수
  SELECT COUNT(*) INTO total_items FROM order_items;

  -- 유효한 order_status 값만 가지고 있는지 확인
  SELECT COUNT(*) INTO valid_statuses
  FROM order_items
  WHERE item_status IN ('PENDING', 'PAID', 'MAKING', 'READY_TO_SHIP', 'SHIPPING', 'DONE');

  IF total_items != valid_statuses THEN
    RAISE EXCEPTION '검증 실패: 유효하지 않은 item_status 값이 존재합니다 (전체: %, 유효: %)',
      total_items, valid_statuses;
  END IF;

  RAISE NOTICE '검증 성공: 모든 % 개 레코드가 유효한 상태값을 가지고 있습니다', total_items;
END $$;

-- =====================================================
-- 6단계: 인덱스 재생성 (선택사항)
-- =====================================================

-- 기존 인덱스가 자동으로 재생성되지만, 명시적으로 확인
DO $$
BEGIN
  -- idx_order_items_item_status 인덱스가 존재하는지 확인
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND indexname = 'idx_order_items_item_status'
  ) THEN
    -- 인덱스가 없다면 재생성
    CREATE INDEX idx_order_items_item_status ON order_items(item_status);
    RAISE NOTICE '인덱스 재생성 완료: idx_order_items_item_status';
  ELSE
    RAISE NOTICE '인덱스 이미 존재: idx_order_items_item_status';
  END IF;
END $$;

-- =====================================================
-- 7단계: 마이그레이션 결과 요약
-- =====================================================

DO $$
DECLARE
  status_distribution TEXT;
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE '마이그레이션 완료 요약';
  RAISE NOTICE '=================================================';

  -- 상태별 분포 출력
  FOR status_distribution IN
    SELECT
      item_status::TEXT || ': ' || COUNT(*)::TEXT AS distribution
    FROM order_items
    GROUP BY item_status
    ORDER BY
      CASE item_status::TEXT
        WHEN 'PENDING' THEN 1
        WHEN 'PAID' THEN 2
        WHEN 'MAKING' THEN 3
        WHEN 'READY_TO_SHIP' THEN 4
        WHEN 'SHIPPING' THEN 5
        WHEN 'DONE' THEN 6
        ELSE 99
      END
  LOOP
    RAISE NOTICE '  %', status_distribution;
  END LOOP;

  RAISE NOTICE '=================================================';
  RAISE NOTICE '개별 상품 상태가 주문 상태와 성공적으로 통합되었습니다';
  RAISE NOTICE 'item_status 타입: order_item_status → order_status';
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- 마이그레이션 완료
-- =====================================================

-- 타입 정보 업데이트 알림
DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. Supabase 타입 재생성:';
  RAISE NOTICE '   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts';
  RAISE NOTICE '';
  RAISE NOTICE '2. order.service.ts에서 "as any" 타입 캐스팅 제거';
  RAISE NOTICE '';
  RAISE NOTICE '3. 프론트엔드 재배포';
END $$;
