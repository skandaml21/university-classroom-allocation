"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./allocations.module.css";

interface Facility {
  facility_id: number;
  facility_name: string;
}

interface Offering {
  offering_id: number;
  course_code: string;
  course_name: string;
  faculty_name: string;
  expected_strength: number;
  required_facilities: Facility[];
}

interface Classroom {
  room_id: number;
  room_number: string;
  building: string;
  floor: number;
  capacity: number;
  facilities: Facility[];
}

interface TimeSlot {
  slot_id: number;
  start_time: string;
  end_time: string;
}

interface AllocationData {
  offerings: Offering[];
  classrooms: Classroom[];
  timeSlots: TimeSlot[];
  days: string[];
}

interface Suggestion {
  room_id: number;
  room_number: string;
  building: string;
  floor: number;
  capacity: number;
  spare_capacity: number;
  facilities: Facility[];
}

export default function AllocationsPage() {
  const router = useRouter();

  const [data, setData] = useState<AllocationData>({
    offerings: [],
    classrooms: [],
    timeSlots: [],
    days: [],
  });

  const [offeringId, setOfferingId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [day, setDay] = useState("Monday");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [suggestionKey, setSuggestionKey] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/allocations");

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error("Only administrators can manage allocations.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load allocation data.");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const selectedOffering = data.offerings.find(
    (item) => item.offering_id === Number(offeringId)
  );

  const selectedRoom = data.classrooms.find(
    (item) => item.room_id === Number(roomId)
  );

  const currentSuggestionKey = `${offeringId}-${day}-${slotId}`;

  // Fetch suitable classrooms whenever the course, day or time changes.
  useEffect(() => {
    if (!offeringId || !slotId || !day) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSuggestionLoading(true);
      setSuggestionError("");
      setSuggestions([]);
      setSuggestionKey("");

      try {
        const params = new URLSearchParams({
          offering_id: offeringId,
          slot_id: slotId,
          day,
        });

        const response = await fetch(
          `/api/allocations/suggestions?${params.toString()}`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to find suitable classrooms."
          );
        }

        if (!controller.signal.aborted) {
          setSuggestions(result.suggestions || []);
          setSuggestionKey(currentSuggestionKey);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSuggestionError(
            err instanceof Error
              ? err.message
              : "Unable to generate recommendations."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setSuggestionLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [offeringId, slotId, day, currentSuggestionKey]);

  function selectSuggestedRoom(id: number) {
    setRoomId(String(id));
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offering_id: Number(offeringId),
          room_id: Number(roomId),
          slot_id: Number(slotId),
          day_of_week: day,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Allocation failed.");
      }

      setMessage(result.message);
      setOfferingId("");
      setRoomId("");
      setSlotId("");
      setDay("Monday");
      setSuggestions([]);
      setSuggestionKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const hasRequiredFacilities =
    selectedOffering && selectedRoom
      ? selectedOffering.required_facilities.every((required) =>
          selectedRoom.facilities.some(
            (available) => available.facility_id === required.facility_id
          )
        )
      : true;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <a href="/admin" className={styles.backLink}>
            ← Back to Dashboard
          </a>

          <p className={styles.eyebrow}>UNIVERSITY MANAGEMENT</p>

          <h1>Classroom Allocation</h1>

          <p className={styles.subtitle}>
            Assign courses to classrooms and manage academic schedules.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.push("/timetable")}
        >
          View Timetable →
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {message && <div className={styles.success}>{message}</div>}

      {loading ? (
        <p className={styles.loading}>Loading allocation information...</p>
      ) : (
        <div className={styles.content}>
          <section className={styles.formCard}>
            <div className={styles.cardHeading}>
              <span>01</span>

              <div>
                <h2>Create New Allocation</h2>
                <p>Choose the course, classroom and schedule.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label className={styles.field}>
                Course Offering

                <select
                  required
                  value={offeringId}
                  onChange={(e) => {
                    setOfferingId(e.target.value);
                    setRoomId("");
                    setError("");
                    setMessage("");
                  }}
                >
                  <option value="">Select a course</option>

                  {data.offerings.map((offering) => (
                    <option
                      key={offering.offering_id}
                      value={offering.offering_id}
                    >
                      {offering.course_code} - {offering.course_name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedOffering && (
                <div className={styles.infoCard}>
                  <h3>Course Information</h3>

                  <p>
                    <strong>Faculty:</strong> {selectedOffering.faculty_name}
                  </p>

                  <p>
                    <strong>Expected Students:</strong>{" "}
                    {selectedOffering.expected_strength}
                  </p>

                  <p>
                    <strong>Required Facilities:</strong>{" "}
                    {selectedOffering.required_facilities.length
                      ? selectedOffering.required_facilities
                          .map((f) => f.facility_name)
                          .join(", ")
                      : "None"}
                  </p>
                </div>
              )}

              <label className={styles.field}>
                Classroom

                <select
                  required
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  <option value="">Select a classroom</option>

                  {data.classrooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.room_number} - {room.building} (Capacity:{" "}
                      {room.capacity})
                    </option>
                  ))}
                </select>
              </label>

              {selectedRoom && (
                <div className={styles.infoCard}>
                  <h3>Classroom Information</h3>

                  <p>
                    <strong>Building:</strong> {selectedRoom.building}
                  </p>

                  <p>
                    <strong>Floor:</strong> {selectedRoom.floor}
                  </p>

                  <p>
                    <strong>Capacity:</strong> {selectedRoom.capacity}
                  </p>

                  <p>
                    <strong>Facilities:</strong>{" "}
                    {selectedRoom.facilities.length
                      ? selectedRoom.facilities
                          .map((f) => f.facility_name)
                          .join(", ")
                      : "None"}
                  </p>

                  {selectedOffering &&
                    selectedOffering.expected_strength >
                      selectedRoom.capacity && (
                      <p className={styles.warning}>
                        Insufficient capacity for this course.
                      </p>
                    )}

                  {!hasRequiredFacilities && (
                    <p className={styles.warning}>
                      This classroom does not have all required facilities.
                    </p>
                  )}
                </div>
              )}

              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  Day

                  <select
                    required
                    value={day}
                    onChange={(e) => {
                      setDay(e.target.value);
                      setRoomId("");
                    }}
                  >
                    {data.days.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  Time Slot

                  <select
                    required
                    value={slotId}
                    onChange={(e) => {
                      setSlotId(e.target.value);
                      setRoomId("");
                    }}
                  >
                    <option value="">Select time</option>

                    {data.timeSlots.map((slot) => (
                      <option key={slot.slot_id} value={slot.slot_id}>
                        {slot.start_time.slice(0, 5)} -{" "}
                        {slot.end_time.slice(0, 5)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Automatic classroom recommendations */}
              {offeringId && slotId && (
                <div className={styles.infoCard}>
                  <h3>✨ Automatic Classroom Recommendations</h3>

                  <p>
                    Suitable classrooms are selected using student capacity,
                    required facilities, room availability and faculty
                    availability.
                  </p>

                  {suggestionLoading && (
                    <p>Finding suitable classrooms...</p>
                  )}

                  {suggestionError && (
                    <p className={styles.warning}>{suggestionError}</p>
                  )}

                  {!suggestionLoading &&
                    !suggestionError &&
                    suggestionKey === currentSuggestionKey &&
                    suggestions.length === 0 && (
                      <p className={styles.warning}>
                        No suitable classrooms are available for this day
                        and time slot.
                      </p>
                    )}

                  {!suggestionLoading &&
                    suggestionKey === currentSuggestionKey &&
                    suggestions.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gap: "12px",
                          marginTop: "15px",
                        }}
                      >
                        <p>
                          <strong>
                            {suggestions.length} suitable classroom(s) found
                          </strong>
                        </p>

                        {suggestions.map((room, index) => (
                          <div
                            key={room.room_id}
                            style={{
                              padding: "14px",
                              border: "1px solid #a78bfa44",
                              borderRadius: "10px",
                              background: "#8b5cf612",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "10px",
                                alignItems: "center",
                              }}
                            >
                              <strong>
                                {index === 0 ? "⭐ Best Fit: " : ""}
                                {room.room_number}
                              </strong>

                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() =>
                                  selectSuggestedRoom(room.room_id)
                                }
                              >
                                {Number(roomId) === room.room_id
                                  ? "Selected"
                                  : "Use This Classroom"}
                              </button>
                            </div>

                            <p>{room.building}</p>

                            <p>
                              Capacity: {room.capacity} students
                            </p>

                            <p>
                              Expected students:{" "}
                              {selectedOffering?.expected_strength}
                            </p>

                            <p>
                              Spare capacity: {room.spare_capacity}
                            </p>

                            <p>
                              Facilities:{" "}
                              {room.facilities.length
                                ? room.facilities
                                    .map((f) => f.facility_name)
                                    .join(", ")
                                : "None"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={
                  saving ||
                  !offeringId ||
                  !roomId ||
                  !slotId ||
                  !hasRequiredFacilities ||
                  (selectedOffering !== undefined &&
                    selectedRoom !== undefined &&
                    selectedOffering.expected_strength > selectedRoom.capacity)
                }
              >
                {saving ? "Allocating..." : "Allocate Classroom"}
              </button>
            </form>
          </section>

          <aside className={styles.sideCard}>
            <h2>Allocation Guidelines</h2>

            <p>Before creating an allocation, remember:</p>

            <ul>
              <li>Classroom capacity must accommodate all students.</li>
              <li>All required classroom facilities must be available.</li>
              <li>A classroom cannot host two courses simultaneously.</li>
              <li>A faculty member cannot teach two courses simultaneously.</li>
              <li>Only Monday through Saturday are supported.</li>
            </ul>

            <div className={styles.validationNote}>
              <strong>Database validation enabled</strong>

              <p>
                PostgreSQL triggers automatically validate capacity,
                facilities and scheduling conflicts when you submit.
              </p>
            </div>

            <div className={styles.quickStats}>
              <div>
                <span>Course Offerings</span>
                <strong>{data.offerings.length}</strong>
              </div>

              <div>
                <span>Classrooms</span>
                <strong>{data.classrooms.length}</strong>
              </div>

              <div>
                <span>Time Slots</span>
                <strong>{data.timeSlots.length}</strong>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
