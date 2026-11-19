-- ==========================================
-- CONCURRENCY-SAFE ALLOCATION VALIDATION
-- ==========================================

CREATE OR REPLACE FUNCTION validate_classroom_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_capacity INTEGER;
    v_strength INTEGER;
    v_faculty_id INTEGER;
    v_start TIME;
    v_end TIME;
BEGIN
    -- Serialize allocation inserts and updates.
    -- The lock remains held until the transaction commits or rolls back.
    PERFORM pg_advisory_xact_lock(20261115, 1);

    -- Get course offering details
    SELECT expected_strength, faculty_id
    INTO v_strength, v_faculty_id
    FROM course_offerings
    WHERE offering_id = NEW.offering_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course offering does not exist';
    END IF;

    -- Get classroom capacity
    SELECT capacity
    INTO v_capacity
    FROM classrooms
    WHERE room_id = NEW.room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Classroom does not exist';
    END IF;

    -- Validate classroom capacity
    IF v_strength > v_capacity THEN
        RAISE EXCEPTION
            'Insufficient classroom capacity. Required: %, Available: %',
            v_strength, v_capacity;
    END IF;

    -- Get selected time slot
    SELECT start_time, end_time
    INTO v_start, v_end
    FROM time_slots
    WHERE slot_id = NEW.slot_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Time slot does not exist';
    END IF;

    -- Validate required classroom facilities
    IF EXISTS (
        SELECT 1
        FROM offering_required_facilities rf
        LEFT JOIN classroom_facilities cf
            ON cf.facility_id = rf.facility_id
            AND cf.room_id = NEW.room_id
        WHERE rf.offering_id = NEW.offering_id
          AND cf.room_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Classroom does not have all facilities required by this course';
    END IF;

    -- Prevent overlapping allocations in the same classroom
    IF EXISTS (
        SELECT 1
        FROM allocations a
        JOIN time_slots ts ON ts.slot_id = a.slot_id
        WHERE a.room_id = NEW.room_id
          AND a.day_of_week = NEW.day_of_week
          AND a.allocation_id <> COALESCE(NEW.allocation_id, -1)
          AND ts.start_time < v_end
          AND ts.end_time > v_start
    ) THEN
        RAISE EXCEPTION
            'Classroom is already allocated during this time';
    END IF;

    -- Prevent overlapping classes for the same faculty member
    IF EXISTS (
        SELECT 1
        FROM allocations a
        JOIN course_offerings co
            ON co.offering_id = a.offering_id
        JOIN time_slots ts
            ON ts.slot_id = a.slot_id
        WHERE co.faculty_id = v_faculty_id
          AND a.day_of_week = NEW.day_of_week
          AND a.allocation_id <> COALESCE(NEW.allocation_id, -1)
          AND ts.start_time < v_end
          AND ts.end_time > v_start
    ) THEN
        RAISE EXCEPTION
            'Faculty member already has a class during this time';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Attach validation trigger to allocations
DROP TRIGGER IF EXISTS trg_validate_classroom_allocation
ON allocations;

CREATE TRIGGER trg_validate_classroom_allocation
BEFORE INSERT OR UPDATE ON allocations
FOR EACH ROW
EXECUTE FUNCTION validate_classroom_allocation();
