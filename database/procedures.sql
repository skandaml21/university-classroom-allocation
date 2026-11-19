-- ==========================================
-- STORED PROCEDURES
-- University Classroom Allocation System
-- ==========================================

CREATE OR REPLACE PROCEDURE allocate_classroom(
    IN p_offering_id INTEGER,
    IN p_room_id INTEGER,
    IN p_slot_id INTEGER,
    IN p_day_of_week VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO allocations (
        offering_id,
        room_id,
        slot_id,
        day_of_week
    )
    VALUES (
        p_offering_id,
        p_room_id,
        p_slot_id,
        p_day_of_week
    );

    RAISE NOTICE 'Classroom allocation created successfully.';
END;
$$;
