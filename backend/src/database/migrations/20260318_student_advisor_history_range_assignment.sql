-- Tighten student_advisor_history for timeline-safe range assignments.

UPDATE student_advisor_history
SET start_date = CURRENT_DATE
WHERE start_date IS NULL;

ALTER TABLE student_advisor_history
ALTER COLUMN start_date SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'student_advisor_history_date_window_chk'
    ) THEN
        ALTER TABLE student_advisor_history
        ADD CONSTRAINT student_advisor_history_date_window_chk
        CHECK (end_date IS NULL OR end_date >= start_date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_advisor_history_student_dates
    ON student_advisor_history (student_id, start_date DESC, end_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_advisor_history_teacher_dates
    ON student_advisor_history (teacher_id, start_date DESC, end_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_advisor_history_current_per_student
    ON student_advisor_history (student_id)
    WHERE end_date IS NULL;
