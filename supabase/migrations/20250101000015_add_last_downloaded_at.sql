/**
 * Migration: Add last_downloaded_at to order_items
 *
 * 다운로드 추적을 위한 마지막 다운로드 시간 컬럼 추가
 */

-- order_items 테이블에 last_downloaded_at 컬럼 추가
ALTER TABLE order_items
  ADD COLUMN last_downloaded_at TIMESTAMPTZ;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN order_items.last_downloaded_at IS '마지막 다운로드 시간';
