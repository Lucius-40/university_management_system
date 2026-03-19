-- Normalize student_sections for no-history assignment semantics.
-- One student can have only one current section mapping.

DELETE FROM student_sections a
USING student_sections b
WHERE a.student_id = b.student_id
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_sections_student
    ON student_sections (student_id);

CREATE INDEX IF NOT EXISTS idx_student_sections_section_name
    ON student_sections (section_name);
