-- ================================================
-- Logs Table
-- ================================================
-- 목적: 중요한 시스템 이벤트 기록 (보안, 주문, 인증, 다운로드 등)
-- RLS: 미적용 (관리자만 애플리케이션 레벨에서 접근)
-- 작성일: 2025-12-30
-- ================================================

-- logs 테이블 생성
CREATE TABLE IF NOT EXISTS logs (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 이벤트 정보
  event_type VARCHAR(100) NOT NULL,           -- 'user.login.success', 'order.created' 등
  event_category VARCHAR(50) NOT NULL,        -- 'auth', 'order', 'product', 'security' 등
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'

  -- 주체 정보
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- 대상 정보
  resource_type VARCHAR(50),                  -- 'order', 'product', 'image' 등
  resource_id UUID,                           -- order_id, product_id 등

  -- 상세 정보
  message TEXT NOT NULL,                      -- 사람이 읽을 수 있는 메시지
  metadata JSONB,                             -- 추가 데이터 (유연성)

  -- 요청 정보
  ip_address INET,                            -- IP 주소
  user_agent TEXT,                            -- User-Agent 헤더
  request_path TEXT,                          -- API 경로

  -- 변경 사항
  changes JSONB,                              -- before/after 값 저장

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 인덱스
-- ================================================

-- 이벤트 타입별 조회 (빈번한 필터링)
CREATE INDEX IF NOT EXISTS idx_logs_event_type ON logs(event_type);

-- 이벤트 카테고리별 조회
CREATE INDEX IF NOT EXISTS idx_logs_event_category ON logs(event_category);

-- 심각도별 조회 (경고/에러 필터링)
CREATE INDEX IF NOT EXISTS idx_logs_severity ON logs(severity);

-- 사용자별 로그 조회
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);

-- 관리자 작업 로그 조회
CREATE INDEX IF NOT EXISTS idx_logs_admin_id ON logs(admin_id);

-- 시간순 정렬 (가장 빈번한 정렬 기준)
CREATE INDEX IF NOT EXISTS idx_logs_created_at_desc ON logs(created_at DESC);

-- 리소스별 로그 조회 (특정 주문/상품의 이력 추적)
CREATE INDEX IF NOT EXISTS idx_logs_resource ON logs(resource_type, resource_id);

-- 복합 인덱스: 카테고리 + 시간 (대시보드 통계용)
CREATE INDEX IF NOT EXISTS idx_logs_category_created_at ON logs(event_category, created_at DESC);

-- 복합 인덱스: 심각도 + 시간 (보안 모니터링용)
CREATE INDEX IF NOT EXISTS idx_logs_severity_created_at ON logs(severity, created_at DESC);

-- ================================================
-- 코멘트
-- ================================================

COMMENT ON TABLE logs IS '시스템 이벤트 로그 (인증, 주문, 보안, 다운로드 등)';
COMMENT ON COLUMN logs.event_type IS '이벤트 타입 (예: user.login.success)';
COMMENT ON COLUMN logs.event_category IS '이벤트 카테고리 (예: auth, order, security)';
COMMENT ON COLUMN logs.severity IS '심각도 (info, warning, error, critical)';
COMMENT ON COLUMN logs.user_id IS '이벤트 발생 사용자 (nullable)';
COMMENT ON COLUMN logs.admin_id IS '관리자 작업인 경우 관리자 ID (nullable)';
COMMENT ON COLUMN logs.resource_type IS '대상 리소스 타입 (order, product 등)';
COMMENT ON COLUMN logs.resource_id IS '대상 리소스 ID';
COMMENT ON COLUMN logs.message IS '사람이 읽을 수 있는 메시지';
COMMENT ON COLUMN logs.metadata IS '추가 정보 (JSON)';
COMMENT ON COLUMN logs.ip_address IS 'IP 주소';
COMMENT ON COLUMN logs.user_agent IS 'User-Agent';
COMMENT ON COLUMN logs.request_path IS 'API 요청 경로';
COMMENT ON COLUMN logs.changes IS '변경 전후 값 (JSON)';
COMMENT ON COLUMN logs.created_at IS '로그 생성 시각';

-- ================================================
-- 샘플 데이터 (테스트용 - 선택적)
-- ================================================

-- 샘플 로그: 로그인 성공
-- INSERT INTO logs (event_type, event_category, severity, message, metadata, ip_address)
-- VALUES (
--   'user.login.success',
--   'auth',
--   'info',
--   '사용자 로그인 성공',
--   '{"browser": "Chrome", "os": "Windows"}'::jsonb,
--   '127.0.0.1'
-- );

-- 샘플 로그: 주문 생성
-- INSERT INTO logs (event_type, event_category, severity, resource_type, resource_id, message, metadata)
-- VALUES (
--   'order.created',
--   'order',
--   'info',
--   'order',
--   uuid_generate_v4(),
--   '새로운 주문이 생성되었습니다',
--   '{"total_amount": 15000, "product_count": 2}'::jsonb
-- );

-- 샘플 로그: 보안 경고
-- INSERT INTO logs (event_type, event_category, severity, message, ip_address)
-- VALUES (
--   'security.unauthorized.access',
--   'security',
--   'warning',
--   '권한 없는 API 접근 시도',
--   '192.168.1.100'
-- );
