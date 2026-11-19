"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./faculty.module.css";

type Course = {
  course_code: string;
  course_name: string;
};

type Faculty = {
  faculty_id: number;
  user_id: number;
  name: string;
  email: string;
  department_id: number;
  department_name: string;
  assigned_courses: number;
  courses: Course[];
};

type Department = {
  department_id: number;
  department_name: string;
};

type FacultyForm = {
  name: string;
  email: string;
  password: string;
  department_id: string;
};

const emptyForm: FacultyForm = {
  name: "",
  email: "",
  password: "",
  department_id: "",
};

export default function FacultyPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [form, setForm] = useState<FacultyForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadFaculty() {
    try {
      setError("");

      const response = await fetch("/api/faculty");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load faculty.");
      }

      setFaculty(result.faculty);
      setDepartments(result.departments);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load faculty."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const response = await fetch("/api/faculty");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load faculty.");
        }

        if (active) {
          setFaculty(result.faculty);
          setDepartments(result.departments);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load faculty."
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

  const filteredFaculty = useMemo(() => {
    return faculty.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase());

      const matchesDepartment =
        departmentFilter === "all" ||
        String(member.department_id) === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [faculty, search, departmentFilter]);

  function openAddModal() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      department_id: departments[0]
        ? String(departments[0].department_id)
        : "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(member: Faculty) {
    setEditingId(member.faculty_id);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      department_id: String(member.department_id),
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        department_id: Number(form.department_id),
        ...(!editingId ? { password: form.password } : {}),
      };

      const response = await fetch(
        editingId ? `/api/faculty/${editingId}` : "/api/faculty",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save faculty details.");
      }

      setSuccess(result.message || "Faculty details saved successfully.");
      await loadFaculty();
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member: Faculty) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${member.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/faculty/${member.faculty_id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete faculty member.");
      }

      setSuccess(result.message || "Faculty member deleted.");
      await loadFaculty();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete faculty."
      );
    }
  }

  const totalCourses = faculty.reduce(
    (total, member) => total + Number(member.assigned_courses),
    0
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>UNISPACE / ADMINISTRATION</p>
          <h1>Faculty Management</h1>
          <p className={styles.subtitle}>
            Manage faculty profiles, departments and course assignments.
          </p>
        </div>

        <button className={styles.addButton} onClick={openAddModal}>
          <span>＋</span> Add Faculty
        </button>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total Faculty</span>
          <strong>{faculty.length}</strong>
          <small>Registered faculty members</small>
        </div>

        <div className={styles.statCard}>
          <span>Departments</span>
          <strong>{departments.length}</strong>
          <small>Available academic departments</small>
        </div>

        <div className={styles.statCard}>
          <span>Course Assignments</span>
          <strong>{totalCourses}</strong>
          <small>Total faculty course offerings</small>
        </div>
      </section>

      {error && !modalOpen && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {success && (
        <div className={styles.successBanner}>{success}</div>
      )}

      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <h2>Faculty Directory</h2>
            <p>View and manage all registered faculty members.</p>
          </div>
          <span className={styles.resultCount}>
            {filteredFaculty.length} members
          </span>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map((department) => (
              <option
                key={department.department_id}
                value={department.department_id}
              >
                {department.department_name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading faculty members...</div>
        ) : filteredFaculty.length === 0 ? (
          <div className={styles.emptyState}>
            <span>👩‍🏫</span>
            <h3>No faculty members found</h3>
            <p>Try changing your search or department filter.</p>
          </div>
        ) : (
          <div className={styles.facultyGrid}>
            {filteredFaculty.map((member) => (
              <article className={styles.facultyCard} key={member.faculty_id}>
                <div className={styles.cardTop}>
                  <div className={styles.avatar}>
                    {member.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  <span className={styles.roleBadge}>FACULTY</span>
                </div>

                <h3>{member.name}</h3>
                <p className={styles.email}>{member.email}</p>

                <div className={styles.department}>
                  <span>Department</span>
                  <strong>{member.department_name}</strong>
                </div>

                <div className={styles.courseSection}>
                  <div className={styles.courseHeading}>
                    <span>Assigned Courses</span>
                    <strong>{member.assigned_courses}</strong>
                  </div>

                  {member.courses.length > 0 ? (
                    <div className={styles.courseTags}>
                      {member.courses.map((course) => (
                        <span key={course.course_code}>
                          {course.course_code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noCourses}>No courses assigned yet</p>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={styles.editButton}
                    onClick={() => openEditModal(member)}
                  >
                    Edit Details
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(member)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>FACULTY DETAILS</p>
                <h2 id="faculty-modal-title">
                  {editingId ? "Edit Faculty" : "Add New Faculty"}
                </h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="e.g. Dr. Ananya Rao"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  placeholder="faculty@university.edu"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  maxLength={150}
                  required
                />
              </label>

              {!editingId && (
                <label>
                  Initial Password
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    minLength={8}
                    maxLength={100}
                    required
                  />
                  <small>
                    The password will be securely hashed before storage.
                  </small>
                </label>
              )}

              <label>
                Department
                <select
                  value={form.department_id}
                  onChange={(event) =>
                    setForm({ ...form, department_id: event.target.value })
                  }
                  required
                >
                  <option value="" disabled>
                    Select a department
                  </option>
                  {departments.map((department) => (
                    <option
                      key={department.department_id}
                      value={department.department_id}
                    >
                      {department.department_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={saving || departments.length === 0}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Faculty"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
