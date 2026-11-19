"use client";

import { useEffect, useState } from "react";
import styles from "./analytics.module.css";

type AnalyticsData = {
  summary: {
    total_classrooms: string;
    total_courses: string;
    total_faculty: string;
    total_allocations: string;
    occupied_classrooms: string;
    average_utilization: string;
  };
  rooms: {
    room_id: number;
    room_number: string;
    building: string;
    capacity: number;
    total_allocations: number;
    average_capacity_utilization: number;
  }[];
  dailyAllocations: {
    day: string;
    count: number;
  }[];
  courses: {
    course_code: string;
    course_name: string;
    allocation_count: number;
    allocated_students: number;
  }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/analytics");

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "You must be logged in as an administrator."
            : "Unable to load analytics."
        );
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const response = await fetch("/api/analytics");

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "You must be logged in as an administrator."
              : "Unable to load analytics."
          );
        }

        const result = await response.json();

        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Something went wrong."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <main className={styles.page}><p className={styles.message}>Loading analytics...</p></main>;
  }

  if (error || !data) {
    return (
      <main className={styles.page}>
        <div className={styles.error}>
          <p>{error || "No analytics data available."}</p>
          <button onClick={loadAnalytics}>Try Again</button>
        </div>
      </main>
    );
  }

  const summary = data.summary;
  const maxDaily = Math.max(
    1,
    ...data.dailyAllocations.map((item) => item.count)
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>UNISPACE / ADMINISTRATION</p>
          <h1>Classroom Analytics</h1>
          <p className={styles.subtitle}>
            Monitor classroom usage, allocation patterns and academic resources.
          </p>
        </div>

        <button className={styles.refreshButton} onClick={loadAnalytics}>
          ↻ Refresh Data
        </button>
      </header>

      <section className={styles.statsGrid}>
        <StatCard
          label="Total Classrooms"
          value={summary.total_classrooms}
          icon="🏫"
        />
        <StatCard
          label="Total Courses"
          value={summary.total_courses}
          icon="📚"
        />
        <StatCard
          label="Faculty Members"
          value={summary.total_faculty}
          icon="👩‍🏫"
        />
        <StatCard
          label="Total Allocations"
          value={summary.total_allocations}
          icon="📅"
        />
        <StatCard
          label="Occupied Classrooms"
          value={summary.occupied_classrooms}
          icon="🪑"
        />
        <StatCard
          label="Average Utilization"
          value={`${Number(summary.average_utilization).toFixed(2)}%`}
          icon="📊"
        />
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Classroom Utilization</h2>
              <p>Average student capacity utilization by room</p>
            </div>
          </div>

          <div className={styles.roomList}>
            {data.rooms.map((room) => {
              const utilization = Math.min(
                100,
                Math.max(
                  0,
                  Number(room.average_capacity_utilization)
                )
              );

              return (
                <div className={styles.roomItem} key={room.room_id}>
                  <div className={styles.roomInfo}>
                    <div>
                      <strong>{room.room_number}</strong>
                      <span>{room.building}</span>
                    </div>
                    <div className={styles.roomNumbers}>
                      <strong>{utilization.toFixed(2)}%</strong>
                      <span>{room.total_allocations} allocations</span>
                    </div>
                  </div>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${utilization}%` }}
                    />
                  </div>

                  <p className={styles.roomCapacity}>
                    Capacity: {room.capacity} students
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Weekly Allocation Pattern</h2>
              <p>Number of classroom allocations per day</p>
            </div>
          </div>

          <div className={styles.weekChart}>
            {data.dailyAllocations.map((item) => (
              <div className={styles.dayColumn} key={item.day}>
                <span className={styles.dayCount}>{item.count}</span>
                <div className={styles.dayBarArea}>
                  <div
                    className={styles.dayBar}
                    style={{
                      height: `${Math.max(
                        5,
                        (item.count / maxDaily) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className={styles.dayLabel}>
                  {item.day.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Course Allocation Overview</h2>
            <p>Allocation count and expected student strength by course</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Allocations</th>
                <th>Expected Students</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((course) => (
                <tr key={course.course_code}>
                  <td><strong>{course.course_code}</strong></td>
                  <td>{course.course_name}</td>
                  <td>{course.allocation_count}</td>
                  <td>{course.allocated_students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <span>{label}</span>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}
