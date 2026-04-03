-- Add department-level graduation credit policy.
-- This supports credit-based graduation checks in session-end progression.

ALTER TABLE departments
ADD COLUMN IF NOT EXISTS required_total_credits DECIMAL(5, 1) NOT NULL DEFAULT 160.0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'departments_required_total_credits_positive_chk'
    ) THEN
        ALTER TABLE departments
        ADD CONSTRAINT departments_required_total_credits_positive_chk
        CHECK (required_total_credits > 0);
    END IF;
END
$$;