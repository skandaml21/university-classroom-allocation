# Data Dictionary — University Classroom Allocation System

**DBMS:** PostgreSQL  **Source:** `database/schema.sql`
**Related:** [Relational Schema](Relational_Schema.md) · [ER Diagram](ER_Diagram.png)

**Key legend:** PK = Primary Key · FK = Foreign Key · UK = Unique Key · NN = NOT NULL
`GENERATED ALWAYS AS IDENTITY` columns are auto-numbered by PostgreSQL; values cannot be supplied manually on insert.

**Contents:** [Tables](#tables) · [Views](#views) · [Routines](#stored-procedure-and-function) · [Trigger](#trigger) · [Indexes](#indexes)

---

## Tables

### 1. `departments`
Academic departments of the university.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| department_id | INT | PK, IDENTITY | Unique department identifier |
| department_name | VARCHAR(100) | UK, NN | Name of the department (e.g. Computer Science) |

### 2. `users`
Login accounts for everyone who uses the system.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| user_id | INT | PK, IDENTITY | Unique user identifier |
| name | VARCHAR(100) | NN | Full name of the user |
| email | VARCHAR(150) | UK, NN | Login email address |
| password_hash | TEXT | NN | Hashed password (bcrypt); the plain password is never stored |
| role | VARCHAR(20) | NN, CHECK in (`ADMIN`, `FACULTY`) | Access level of the account |

### 3. `faculty`
Faculty profile linking a user account to a department.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| faculty_id | INT | PK, IDENTITY | Unique faculty identifier |
| user_id | INT | FK → users(user_id), UK, NN | Account of this faculty member (one account ↔ at most one faculty record) |
| department_id | INT | FK → departments(department_id), NN | Department the faculty member belongs to |

### 4. `classrooms`
Physical rooms that can be allocated.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| room_id | INT | PK, IDENTITY | Unique classroom identifier |
| room_number | VARCHAR(20) | NN | Room label (e.g. A101) |
| building | VARCHAR(100) | NN | Building name (e.g. Academic Block A) |
| floor | INT | NN, CHECK `floor >= 0` | Floor number (0 = ground) |
| capacity | INT | NN, CHECK `capacity > 0` | Maximum number of students the room holds |
| *(table)* | | UK (building, room_number) | A room number is unique within a building |

### 5. `facilities`
Catalogue of equipment/amenities a room can have.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| facility_id | INT | PK, IDENTITY | Unique facility identifier |
| facility_name | VARCHAR(100) | UK, NN | Facility name (e.g. Projector, Smart Board) |

### 6. `classroom_facilities`
Associative table: which facilities each classroom provides (M:N).

| Column | Data type | Constraints | Description |
|---|---|---|---|
| room_id | INT | PK (part), FK → classrooms(room_id) ON DELETE CASCADE | Classroom |
| facility_id | INT | PK (part), FK → facilities(facility_id) | Facility available in that classroom |

Composite primary key: (room_id, facility_id). Deleting a classroom removes its facility links automatically.

### 7. `courses`
Course catalogue.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| course_id | INT | PK, IDENTITY | Unique course identifier |
| course_name | VARCHAR(150) | NN | Course title |
| course_code | VARCHAR(20) | UK, NN | Short course code (e.g. CS301) |
| department_id | INT | FK → departments(department_id), NN | Department that owns the course |

### 8. `course_offerings`
A course being taught by a faculty member in a particular semester.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| offering_id | INT | PK, IDENTITY | Unique offering identifier |
| course_id | INT | FK → courses(course_id), NN | Course being offered |
| faculty_id | INT | FK → faculty(faculty_id), NN | Faculty member teaching it |
| expected_strength | INT | NN, CHECK `expected_strength > 0` | Expected number of students; compared against room capacity |
| semester | VARCHAR(30) | NN | Semester label (e.g. Semester 5) |
| academic_year | VARCHAR(20) | NN | Academic year (e.g. 2026-2027) |

### 9. `offering_required_facilities`
Associative table: facilities a course offering needs (M:N).

| Column | Data type | Constraints | Description |
|---|---|---|---|
| offering_id | INT | PK (part), FK → course_offerings(offering_id) ON DELETE CASCADE | Course offering |
| facility_id | INT | PK (part), FK → facilities(facility_id) | Facility the offering requires |

Composite primary key: (offering_id, facility_id). Deleting an offering removes its requirements automatically.

### 10. `time_slots`
Fixed teaching periods of the day.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| slot_id | INT | PK, IDENTITY | Unique time-slot identifier |
| start_time | TIME | NN | Slot start time |
| end_time | TIME | NN, CHECK `end_time > start_time` | Slot end time |
| *(table)* | | UK (start_time, end_time) | The same slot cannot be defined twice |

### 11. `allocations`
Assignment of a course offering to a classroom, time slot and weekday.

| Column | Data type | Constraints | Description |
|---|---|---|---|
| allocation_id | INT | PK, IDENTITY | Unique allocation identifier |
| offering_id | INT | FK → course_offerings(offering_id), NN | Course offering being scheduled |
| room_id | INT | FK → classrooms(room_id), NN | Classroom assigned |
| slot_id | INT | FK → time_slots(slot_id), NN | Time slot assigned |
| day_of_week | VARCHAR(15) | NN, CHECK in (`Monday` … `Saturday`) | Weekday of the class |
| allocation_date | TIMESTAMP | DEFAULT `CURRENT_TIMESTAMP` | When the allocation was created |
| *(table)* | | UK (room_id, slot_id, day_of_week) | A room cannot be booked twice in the same slot and day |
| *(table)* | | UK (offering_id, slot_id, day_of_week) | An offering cannot be scheduled twice in the same slot and day |

---

## Views

### `classroom_timetable`
Readable timetable joining `allocations`, `course_offerings`, `courses`, `faculty`, `users`, `classrooms` and `time_slots`.

| Column | Source | Description |
|---|---|---|
| allocation_id | allocations | Allocation identifier |
| day_of_week | allocations | Weekday |
| course_code | courses | Course code |
| course_name | courses | Course title |
| faculty_name | users.name | Name of the teaching faculty member |
| room_number | classrooms | Room label |
| building | classrooms | Building name |
| capacity | classrooms | Room capacity |
| expected_strength | course_offerings | Expected students |
| start_time | time_slots | Slot start |
| end_time | time_slots | Slot end |

### `classroom_utilization`
One row per classroom (including rooms with no allocations).

| Column | Description |
|---|---|
| room_id, room_number, building, capacity | Classroom details |
| total_allocations | Number of allocations for the room (`COUNT(allocation_id)`) |
| average_utilization_percentage | Average of `100 × expected_strength / capacity` over the room's allocations, rounded to 2 decimals; 0 if none |

---

## Stored Procedure and Function

| Name | Type | Parameters | Returns | Description |
|---|---|---|---|---|
| `allocate_classroom` | PROCEDURE (plpgsql) | `p_offering_id INTEGER`, `p_room_id INTEGER`, `p_slot_id INTEGER`, `p_day_of_week VARCHAR(20)` | – | Inserts a row into `allocations`; all validation is done by the trigger below and errors propagate to the caller |
| `get_classroom_utilization` | FUNCTION (plpgsql) | `p_room_id INTEGER` | NUMERIC | Average utilization % of the given room (0 if the room has no allocations) |

---

## Trigger

| Name | Table | Timing / Event | Function | Description |
|---|---|---|---|---|
| `trg_validate_classroom_allocation` | allocations | BEFORE INSERT OR UPDATE, FOR EACH ROW | `validate_classroom_allocation()` | Rejects the row unless the offering, room and slot exist, capacity ≥ expected strength, the room has all required facilities, and neither the room nor the faculty member has an overlapping allocation on that day. Takes `pg_advisory_xact_lock(20261115, 1)` so concurrent allocations are serialised |

**Error messages raised**

| Condition | Message |
|---|---|
| Offering not found | Course offering does not exist |
| Room not found | Classroom does not exist |
| Slot not found | Time slot does not exist |
| Too small | Insufficient classroom capacity. Required: *n*, Available: *m* |
| Missing facility | Classroom does not have all facilities required by this course |
| Room clash | Classroom is already allocated during this time |
| Faculty clash | Faculty member already has a class during this time |

---

## Indexes

Primary-key and UNIQUE constraints create indexes automatically. Additional indexes:

| Index | Table | Columns | Speeds up |
|---|---|---|---|
| idx_allocations_room_day_slot | allocations | room_id, day_of_week, slot_id | Room availability and clash checks |
| idx_allocations_offering | allocations | offering_id | Lookups/joins from offerings |
| idx_allocations_slot | allocations | slot_id | Joins with time slots |
| idx_course_offerings_faculty | course_offerings | faculty_id | Faculty clash check, faculty timetable |
| idx_courses_department | courses | department_id | Listing courses by department |
| idx_classrooms_capacity | classrooms | capacity | Finding rooms by minimum capacity |

---

## Sample Data (seed)

| Table | Rows | Notes |
|---|---|---|
| departments | 3 | Computer Science, Electronics, Mathematics |
| users | 3 | 1 ADMIN, 2 FACULTY (demo password hashed with bcrypt) |
| faculty | 2 | Dr. Rahul Sharma (CS), Dr. Priya Nair (Electronics) |
| classrooms | 5 | A101–A103 (Block A), B201–B202 (Block B); capacities 40–100 |
| facilities | 4 | Projector, Whiteboard, Smart Board, Air Conditioning |
| courses | 4 | CS301, CS302, EC301, MA301 |
| course_offerings | 4 | Semester 5, 2026-2027 |
| time_slots | 6 | 09:00–13:00 and 14:00–16:00, one hour each |
| allocations | 0 | Created through the application |
