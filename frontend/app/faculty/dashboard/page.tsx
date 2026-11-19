import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/postgres";
import styles from "./dashboard.module.css";

type FacultyProfile = {
  name: string;
  email: string;
  department_name: string;
};

type CourseOffering = {
  offering_id: number;
  course_code: string;
  course_name: string;
  semester: string;
  academic_year: string;
  expected_strength: number;
};

export default async function FacultyDashboard() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "FACULTY") {
    redirect("/admin");
  }

  const profileResult = await pool.query<FacultyProfile>(
    `SELECT u.name, u.email, d.department_name
     FROM faculty f
     JOIN users u ON u.user_id = f.user_id
     JOIN departments d ON d.department_id = f.department_id
     WHERE f.user_id = $1`,
    [session.userId]
  );

  if (profileResult.rows.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyCard}>
          <h1>Faculty profile not found</h1>
          <p>Please contact the administrator to check your faculty account.</p>
          <Link href="/api/auth/logout">Return to login</Link>
        </section>
      </main>
    );
  }

  const profile = profileResult.rows[0];

  const coursesResult = await pool.query<CourseOffering>(
    `SELECT
       co.offering_id,
       c.course_code,
       c.course_name,
       co.semester,
       co.academic_year,
       co.expected_strength
     FROM course_offerings co
     JOIN courses c ON c.course_id = co.course_id
     JOIN faculty f ON f.faculty_id = co.faculty_id
     WHERE f.user_id = $1
     ORDER BY co.semester, c.course_code`,
    [session.userId]
  );

  const scheduleResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM allocations a
     JOIN course_offerings co ON co.offering_id = a.offering_id
     JOIN faculty f ON f.faculty_id = co.faculty_id
     WHERE f.user_id = $1`,
    [session.userId]
  );

  const courses = coursesResult.rows;
  const totalStudents = courses.reduce(
    (sum, course) => sum + Number(course.expected_strength),
    0
  );
  const scheduledClasses = Number(scheduleResult.rows[0].total);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>UNISPACE / FACULTY PORTAL</p>
          <h1>Welcome, {profile.name}</h1>
          <p className={styles.subtitle}>
            Your teaching overview and academic schedule.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/timetable" className={styles.primaryButton}>
            View My Timetable
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className={styles.logoutButton} type="submit">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <section className={styles.profileCard}>
        <div className={styles.avatar}>
          {profile.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </div>
        <div>
          <h2>{profile.name}</h2>
          <p>{profile.email}</p>
          <span>{profile.department_name}</span>
        </div>
        <div className={styles.roleBadge}>FACULTY MEMBER</div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span>Assigned Courses</span>
          <strong>{courses.length}</strong>
          <small>Courses assigned to you</small>
        </article>

        <article className={styles.statCard}>
          <span>Expected Students</span>
          <strong>{totalStudents}</strong>
          <small>Across your course offerings</small>
        </article>

        <article className={styles.statCard}>
          <span>Scheduled Classes</span>
          <strong>{scheduledClasses}</strong>
          <small>Active classroom allocations</small>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>My Courses</h2>
            <p>View the academic courses assigned to you.</p>
          </div>
          <span className={styles.countBadge}>{courses.length} courses</span>
        </div>

        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No courses assigned yet</h3>
            <p>Your assigned courses will appear here once the administrator adds them.</p>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((course) => (
              <article className={styles.courseCard} key={course.offering_id}>
                <div className={styles.courseTop}>
                  <span className={styles.courseCode}>
                    {course.course_code}
                  </span>
                  <span className={styles.courseIcon}>▤</span>
                </div>

                <h3>{course.course_name}</h3>

                <div className={styles.courseDetails}>
                  <div>
                    <span>Semester</span>
                    <strong>{course.semester}</strong>
                  </div>
                  <div>
                    <span>Academic Year</span>
                    <strong>{course.academic_year}</strong>
                  </div>
                  <div>
                    <span>Expected Strength</span>
                    <strong>{course.expected_strength} students</strong>
                  </div>
                </div>

                <Link href="/timetable" className={styles.courseLink}>
                  View timetable →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        UniSpace · University Classroom Allocation System
      </footer>
    </main>
  );
}
