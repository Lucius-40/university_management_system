-- Phase 1 migration: course offering sets and optional pool (no new tables)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'course_offerings'
          AND column_name = 'set_name'
    ) THEN
        ALTER TABLE course_offerings
        ADD COLUMN set_name VARCHAR(255) NOT NULL DEFAULT 'Default Set';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'course_offerings'
          AND column_name = 'is_optional'
    ) THEN
        ALTER TABLE course_offerings
        ADD COLUMN is_optional BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'course_offerings'
          AND column_name = 'optional_group'
    ) THEN
        ALTER TABLE course_offerings
        ADD COLUMN optional_group VARCHAR(100);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'course_offerings'
          AND column_name = 'set_max_optional_courses'
    ) THEN
        ALTER TABLE course_offerings
        ADD COLUMN set_max_optional_courses INT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'course_offerings'
          AND column_name = 'set_max_optional_credits'
    ) THEN
        ALTER TABLE course_offerings
        ADD COLUMN set_max_optional_credits DECIMAL(5, 2);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'course_offerings'
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE course_offerings
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

ALTER TABLE course_offerings
ALTER COLUMN set_name SET DEFAULT 'Default Set',
ALTER COLUMN is_optional SET DEFAULT FALSE,
ALTER COLUMN is_active SET DEFAULT TRUE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'course_offerings_optional_courses_nonnegative_chk'
    ) THEN
        ALTER TABLE course_offerings
        ADD CONSTRAINT course_offerings_optional_courses_nonnegative_chk
        CHECK (set_max_optional_courses IS NULL OR set_max_optional_courses >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'course_offerings_optional_credits_nonnegative_chk'
    ) THEN
        ALTER TABLE course_offerings
        ADD CONSTRAINT course_offerings_optional_credits_nonnegative_chk
        CHECK (set_max_optional_credits IS NULL OR set_max_optional_credits >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'course_offerings_set_course_unique'
    ) THEN
        ALTER TABLE course_offerings
        ADD CONSTRAINT course_offerings_set_course_unique UNIQUE (term_id, set_name, course_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_offerings_term_set_active
    ON course_offerings (term_id, set_name, is_active);

CREATE INDEX IF NOT EXISTS idx_course_offerings_term_optional
    ON course_offerings (term_id, is_optional);

UPDATE course_offerings
SET set_name = COALESCE(NULLIF(TRIM(set_name), ''), 'Default Set'),
    is_optional = COALESCE(is_optional, FALSE),
    is_active = COALESCE(is_active, TRUE)
WHERE set_name IS NULL
   OR TRIM(set_name) = ''
   OR is_optional IS NULL
   OR is_active IS NULL;
