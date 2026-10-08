-- Authentication hardening migration
-- Apply once to the PostgreSQL database before enabling password reset endpoints.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "resetToken" TEXT,
  ADD COLUMN IF NOT EXISTS "resetTokenExpiresAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users ("resetToken")
  WHERE "resetToken" IS NOT NULL;
