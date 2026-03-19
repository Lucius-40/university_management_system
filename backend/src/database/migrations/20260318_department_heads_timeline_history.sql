-- Convert department_heads into a timeline history table.
-- Current department head = row with end_date IS NULL.

ALTER TABLE department_heads
ADD COLUMN IF NOT EXISTS id INTEGER,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Fill missing identity values safely.
CREATE SEQUENCE IF NOT EXISTS department_heads_id_seq;

ALTER TABLE department_heads
ALTER COLUMN id SET DEFAULT nextval('department_heads_id_seq');

UPDATE department_heads
SET id = nextval('department_heads_id_seq')
WHERE id IS NULL;

-- Remove legacy composite primary key if it exists.
ALTER TABLE department_heads
DROP CONSTRAINT IF EXISTS dept_head_pk;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'department_heads_pkey'
    ) THEN
        ALTER TABLE department_heads
        ADD CONSTRAINT department_heads_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Existing rows become current if end date was unknown.
UPDATE department_heads
SET start_date = CURRENT_DATE
WHERE start_date IS NULL;

ALTER TABLE department_heads
ALTER COLUMN start_date SET NOT NULL;

ALTER TABLE department_heads
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS teacher;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'department_heads_date_window_chk'
    ) THEN
        ALTER TABLE department_heads
        ADD CONSTRAINT department_heads_date_window_chk
        CHECK (end_date IS NULL OR end_date >= start_date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_department_heads_department_dates
    ON department_heads (department_id, start_date DESC, end_date DESC);

-- Exactly one active head max per department.
CREATE UNIQUE INDEX IF NOT EXISTS uq_department_heads_current_per_department
    ON department_heads (department_id)
    WHERE end_date IS NULL;

-- Optional compatibility backfill from deprecated departments.department_head_id.
INSERT INTO department_heads (department_id, teacher_id, start_date, end_date)
SELECT
    d.id,
    d.department_head_id,
    CURRENT_DATE,
    NULL
FROM departments d
WHERE d.department_head_id IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM teachers t
      WHERE t.user_id = d.department_head_id
        AND t.department_id = d.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM department_heads dh
      WHERE dh.department_id = d.id
        AND dh.end_date IS NULL
  );
