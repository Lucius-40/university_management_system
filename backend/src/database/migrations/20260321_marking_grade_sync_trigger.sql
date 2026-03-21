-- Keep student_enrollments.grade synchronized with published marking_components.

CREATE OR REPLACE FUNCTION refresh_enrollment_grade_from_markings(p_enrollment_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_student_id INT;
    v_term_id INT;
    v_grade VARCHAR;
BEGIN
    SELECT se.student_id, co.term_id
    INTO v_student_id, v_term_id
    FROM student_enrollments se
    JOIN course_offerings co ON co.id = se.course_offering_id
    WHERE se.id = p_enrollment_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT csr.grade
    INTO v_grade
    FROM compile_student_term_result(v_student_id, v_term_id) csr
    WHERE csr.enrollment_id = p_enrollment_id
    LIMIT 1;

    UPDATE student_enrollments
    SET grade = v_grade
    WHERE id = p_enrollment_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_sync_enrollment_grade_from_markings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.enrollment_id IS DISTINCT FROM NEW.enrollment_id THEN
        PERFORM refresh_enrollment_grade_from_markings(OLD.enrollment_id);
    END IF;

    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_enrollment_grade_from_markings(OLD.enrollment_id);
        RETURN OLD;
    END IF;

    PERFORM refresh_enrollment_grade_from_markings(NEW.enrollment_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_enrollment_grade_from_markings_trg ON marking_components;

CREATE TRIGGER sync_enrollment_grade_from_markings_trg
AFTER INSERT OR UPDATE OR DELETE ON marking_components
FOR EACH ROW
EXECUTE FUNCTION trg_sync_enrollment_grade_from_markings();

-- Backfill grades for existing enrollments so current data matches derived results.
DO $$
DECLARE
    row_record RECORD;
BEGIN
    FOR row_record IN
        SELECT se.id
        FROM student_enrollments se
    LOOP
        PERFORM refresh_enrollment_grade_from_markings(row_record.id);
    END LOOP;
END;
$$;
