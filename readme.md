# UniSpace – University Classroom Allocation System

A database-driven web application designed to simplify and automate classroom allocation in universities. UniSpace helps administrators manage classrooms, faculty, courses, facilities, and scheduling while preventing allocation conflicts and improving classroom utilization.

---

## 📌 Project Overview

University classroom allocation is a challenging task involving multiple constraints such as classroom capacity, available facilities, faculty schedules, and time-slot availability.

**UniSpace** provides a centralized system to manage these activities efficiently. It uses PostgreSQL for structured data management, Redis for caching, and a modern web interface for interacting with the system.

The system validates classroom allocations, identifies scheduling conflicts, recommends suitable classrooms, and provides timetable and utilization information.

## 🎯 Objectives

- Automate the classroom allocation process.
- Prevent double-booking and scheduling conflicts.
- Match classroom capacity with course requirements.
- Ensure required facilities are available.
- Simplify faculty, classroom, and course management.
- Improve classroom utilization through analytics.
- Maintain data consistency using relational database constraints.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Full-stack web framework |
| React 19 | User interface |
| TypeScript | Type-safe development |
| Node.js | Backend runtime |
| PostgreSQL | Relational database |
| Redis | Caching |
| pg | PostgreSQL connectivity |
| ioredis | Redis connectivity |

## ✨ Key Features

### 1. Authentication and Role-Based Access
- User login and authentication.
- Role-based access control.
- Separate access for administrative and other user roles.

### 2. Classroom Management
- Add and manage classrooms.
- Maintain classroom capacity.
- Manage classroom facilities.
- View classroom availability.

### 3. Faculty Management
- Maintain faculty information.
- Associate faculty members with departments.
- Manage faculty-related scheduling information.

### 4. Course Management
- Manage courses and course offerings.
- Maintain course requirements.
- Associate courses with faculty members.

### 5. Automated Classroom Allocation
- Allocate classrooms to course offerings.
- Validate classroom capacity.
- Check required facilities.
- Detect scheduling conflicts.
- Prevent incompatible allocations.

### 6. Classroom Recommendations
- Suggest suitable classrooms based on course requirements.
- Consider capacity and facility requirements.

### 7. Timetable Management
- Generate and view weekly classroom timetables.
- View scheduled classroom allocations.

### 8. Analytics and Utilization
- Display classroom utilization information.
- Help administrators understand classroom usage.

### 9. Redis Caching
- Cache frequently accessed classroom information.
- Reduce repeated database queries.
- Use a 60-second TTL for the classroom list cache.
- Invalidate cached classroom data when relevant changes occur.

## 🗄️ Database Design

**Database Management System:** PostgreSQL

The database consists of 11 primary tables.

| Table | Description |
|---|---|
| departments | Stores department information |
| users | Stores user login and role information |
| faculty | Stores faculty details |
| classrooms | Stores classroom details and capacity |
| facilities | Stores available facilities |
| classroom_facilities | Maps facilities to classrooms |
| courses | Stores course information |
| course_offerings | Stores course offerings |
| offering_required_facilities | Stores facility requirements for offerings |
| time_slots | Stores scheduling time slots |
| allocations | Stores classroom allocation records |

### Database Relationships

- A department can have multiple faculty members.
- A classroom can have multiple facilities.
- A facility can belong to multiple classrooms.
- A course can have multiple course offerings.
- A course offering can require multiple facilities.
- Allocations associate course offerings with classrooms and time slots.

### Database Concepts

The project incorporates important DBMS concepts:

- Primary Keys and Foreign Keys
- Entity Relationships
- Referential Integrity
- Constraints
- Joins
- Indexing
- Views
- Stored Functions and Procedures
- Triggers
- Transactions
- Concurrency Management

Refer to the SQL implementation files for the corresponding database objects.

## 📂 Project Structure

```text
university-classroom-allocation/
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   ├── advanced.sql
│   ├── functions.sql
│   ├── procedures.sql
│   └── triggers.sql
│
├── app/
│   └── Application pages and routes
│
├── public/
│   └── Static assets
│
├── package.json
├── README.md
├── Relational_Schema.md
└── ER_Diagram.png
```

*The structure above highlights the main project components; consult the repository for the complete directory structure.*

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

- Node.js
- npm
- PostgreSQL
- Redis

### Step 1: Clone the Repository

```bash
git clone https://github.com/skandaml21/university-classroom-allocation.git
cd university-classroom-allocation
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start PostgreSQL

On Ubuntu/WSL:

```bash
sudo service postgresql start
```

Create the database:

```bash
sudo -u postgres psql
```

Execute:

```sql
CREATE DATABASE classroom_allocation;
```

Exit PostgreSQL:

```sql
\q
```

### Step 4: Execute Database Scripts

Run the schema and seed scripts:

```bash
psql -U postgres -d classroom_allocation -f database/schema.sql
psql -U postgres -d classroom_allocation -f database/seed.sql
```

Execute the additional SQL scripts for functions, procedures, triggers, and advanced database objects according to their dependencies.

### Step 5: Configure Environment Variables

Create a `.env.local` file in the project root and configure the PostgreSQL and Redis connection settings according to the application's configuration.

Do not commit database passwords or other sensitive credentials.

### Step 6: Start Redis

```bash
sudo service redis-server start
```

Check Redis:

```bash
redis-cli ping
```

Expected output:

```text
PONG
```

### Step 7: Run the Application

```bash
npm run dev
```

Open your browser:

```text
http://localhost:3000
```

## 🧪 Testing and Validation

The system can be evaluated using scenarios such as:

- User authentication and role-based access.
- Classroom creation and management.
- Faculty and course management.
- Allocation with sufficient classroom capacity.
- Allocation with missing required facilities.
- Detection of scheduling conflicts.
- Classroom recommendation.
- Timetable generation.
- Classroom utilization.
- Redis caching and cache invalidation.

## 📊 Expected Outcome

UniSpace provides a centralized classroom allocation solution that reduces manual scheduling effort, improves resource utilization, maintains data consistency, and simplifies university classroom administration.

## 🚀 Future Enhancements

- Automated timetable optimization.
- Advanced scheduling algorithms.
- Notifications for allocation changes.
- Enhanced reporting and visualization.
- Integration with university academic management systems.

## 👥 Contributors

**Project:** UniSpace – University Classroom Allocation System

**Domain:** Database Management Systems (DBMS)

**Database:** PostgreSQL

**Students:** Skanda M L - PES1UG24CS457
              Ruthik - PES1UG25CS837

---

