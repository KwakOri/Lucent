-- Add phone verification state and request tracking fields to profiles.
-- - is_phone_verified: public verification status
-- - phone_verification_*: internal verification code lifecycle and daily quota state

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verification_code VARCHAR(6),
  ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_verification_request_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_verification_request_date DATE;

UPDATE profiles
SET phone_verification_request_count = 0
WHERE phone_verification_request_count IS NULL;

COMMENT ON COLUMN profiles.is_phone_verified IS '휴대폰 인증 완료 여부';
COMMENT ON COLUMN profiles.phone_verification_code IS '휴대폰 인증 6자리 코드 (임시 저장)';
COMMENT ON COLUMN profiles.phone_verification_expires_at IS '휴대폰 인증 코드 만료 시각';
COMMENT ON COLUMN profiles.phone_verification_request_count IS 'KST 기준 당일 휴대폰 인증 코드 요청 횟수';
COMMENT ON COLUMN profiles.phone_verification_request_date IS '휴대폰 인증 요청 카운트 기준 날짜 (KST, YYYY-MM-DD)';
