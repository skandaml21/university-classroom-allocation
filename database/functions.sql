-- ==========================================
-- CUSTOM DATABASE FUNCTIONS
-- University Classroom Allocation System
-- ==========================================

CREATE OR REPLACE FUNCTION get_classroom_utilization(
    p_room_id INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_utilization NUMERIC;
BEGIN
    SELECT
        COALESCE(
            ROUND(
                AVG(
                    100.0 * co.expected_strength /
                    NULLIF(cr.capacity, 0)
                ),
                2
            ),
            0
        )
    INTO v_utilization
    FROM classrooms cr
    LEFT JOIN allocations a
        ON a.room_id = cr.room_id
    LEFT JOIN course_offerings co
        ON co.offering_id = a.offering_id
    WHERE cr.room_id = p_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Classroom with ID % does not exist', p_room_id;
    END IF;

    RETURN v_utilization;
END;
$$;
