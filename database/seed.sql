
-- ==========================================
-- UNIVERSITY CLASSROOM ALLOCATION SYSTEM
-- SAMPLE DATA
-- ==========================================

-- 1. DEPARTMENTS
INSERT INTO departments (department_name)
VALUES
('Computer Science'),
('Electronics'),
('Mathematics');

-- 2. USERS
-- Demo password for all accounts: DemoPass123!

INSERT INTO users (name, email, password_hash, role)
VALUES
('System Administrator', 'admin@university.edu',
 '$2b$10$uS0RlgCLtEzd6mNgmsDVFOqh/Dvj7FHvXXAJ23Dkr2OSEZVP8orCq', 'ADMIN'),

('Dr. Rahul Sharma', 'rahul@university.edu',
 '$2b$10$uS0RlgCLtEzd6mNgmsDVFOqh/Dvj7FHvXXAJ23Dkr2OSEZVP8orCq', 'FACULTY'),

('Dr. Priya Nair', 'priya@university.edu',
 '$2b$10$uS0RlgCLtEzd6mNgmsDVFOqh/Dvj7FHvXXAJ23Dkr2OSEZVP8orCq', 'FACULTY');

-- 3. FACULTY
INSERT INTO faculty (user_id, department_id)
SELECT u.user_id, d.department_id
FROM users u
JOIN departments d
    ON d.department_name = 'Computer Science'
WHERE u.email = 'rahul@university.edu';

INSERT INTO faculty (user_id, department_id)
SELECT u.user_id, d.department_id
FROM users u
JOIN departments d
    ON d.department_name = 'Electronics'
WHERE u.email = 'priya@university.edu';

-- 4. CLASSROOMS
INSERT INTO classrooms
(room_number, building, floor, capacity)
VALUES
('A101', 'Academic Block A', 1, 40),
('A102', 'Academic Block A', 1, 70),
('A103', 'Academic Block A', 1, 100),
('B201', 'Academic Block B', 2, 80),
('B202', 'Academic Block B', 2, 60);

-- 5. FACILITIES
INSERT INTO facilities (facility_name)
VALUES
('Projector'),
('Whiteboard'),
('Smart Board'),
('Air Conditioning');

-- 6. CLASSROOM FACILITIES
INSERT INTO classroom_facilities (room_id, facility_id)
SELECT r.room_id, f.facility_id
FROM classrooms r
CROSS JOIN facilities f
WHERE
    (r.room_number = 'A101'
        AND f.facility_name IN ('Whiteboard'))
 OR (r.room_number = 'A102'
        AND f.facility_name IN ('Projector', 'Whiteboard'))
 OR (r.room_number = 'A103'
        AND f.facility_name IN ('Projector', 'Whiteboard',
                                'Air Conditioning'))
 OR (r.room_number = 'B201'
        AND f.facility_name IN ('Projector', 'Whiteboard',
                                'Smart Board'))
 OR (r.room_number = 'B202'
        AND f.facility_name IN ('Projector', 'Whiteboard'));

-- 7. COURSES
INSERT INTO courses
(course_name, course_code, department_id)
SELECT v.course_name, v.course_code, d.department_id
FROM (VALUES
    ('Database Management Systems', 'CS301', 'Computer Science'),
    ('Machine Learning', 'CS302', 'Computer Science'),
    ('Digital Electronics', 'EC301', 'Electronics'),
    ('Engineering Mathematics', 'MA301', 'Mathematics')
) AS v(course_name, course_code, department_name)
JOIN departments d
    ON d.department_name = v.department_name;

-- 8. COURSE OFFERINGS
INSERT INTO course_offerings
(course_id, faculty_id, expected_strength, semester, academic_year)
SELECT c.course_id, f.faculty_id,
       v.expected_strength, 'Semester 5', '2026-2027'
FROM (VALUES
    ('CS301', 'rahul@university.edu', 65),
    ('CS302', 'rahul@university.edu', 45),
    ('EC301', 'priya@university.edu', 75),
    ('MA301', 'priya@university.edu', 55)
) AS v(course_code, faculty_email, expected_strength)
JOIN courses c
    ON c.course_code = v.course_code
JOIN faculty f
    ON f.user_id = (
        SELECT u.user_id
        FROM users u
        WHERE u.email = v.faculty_email
    );

-- 9. REQUIRED FACILITIES
INSERT INTO offering_required_facilities
(offering_id, facility_id)
SELECT co.offering_id, f.facility_id
FROM course_offerings co
JOIN courses c ON c.course_id = co.course_id
JOIN facilities f ON
    (c.course_code IN ('CS301', 'CS302', 'EC301')
        AND f.facility_name = 'Projector')
    OR
    (c.course_code = 'MA301'
        AND f.facility_name = 'Whiteboard');

-- 10. TIME SLOTS
INSERT INTO time_slots (start_time, end_time)
VALUES
('09:00', '10:00'),
('10:00', '11:00'),
('11:00', '12:00'),
('12:00', '13:00'),
('14:00', '15:00'),
('15:00', '16:00');

