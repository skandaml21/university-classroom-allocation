import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/postgres";
import { redis } from "@/lib/cache/redis";
import styles from "./admin.module.css";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: "⌂" },
  { label: "Classrooms", href: "/classrooms", icon: "🏫" },
  { label: "Courses", href: "/courses", icon: "📚" },
  { label: "Faculty", href: "/faculty", icon: "👨‍🏫" },
  { label: "Allocations", href: "/allocations", icon: "📝" },
  { label: "Manage Allocations", href: "/allocations/manage", icon: "📋" },
  { label: "Timetable", href: "/timetable", icon: "📅" },
  { label: "Analytics", href: "/analytics", icon: "📊" },
];

const actions = [
  {
    title: "Manage Classrooms",
    description: "Add, edit and manage classrooms and their facilities.",
    icon: "🏫",
    href: "/classrooms",
  },
  {
    title: "Manage Courses",
    description: "Manage courses and their faculty offerings.",
    icon: "📚",
    href: "/courses",
  },
  {
    title: "Faculty Directory",
    description: "View and manage faculty information.",
    icon: "👨‍🏫",
    href: "/faculty",
  },
  {
    title: "Create Allocation",
    description: "Allocate rooms with automatic suitability suggestions.",
    icon: "📝",
    href: "/allocations",
  },
  {
    title: "Manage Allocations",
    description: "Review and cancel existing classroom allocations.",
    icon: "📋",
    href: "/allocations/manage",
  },
  {
    title: "View Timetable",
    description: "Explore classroom and faculty schedules.",
    icon: "📅",
    href: "/timetable",
  },
  {
    title: "View Analytics",
    description: "Monitor classroom utilisation and allocation statistics.",
    icon: "📊",
    href: "/analytics",
  },
];

const databaseFeatures = [
  {
    title: "Relational Database",
    description: "PostgreSQL with relational tables, primary keys, foreign keys and integrity constraints.",
    icon: "🗄️",
  },
  {
    title: "Redis Caching",
    description: "Redis caching for classroom data with expiry and mutation-based invalidation.",
    icon: "⚡",
  },
  {
    title: "Transactions",
    description: "Transactional operations with COMMIT and ROLLBACK support.",
    icon: "🔄",
  },
  {
    title: "Stored Procedures",
    description: "allocate_classroom() for database-level classroom allocation.",
    icon: "⚙️",
  },
  {
    title: "User-defined Functions",
    description: "get_classroom_utilization() for calculating room utilisation.",
    icon: "🧮",
  },
  {
    title: "Triggers and Validation",
    description: "Automatic capacity, facility, classroom-overlap and faculty-overlap validation.",
    icon: "🛡️",
  },
  {
    title: "Views",
    description: "classroom_timetable and classroom_utilization for simplified reporting.",
    icon: "📑",
  },
  {
    title: "Indexing",
    description: "Database indexes created to improve query performance.",
    icon: "🚀",
  },
  {
    title: "Concurrency Control",
    description: "Transaction-level PostgreSQL advisory locking for allocation validation.",
    icon: "🔐",
  },
];

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/faculty");

  const [classrooms, courses, faculty, allocations] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM classrooms"),
    pool.query("SELECT COUNT(*) FROM courses"),
    pool.query("SELECT COUNT(*) FROM faculty"),
    pool.query("SELECT COUNT(*) FROM allocations"),
  ]);

  let postgresStatus = "Disconnected";
  let redisStatus = "Disconnected";

  try {
    await pool.query("SELECT 1");
    postgresStatus = "Connected";
  } catch (error) {
    console.error("Dashboard PostgreSQL health check failed:", error);
  }

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    await redis.ping();
    redisStatus = "Connected";
  } catch (error) {
    console.error("Dashboard Redis health check failed:", error);
  }

  const stats = [
    { label: "Total Classrooms", value: classrooms.rows[0].count, icon: "🏫" },
    { label: "Total Courses", value: courses.rows[0].count, icon: "📚" },
    { label: "Faculty Members", value: faculty.rows[0].count, icon: "👨‍🏫" },
    { label: "Active Allocations", value: allocations.rows[0].count, icon: "📅" },
  ];

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo}>U</span>
          <div>
            <h2>UniSpace</h2>
            <small>ADMIN PORTAL</small>
          </div>
        </div>

        <p className={styles.navLabel}>MAIN MENU</p>

        <nav className={styles.navigation}>
          {navigation.map((item) => (
            <a
              className={item.href === "/admin" ? styles.active : ""}
              href={item.href}
              key={item.href}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <form action="/api/auth/logout" method="POST">
          <button className={styles.logout}>Sign Out ↗</button>
        </form>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>UNIVERSITY MANAGEMENT</p>
            <h1>Admin Dashboard</h1>
            <p>Welcome back, {session.name}.</p>
          </div>
          <div className={styles.adminBadge}>ADMIN</div>
        </header>

        <section className={styles.stats}>
          {stats.map((stat) => (
            <article className={styles.statCard} key={stat.label}>
              <span className={styles.statIcon}>{stat.icon}</span>
              <p>{stat.label}</p>
              <h2>{stat.value}</h2>
            </article>
          ))}
        </section>

        <section className={styles.welcomeCard}>
          <div>
            <p className={styles.eyebrow}>CONTROL CENTRE</p>
            <h2>Manage your university spaces.</h2>
            <p>
              Monitor classrooms, courses, faculty, allocations and timetables
              from one central dashboard.
            </p>
          </div>
          <div className={styles.welcomeIcon}>✦</div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>APPLICATION FEATURES</p>
              <h2>Management Modules</h2>
            </div>
            <span className={styles.moduleCount}>7 MODULES</span>
          </div>

          <div className={styles.actions}>
            {actions.map((action) => (
              <a href={action.href} className={styles.actionCard} key={action.href}>
                <span className={styles.actionIcon}>{action.icon}</span>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <span className={styles.actionLink}>Open module ↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>DATABASE ENGINEERING</p>
              <h2>Advanced DBMS Features</h2>
            </div>
            <span className={styles.moduleCount}>9 FEATURES</span>
          </div>

          <div className={styles.featureGrid}>
            {databaseFeatures.map((feature) => (
              <article className={styles.featureCard} key={feature.title}>
                <span className={styles.actionIcon}>{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className={styles.implemented}>✓ Implemented</span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>INFRASTRUCTURE MONITORING</p>
              <h2>System Health</h2>
            </div>
            <span className={styles.moduleCount}>LIVE CHECK</span>
          </div>

          <div className={styles.healthGrid}>
            <article className={styles.healthCard}>
              <div className={styles.healthHeading}>
                <span>🗄️</span>
                <h3>PostgreSQL Database</h3>
              </div>
              <p className={postgresStatus === "Connected" ? styles.connected : styles.disconnected}>
                <span className={styles.statusDot}></span>
                {postgresStatus}
              </p>
              <small>Primary relational database</small>
            </article>

            <article className={styles.healthCard}>
              <div className={styles.healthHeading}>
                <span>⚡</span>
                <h3>Redis Cache</h3>
              </div>
              <p className={redisStatus === "Connected" ? styles.connected : styles.disconnected}>
                <span className={styles.statusDot}></span>
                {redisStatus}
              </p>
              <small>Classroom data caching service</small>
            </article>
          </div>
        </section>

        <footer className={styles.footer}>
          UniSpace · University Classroom Allocation System
        </footer>
      </section>
    </main>
  );
}
