-- Update email_verifications table for signup flow v2
-- Adds support for 6-digit code verification and password hashing

-- Add new columns
ALTER TABLE email_verifications
ADD COLUMN IF NOT EXISTS code VARCHAR(6),
ADD COLUMN IF NOT EXISTS hashed_password TEXT,
ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(code);

-- Add comment explaining the table
COMMENT ON TABLE email_verifications IS 'Email verification records with support for both code and link verification';
COMMENT ON COLUMN email_verifications.code IS '6-digit numeric verification code';
COMMENT ON COLUMN email_verifications.token IS 'UUID token for link-based verification';
COMMENT ON COLUMN email_verifications.hashed_password IS 'Bcrypt hashed password stored temporarily during signup';
COMMENT ON COLUMN email_verifications.attempts IS 'Number of failed verification attempts (max 5)';
COMMENT ON COLUMN email_verifications.purpose IS 'Verification purpose: signup or reset-password';

-- Create function to increment verification attempts
CREATE OR REPLACE FUNCTION increment_verification_attempts(p_email VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE email_verifications
  SET attempts = attempts + 1
  WHERE email = p_email
    AND purpose = 'signup'
    AND verified_at IS NULL;
END;
$$ LANGUAGE plpgsql;
