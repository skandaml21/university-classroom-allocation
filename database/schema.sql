
-- ==========================================
-- UNIVERSITY CLASSROOM ALLOCATION SYSTEM
-- PostgreSQL Database Schema
-- ==========================================

-- 1. DEPARTMENTS
CREATE TABLE departments (
    department_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL
);

-- 2. USERS
CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('ADMIN', 'FACULTY'))
);

-- 3. FACULTY
CREATE TABLE faculty (
    faculty_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id),
    department_id INT NOT NULL REFERENCES departments(department_id)
);

-- 4. CLASSROOMS
CREATE TABLE classrooms (
    room_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL,
    building VARCHAR(100) NOT NULL,
    floor INT NOT NULL CHECK (floor >= 0),
    capacity INT NOT NULL CHECK (capacity > 0),
    UNIQUE (building, room_number)
);

-- 5. FACILITIES
CREATE TABLE facilities (
    facility_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    facility_name VARCHAR(100) UNIQUE NOT NULL
);

-- 6. CLASSROOM FACILITIES
CREATE TABLE classroom_facilities (
    room_id INT REFERENCES classrooms(room_id) ON DELETE CASCADE,
    facility_id INT REFERENCES facilities(facility_id),
    PRIMARY KEY (room_id, facility_id)
);

-- 7. COURSES
CREATE TABLE courses (
    course_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    department_id INT NOT NULL REFERENCES departments(department_id)
);

-- 8. COURSE OFFERINGS
CREATE TABLE course_offerings (
    offering_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id),
    faculty_id INT NOT NULL REFERENCES faculty(faculty_id),
    expected_strength INT NOT NULL CHECK (expected_strength > 0),
    semester VARCHAR(30) NOT NULL,
    academic_year VARCHAR(20) NOT NULL
);

-- 9. REQUIRED FACILITIES FOR COURSE OFFERINGS
CREATE TABLE offering_required_facilities (
    offering_id INT REFERENCES course_offerings(offering_id) ON DELETE CASCADE,
    facility_id INT REFERENCES facilities(facility_id),
    PRIMARY KEY (offering_id, facility_id)
);

-- 10. TIME SLOTS
CREATE TABLE time_slots (
    slot_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (end_time > start_time),
    UNIQUE (start_time, end_time)
);

-- 11. ALLOCATIONS
CREATE TABLE allocations (
    allocation_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    offering_id INT NOT NULL REFERENCES course_offerings(offering_id),
    room_id INT NOT NULL REFERENCES classrooms(room_id),
    slot_id INT NOT NULL REFERENCES time_slots(slot_id),
    day_of_week VARCHAR(15) NOT NULL
        CHECK (day_of_week IN (
            'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'
        )),
    allocation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (room_id, slot_id, day_of_week),
    UNIQUE (offering_id, slot_id, day_of_week)
);
