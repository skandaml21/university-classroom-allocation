
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./timetable.module.css";

interface TimeSlot {
  slot_id: number;
  start_time: string;
  end_time: string;
}

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
  slot_id: number;
  room_id: number;
  offering_id: number;
}

type UserRole = "ADMIN" | "FACULTY";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTime(value: string) {
  return value.slice(0, 5);
}

export default function TimetablePage() {
  const router = useRouter();

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);

  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/timetable");
      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load timetable.");
      }

      setAllocations(data.allocations);
      setTimeSlots(data.timeSlots);
      setRole(data.role);
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
      void fetchTimetable();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchTimetable]);

  const filteredAllocations = useMemo(
    () =>
      allocations.filter(
        (allocation) => allocation.day_of_week === selectedDay
      ),
    [allocations, selectedDay]
  );

  const occupiedCount = filteredAllocations.length;
  const availableCount = Math.max(0, timeSlots.length - occupiedCount);

  const isFaculty = role === "FACULTY";
  const dashboardLink = isFaculty ? "/faculty/dashboard" : "/admin";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <a href={dashboardLink} className={styles.backLink}>
            ← Back to {isFaculty ? "Faculty Dashboard" : "Admin Dashboard"}
          </a>

          <p className={styles.eyebrow}>
            {isFaculty ? "FACULTY PORTAL" : "UNIVERSITY MANAGEMENT"}
          </p>

          <h1>
            {isFaculty ? "My Teaching Timetable" : "Timetable Management"}
          </h1>

          <p className={styles.subtitle}>
            {isFaculty
              ? "View your assigned classes and weekly teaching schedule."
              : "View classroom schedules and weekly academic allocations."}
          </p>
        </div>

        <button
          className={styles.refreshButton}
          onClick={fetchTimetable}
          type="button"
        >
          ↻ Refresh Timetable
        </button>
      </header>

      <section className={styles.stats}>
        <div className={styles.statCard}>
          <span>{isFaculty ? "My Allocations" : "Total Allocations"}</span>
          <strong>{allocations.length}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Occupied Slots on {selectedDay}</span>
          <strong>{occupiedCount}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Available Slots on {selectedDay}</span>
          <strong>{availableCount}</strong>
        </div>
      </section>

      <section className={styles.timetableCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Weekly Schedule</h2>
            <p>
              {isFaculty
                ? "Select a day to view your scheduled classes."
                : "Select a day to view classroom allocations."}
            </p>
          </div>
        </div>

        <div className={styles.dayFilters}>
          {days.map((day) => (
            <button
              key={day}
              type="button"
              className={
                selectedDay === day ? styles.activeDay : styles.dayButton
              }
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <p className={styles.empty}>Loading timetable...</p>
        ) : (
          <div className={styles.schedule}>
            {timeSlots.map((slot) => {
              const slotAllocations = filteredAllocations.filter(
                (allocation) => allocation.slot_id === slot.slot_id
              );

              return (
                <div className={styles.timeRow} key={slot.slot_id}>
                  <div className={styles.timeLabel}>
                    <strong>{formatTime(slot.start_time)}</strong>
                    <span>{formatTime(slot.end_time)}</span>
                  </div>

                  <div className={styles.slotContent}>
                    {slotAllocations.length > 0 ? (
                      slotAllocations.map((allocation) => (
                        <article
                          className={styles.allocation}
                          key={allocation.allocation_id}
                        >
                          <div className={styles.allocationTop}>
                            <span className={styles.courseCode}>
                              {allocation.course_code}
                            </span>

                            <span className={styles.occupied}>
                              Scheduled
                            </span>
                          </div>

                          <h3>{allocation.course_name}</h3>

                          {!isFaculty && (
                            <p>Faculty: {allocation.faculty_name}</p>
                          )}

                          <div className={styles.allocationDetails}>
                            <span>
                              <strong>Room:</strong> {allocation.room_number}
                            </span>

                            <span>
                              <strong>Building:</strong> {allocation.building}
                            </span>

                            <span>
                              <strong>Students:</strong>{" "}
                              {allocation.expected_strength}/{allocation.capacity}
                            </span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className={styles.available}>
                        <span>Available</span>
                        <small>No classroom allocation</small>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && timeSlots.length === 0 && (
          <p className={styles.empty}>No time slots configured.</p>
        )}
      </section>

      <footer className={styles.footer}>
        UniSpace · University Classroom Allocation System
      </footer>
    </main>
  );
}
