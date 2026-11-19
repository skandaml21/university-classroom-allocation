"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./manage.module.css";

interface Allocation {
  allocation_id: number;
  day_of_week: string;
  course_code: string;
  course_name: string;
  faculty_name: string;
  room_number: string;
  building: string;
  capacity: number;
  expected_strength: number;
  start_time: string;
  end_time: string;
}

const days = [
  "All Days",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ManageAllocationsPage() {
  const router = useRouter();

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedDay, setSelectedDay] = useState("All Days");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchAllocations = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/allocations/list");

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load allocations.");
      }

      setAllocations(data.allocations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAllocations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchAllocations]);

  const filteredAllocations = useMemo(
    () =>
      selectedDay === "All Days"
        ? allocations
        : allocations.filter(
            (item) => item.day_of_week === selectedDay
          ),
    [allocations, selectedDay]
  );

  async function cancelAllocation(id: number) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel allocation #${id}?`
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/allocations/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to cancel allocation.");
      }

      setMessage(data.message);
      await fetchAllocations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <a href="/admin" className={styles.backLink}>
            ← Back to Dashboard
          </a>
          <p className={styles.eyebrow}>UNIVERSITY MANAGEMENT</p>
          <h1>Allocation Management</h1>
          <p className={styles.subtitle}>
            View, monitor and manage classroom allocations.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={fetchAllocations}
            className={styles.refreshButton}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            onClick={() => router.push("/allocations")}
            className={styles.addButton}
          >
            + New Allocation
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {message && <div className={styles.success}>{message}</div>}

      <section className={styles.stats}>
        <div className={styles.statCard}>
          <span>Total Allocations</span>
          <strong>{allocations.length}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Days With Allocations</span>
          <strong>
            {new Set(allocations.map((item) => item.day_of_week)).size}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span>Filtered Results</span>
          <strong>{filteredAllocations.length}</strong>
        </div>
      </section>

      <section className={styles.listCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Scheduled Classes</h2>
            <p>All classroom assignments registered in the database.</p>
          </div>

          <label className={styles.filter}>
            Filter by day
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              {days.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p className={styles.empty}>Loading allocations...</p>
        ) : filteredAllocations.length === 0 ? (
          <div className={styles.emptyState}>
            <span>📅</span>
            <h3>No allocations found</h3>
            <p>
              There are no scheduled classes for this selection.
            </p>
            <button
              type="button"
              onClick={() => router.push("/allocations")}
              className={styles.addButton}
            >
              Create an Allocation
            </button>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Course</th>
                  <th>Faculty</th>
                  <th>Classroom</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Students</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredAllocations.map((item) => (
                  <tr key={item.allocation_id}>
                    <td>#{item.allocation_id}</td>

                    <td>
                      <strong>{item.course_code}</strong>
                      <small>{item.course_name}</small>
                    </td>

                    <td>{item.faculty_name}</td>

                    <td>
                      <strong>{item.room_number}</strong>
                      <small>{item.building}</small>
                    </td>

                    <td>
                      <span className={styles.dayBadge}>
                        {item.day_of_week}
                      </span>
                    </td>

                    <td className={styles.time}>
                      {item.start_time.slice(0, 5)} –{" "}
                      {item.end_time.slice(0, 5)}
                    </td>

                    <td>
                      {item.expected_strength}/{item.capacity}
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.cancelButton}
                        disabled={deletingId === item.allocation_id}
                        onClick={() =>
                          cancelAllocation(item.allocation_id)
                        }
                      >
                        {deletingId === item.allocation_id
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={styles.bottomLinks}>
        <button
          type="button"
          onClick={() => router.push("/timetable")}
        >
          View Weekly Timetable →
        </button>
      </div>
    </main>
  );
}
