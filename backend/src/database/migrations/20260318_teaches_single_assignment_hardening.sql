-- Harden teaches for single-assignment workflow.
-- Business rule: one teacher per (course_offering_id, section_name).

UPDATE teaches
SET section_name = BTRIM(section_name)
WHERE section_name IS NOT NULL;

DELETE FROM teaches
WHERE course_offering_id IS NULL
   OR teacher_id IS NULL
   OR section_name IS NULL
   OR section_name = '';

-- Remove duplicate rows while preserving one record per offering+section.
DELETE FROM teaches a
USING teaches b
WHERE a.course_offering_id = b.course_offering_id
  AND a.section_name = b.section_name
  AND a.ctid < b.ctid;

ALTER TABLE teaches
    ALTER COLUMN course_offering_id SET NOT NULL,
    ALTER COLUMN teacher_id SET NOT NULL,
    ALTER COLUMN section_name SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teaches_section_name_not_blank_chk'
    ) THEN
        ALTER TABLE teaches
        ADD CONSTRAINT teaches_section_name_not_blank_chk
        CHECK (BTRIM(section_name) <> '');
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_teaches_offering_section
    ON teaches (course_offering_id, section_name);

CREATE INDEX IF NOT EXISTS idx_teaches_teacher
    ON teaches (teacher_id);
