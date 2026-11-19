
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./classrooms.module.css";

interface Facility {
  facility_id: number;
  facility_name: string;
}

interface Classroom {
  room_id: number;
  room_number: string;
  building: string;
  floor: number;
  capacity: number;
  facilities: Facility[];
}

const emptyForm = {
  room_number: "",
  building: "",
  floor: 0,
  capacity: 40,
  facility_ids: [] as number[],
};

export default function ClassroomsPage() {
  const router = useRouter();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {

    try {
      const [classroomResponse, facilityResponse] = await Promise.all([
        fetch("/api/classrooms"),
        fetch("/api/facilities"),
      ]);

      if (
        classroomResponse.status === 401 ||
        facilityResponse.status === 401
      ) {
        router.replace("/login");
        return;
      }

      if (
        classroomResponse.status === 403 ||
        facilityResponse.status === 403
      ) {
        throw new Error("You do not have permission to view this page.");
      }

      if (!classroomResponse.ok || !facilityResponse.ok) {
        throw new Error("Unable to load classroom information.");
      }

      const classroomData = await classroomResponse.json();
      const facilityData = await facilityResponse.json();

      setClassrooms(classroomData.classrooms);
      setFacilities(facilityData.facilities);
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
    void fetchData();
  }, 0);

  return () => window.clearTimeout(timer);
}, [fetchData]);

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function openEditForm(classroom: Classroom) {
    setForm({
      room_number: classroom.room_number,
      building: classroom.building,
      floor: classroom.floor,
      capacity: classroom.capacity,
      facility_ids: classroom.facilities.map((f) => f.facility_id),
    });

    setEditingId(classroom.room_id);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function toggleFacility(id: number) {
    setForm((current) => ({
      ...current,
      facility_ids: current.facility_ids.includes(id)
        ? current.facility_ids.filter((item) => item !== id)
        : [...current.facility_ids, id],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingId ? `/api/classrooms/${editingId}` : "/api/classrooms",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            floor: Number(form.floor),
            capacity: Number(form.capacity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save classroom.");
      }

      setMessage(data.message);
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteClassroom(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this classroom?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/classrooms/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete classroom.");
      }

      setMessage(data.message);
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
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
          <h1>Classroom Management</h1>
          <p className={styles.subtitle}>
            Manage university spaces, capacities and facilities.
          </p>
        </div>

        <button className={styles.addButton} onClick={openAddForm}>
          + Add Classroom
        </button>
      </header>

      <section className={styles.summary}>
        <div>
          <span>Total Classrooms</span>
          <strong>{classrooms.length}</strong>
        </div>

        <div>
          <span>Total Capacity</span>
          <strong>
            {classrooms.reduce((sum, room) => sum + room.capacity, 0)}
          </strong>
        </div>

        <div>
          <span>Available Facilities</span>
          <strong>{facilities.length}</strong>
        </div>
      </section>

      {message && <div className={styles.success}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}

{showForm && (
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>{editingId ? "Edit Classroom" : "Add New Classroom"}</h2>

            <button
              className={styles.closeButton}
              onClick={() => setShowForm(false)}
              type="button"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <label>
                Room Number
                <input
                  required
                  maxLength={20}
                  value={form.room_number}
                  onChange={(e) =>
                    setForm({ ...form, room_number: e.target.value })
                  }
                  placeholder="e.g. C301"
                />
              </label>

              <label>
                Building
                <input
                  required
                  maxLength={100}
                  value={form.building}
                  onChange={(e) =>
                    setForm({ ...form, building: e.target.value })
                  }
                  placeholder="e.g. Academic Block C"
                />
              </label>

              <label>
                Floor
                <input
                  type="number"
                  min="0"
                  required
                  value={form.floor}
                  onChange={(e) =>
                    setForm({ ...form, floor: Number(e.target.value) })
                  }
                />
              </label>

              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  required
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) })
                  }
                />
              </label>
            </div>

            <div className={styles.facilitySection}>
              <h3>Classroom Facilities</h3>

              <div className={styles.facilityOptions}>
                {facilities.map((facility) => (
                  <label key={facility.facility_id}>
                    <input
                      type="checkbox"
                      checked={form.facility_ids.includes(facility.facility_id)}
                      onChange={() => toggleFacility(facility.facility_id)}
                    />
                    {facility.facility_name}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Classroom"
                  : "Create Classroom"}
            </button>
          </form>
        </section>
      )}

      <section className={styles.classroomSection}>
        <div className={styles.sectionHeader}>
          <h2>All Classrooms</h2>
          <span>{classrooms.length} rooms registered</span>
        </div>

        {loading ? (
          <p className={styles.empty}>Loading classrooms...</p>
        ) : classrooms.length === 0 ? (
          <p className={styles.empty}>No classrooms found.</p>
        ) : (
          <div className={styles.grid}>
            {classrooms.map((room) => (
              <article className={styles.roomCard} key={room.room_id}>
                <div className={styles.roomTop}>
                  <div className={styles.roomIcon}>🏫</div>
                  <span className={styles.roomId}>
                    ROOM #{room.room_id}
                  </span>
                </div>

                <h3>{room.room_number}</h3>
                <p className={styles.building}>{room.building}</p>

                <div className={styles.roomDetails}>
                  <div>
                    <span>Floor</span>
                    <strong>{room.floor}</strong>
                  </div>

                  <div>
                    <span>Capacity</span>
                    <strong>{room.capacity} Students</strong>
                  </div>
                </div>

                <div className={styles.facilityList}>
                  <span className={styles.facilityTitle}>Facilities</span>

                  <div className={styles.badges}>
                    {room.facilities.length > 0 ? (
                      room.facilities.map((facility) => (
                        <span
                          className={styles.facilityBadge}
                          key={facility.facility_id}
                        >
                          {facility.facility_name}
                        </span>
                      ))
                    ) : (
                      <span className={styles.noFacilities}>
                        No facilities listed
                      </span>
                    )}
                  </div>
                </div>

<div className={styles.cardActions}>
  <button
    type="button"
onClick={() => openEditForm(room)}
  >
    Edit
  </button>

  <button
    type="button"
    className={styles.deleteButton}
    onClick={() => deleteClassroom(room.room_id)}
  >
    Delete
  </button>
</div>              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
