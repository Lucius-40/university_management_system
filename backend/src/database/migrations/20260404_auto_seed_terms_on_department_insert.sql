CREATE OR REPLACE FUNCTION trg_seed_terms_for_new_department()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_term_start DATE;
    v_term_end DATE;
BEGIN
    IF to_regclass('public.current_state') IS NOT NULL THEN
        SELECT cs.term_start, cs.term_end
        INTO v_term_start, v_term_end
        FROM current_state cs
        WHERE cs.id = 1
        LIMIT 1;
    END IF;

    v_term_start := COALESCE(v_term_start, CURRENT_DATE);
    v_term_end := COALESCE(v_term_end, (v_term_start + INTERVAL '4 months')::date);

    INSERT INTO terms (term_number, start_date, end_date, department_id)
    SELECT
        series.term_number,
        v_term_start,
        v_term_end,
        NEW.id
    FROM generate_series(1, 8) AS series(term_number)
    ON CONFLICT (term_number, department_id, start_date) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_terms_for_new_department_trg ON departments;

CREATE TRIGGER seed_terms_for_new_department_trg
AFTER INSERT ON departments
FOR EACH ROW
EXECUTE FUNCTION trg_seed_terms_for_new_department();
