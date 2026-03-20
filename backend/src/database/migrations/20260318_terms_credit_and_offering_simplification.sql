-- Simplify course_offerings and move credit cap to terms

ALTER TABLE terms
ADD max_credit REAL DEFAULT 23.0;

UPDATE terms
SET max_credit = 23.0
WHERE max_credit IS NULL;

ALTER TABLE terms
ALTER COLUMN max_credit SET NOT NULL;

ALTER TABLE terms
ADD CONSTRAINT terms_max_credit_positive_chk
CHECK (max_credit > 0);

ALTER TABLE course_offerings
DROP CONSTRAINT IF EXISTS course_offerings_set_course_unique,
DROP CONSTRAINT IF EXISTS course_offerings_optional_courses_nonnegative_chk,
DROP CONSTRAINT IF EXISTS course_offerings_optional_credits_nonnegative_chk;

DROP INDEX IF EXISTS idx_course_offerings_term_set_active;

ALTER TABLE course_offerings
DROP COLUMN IF EXISTS set_name,
DROP COLUMN IF EXISTS optional_group,
DROP COLUMN IF EXISTS set_max_optional_courses,
DROP COLUMN IF EXISTS set_max_optional_credits;

CREATE INDEX IF NOT EXISTS idx_course_offerings_term_optional
    ON course_offerings (term_id, is_optional);
