
-- ==========================================
-- ADVANCED DATABASE FEATURES
-- University Classroom Allocation System
-- ==========================================

-- 1. Indexes for faster queries

CREATE INDEX IF NOT EXISTS idx_allocations_room_day_slot
ON allocations(room_id, day_of_week, slot_id);

CREATE INDEX IF NOT EXISTS idx_allocations_offering
ON allocations(offering_id);

CREATE INDEX IF NOT EXISTS idx_allocations_slot
ON allocations(slot_id);

CREATE INDEX IF NOT EXISTS idx_course_offerings_faculty
ON course_offerings(faculty_id);

CREATE INDEX IF NOT EXISTS idx_courses_department
ON courses(department_id);

CREATE INDEX IF NOT EXISTS idx_classrooms_capacity
ON classrooms(capacity);


-- 2. View: Classroom timetable

CREATE OR REPLACE VIEW classroom_timetable AS
SELECT
    a.allocation_id,
    a.day_of_week,
    c.course_code,
    c.course_name,
    u.name AS faculty_name,
    cr.room_number,
    cr.building,
    cr.capacity,
    co.expected_strength,
    ts.start_time,
    ts.end_time
FROM allocations a
JOIN course_offerings co ON a.offering_id = co.offering_id
JOIN courses c ON co.course_id = c.course_id
JOIN faculty f ON co.faculty_id = f.faculty_id
JOIN users u ON f.user_id = u.user_id
JOIN classrooms cr ON a.room_id = cr.room_id
JOIN time_slots ts ON a.slot_id = ts.slot_id;


-- 3. View: Classroom utilization

CREATE OR REPLACE VIEW classroom_utilization AS
SELECT
    cr.room_id,
    cr.room_number,
    cr.building,
    cr.capacity,
    COUNT(a.allocation_id) AS total_allocations,
    COALESCE(
        ROUND(
            AVG(
                100.0 * co.expected_strength / NULLIF(cr.capacity, 0)
            ), 2
        ), 0
    ) AS average_utilization_percentage
FROM classrooms cr
LEFT JOIN allocations a ON cr.room_id = a.room_id
LEFT JOIN course_offerings co ON a.offering_id = co.offering_id
GROUP BY cr.room_id, cr.room_number, cr.building, cr.capacity;

