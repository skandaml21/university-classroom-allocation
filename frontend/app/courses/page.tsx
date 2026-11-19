"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./courses.module.css";

type Department = {
  department_id: number;
  department_name: string;
};

type Course = {
  course_id: number;
  course_code: string;
  course_name: string;
  department_id: number;
  department_name: string;
  offering_count: number;
};

type Faculty = {
  faculty_id: number;
  name: string;
  email: string;
  department_name: string;
};

type Facility = {
  facility_id: number;
  facility_name: string;
};

type Offering = {
  offering_id: number;
  course_id: number;
  faculty_id: number;
  expected_strength: number;
  semester: string;
  academic_year: string;
  course_code: string;
  course_name: string;
  faculty_name: string;
  department_name: string;
  facilities: {
    facility_id: number;
    facility_name: string;
  }[];
};

type CourseForm = {
  course_code: string;
  course_name: string;
  department_id: string;
};

type OfferingForm = {
  course_id: string;
  faculty_id: string;
  expected_strength: string;
  semester: string;
  academic_year: string;
  facility_ids: number[];
};

const emptyCourseForm: CourseForm = {
  course_code: "",
  course_name: "",
  department_id: "",
};

const emptyOfferingForm: OfferingForm = {
  course_id: "",
  faculty_id: "",
  expected_strength: "",
  semester: "Semester 5",
  academic_year: "2026-2027",
  facility_ids: [],
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [activeTab, setActiveTab] = useState<"courses" | "offerings">("courses");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [courseModal, setCourseModal] = useState(false);
  const [offeringModal, setOfferingModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editingOfferingId, setEditingOfferingId] = useState<number | null>(null);

  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm);
  const [offeringForm, setOfferingForm] = useState<OfferingForm>(emptyOfferingForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCourses() {
    const response = await fetch("/api/courses");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load courses.");
    }

    setCourses(result.courses);
    setDepartments(result.departments);
  }

  async function loadOfferings() {
    const response = await fetch("/api/course-offerings");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load course offerings.");
    }

    setOfferings(result.offerings);
    setFaculty(result.faculty);
    setFacilities(result.facilities);
  }

  async function loadAll() {
    try {
      setError("");
      await Promise.all([loadCourses(), loadOfferings()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const [courseResponse, offeringResponse] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/course-offerings"),
        ]);

        const courseData = await courseResponse.json();
        const offeringData = await offeringResponse.json();

        if (!courseResponse.ok) {
          throw new Error(courseData.message || "Unable to load courses.");
        }

        if (!offeringResponse.ok) {
          throw new Error(
            offeringData.message || "Unable to load course offerings."
          );
        }

        if (active) {
          setCourses(courseData.courses);
          setDepartments(courseData.departments);
          setOfferings(offeringData.offerings);
          setFaculty(offeringData.faculty);
          setFacilities(offeringData.facilities);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialLoad();

    return () => {
      active = false;
    };
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const term = search.toLowerCase();

      const matchesSearch =
        course.course_code.toLowerCase().includes(term) ||
        course.course_name.toLowerCase().includes(term);

      const matchesDepartment =
        departmentFilter === "all" ||
        String(course.department_id) === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [courses, search, departmentFilter]);

  function openAddCourse() {
    setEditingCourseId(null);
    setCourseForm({
      ...emptyCourseForm,
      department_id: departments[0]
        ? String(departments[0].department_id)
        : "",
    });
    setError("");
    setCourseModal(true);
  }

  function openEditCourse(course: Course) {
    setEditingCourseId(course.course_id);
    setCourseForm({
      course_code: course.course_code,
      course_name: course.course_name,
      department_id: String(course.department_id),
    });
    setError("");
    setCourseModal(true);
  }

  function openAddOffering() {
    setEditingOfferingId(null);
    setOfferingForm({
      ...emptyOfferingForm,
      course_id: courses[0] ? String(courses[0].course_id) : "",
      faculty_id: faculty[0] ? String(faculty[0].faculty_id) : "",
    });
    setError("");
    setOfferingModal(true);
  }

  function openEditOffering(offering: Offering) {
    setEditingOfferingId(offering.offering_id);
    setOfferingForm({
      course_id: String(offering.course_id),
      faculty_id: String(offering.faculty_id),
      expected_strength: String(offering.expected_strength),
      semester: offering.semester,
      academic_year: offering.academic_year,
      facility_ids: offering.facilities.map((item) => item.facility_id),
    });
    setError("");
    setOfferingModal(true);
  }

  async function handleCourseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        editingCourseId
          ? `/api/courses/${editingCourseId}`
          : "/api/courses",
        {
          method: editingCourseId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...courseForm,
            course_code: courseForm.course_code.trim().toUpperCase(),
            course_name: courseForm.course_name.trim(),
            department_id: Number(courseForm.department_id),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save course.");
      }

      await loadCourses();
      setCourseModal(false);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOfferingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        editingOfferingId
          ? `/api/course-offerings/${editingOfferingId}`
          : "/api/course-offerings",
        {
          method: editingOfferingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_id: Number(offeringForm.course_id),
            faculty_id: Number(offeringForm.faculty_id),
            expected_strength: Number(offeringForm.expected_strength),
            semester: offeringForm.semester.trim(),
            academic_year: offeringForm.academic_year.trim(),
            facility_ids: offeringForm.facility_ids,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save offering.");
      }

      await loadAll();
      setOfferingModal(false);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save offering.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(course: Course) {
    if (
      !window.confirm(
        `Delete ${course.course_code} - ${course.course_name}?`
      )
    ) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/courses/${course.course_id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete course.");
      }

      await loadCourses();
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete course.");
    }
  }

  async function deleteOffering(offering: Offering) {
    if (
      !window.confirm(
        `Delete the ${offering.course_code} offering assigned to ${offering.faculty_name}?`
      )
    ) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/course-offerings/${offering.offering_id}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete offering.");
      }

      await loadAll();
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete offering.");
    }
  }

  function toggleFacility(facilityId: number) {
    setOfferingForm((current) => ({
      ...current,
      facility_ids: current.facility_ids.includes(facilityId)
        ? current.facility_ids.filter((id) => id !== facilityId)
        : [...current.facility_ids, facilityId],
    }));
  }

  const totalOfferings = offerings.length;
  const totalStudents = offerings.reduce(
    (sum, offering) => sum + Number(offering.expected_strength),
    0
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>UNISPACE / ADMINISTRATION</p>
          <h1>Course Management</h1>
          <p className={styles.subtitle}>
            Manage academic courses, faculty assignments and classroom requirements.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          onClick={activeTab === "courses" ? openAddCourse : openAddOffering}
        >
          ＋ {activeTab === "courses" ? "Add Course" : "Add Offering"}
        </button>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total Courses</span>
          <strong>{courses.length}</strong>
          <small>Registered academic courses</small>
        </div>
        <div className={styles.statCard}>
          <span>Course Offerings</span>
          <strong>{totalOfferings}</strong>
          <small>Active academic offerings</small>
        </div>
        <div className={styles.statCard}>
          <span>Expected Students</span>
          <strong>{totalStudents}</strong>
          <small>Across all course offerings</small>
        </div>
        <div className={styles.statCard}>
          <span>Departments</span>
          <strong>{departments.length}</strong>
          <small>Academic departments</small>
        </div>
      </section>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      <section className={styles.workspace}>
        <div className={styles.tabs}>
          <button
            className={activeTab === "courses" ? styles.activeTab : ""}
            onClick={() => {
              setActiveTab("courses");
              setError("");
            }}
          >
            Course Directory
            <span>{courses.length}</span>
          </button>
          <button
            className={activeTab === "offerings" ? styles.activeTab : ""}
            onClick={() => {
              setActiveTab("offerings");
              setError("");
            }}
          >
            Course Offerings
            <span>{offerings.length}</span>
          </button>
        </div>

        {activeTab === "courses" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Course Directory</h2>
                <p>Manage course codes, names and departments.</p>
              </div>
            </div>

            <div className={styles.filters}>
              <input
                placeholder="Search by course code or name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
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
              <p className={styles.emptyState}>Loading courses...</p>
            ) : filteredCourses.length === 0 ? (
              <p className={styles.emptyState}>No courses found.</p>
            ) : (
              <div className={styles.courseGrid}>
                {filteredCourses.map((course) => (
                  <article className={styles.courseCard} key={course.course_id}>
                    <div className={styles.courseCardTop}>
                      <span className={styles.courseCode}>
                        {course.course_code}
                      </span>
                      <span className={styles.offeringBadge}>
                        {course.offering_count} offerings
                      </span>
                    </div>
                    <h3>{course.course_name}</h3>
                    <p className={styles.departmentName}>
                      {course.department_name}
                    </p>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => openEditCourse(course)}
                      >
                        Edit Course
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => deleteCourse(course)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "offerings" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Course Offerings</h2>
                <p>Manage faculty assignments and classroom requirements.</p>
              </div>
            </div>

            {loading ? (
              <p className={styles.emptyState}>Loading offerings...</p>
            ) : offerings.length === 0 ? (
              <p className={styles.emptyState}>No course offerings found.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Faculty</th>
                      <th>Semester</th>
                      <th>Academic Year</th>
                      <th>Strength</th>
                      <th>Facilities</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offerings.map((offering) => (
                      <tr key={offering.offering_id}>
                        <td>
                          <strong>{offering.course_code}</strong>
                          <small>{offering.course_name}</small>
                        </td>
                        <td>{offering.faculty_name}</td>
                        <td>{offering.semester}</td>
                        <td>{offering.academic_year}</td>
                        <td>{offering.expected_strength}</td>
                        <td>
                          <div className={styles.facilityTags}>
                            {offering.facilities.length > 0
                              ? offering.facilities.map((facility) => (
                                  <span key={facility.facility_id}>
                                    {facility.facility_name}
                                  </span>
                                ))
                              : <small>None</small>}
                          </div>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <button
                              className={styles.editButton}
                              onClick={() => openEditOffering(offering)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={() => deleteOffering(offering)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {courseModal && (
        <div className={styles.modalOverlay}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>COURSE DETAILS</p>
                <h2>{editingCourseId ? "Edit Course" : "Add New Course"}</h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setCourseModal(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCourseSubmit}>
              <label>
                Course Code
                <input
                  value={courseForm.course_code}
                  onChange={(event) =>
                    setCourseForm({ ...courseForm, course_code: event.target.value })
                  }
                  placeholder="e.g. CS401"
                  maxLength={20}
                  required
                />
              </label>

              <label>
                Course Name
                <input
                  value={courseForm.course_name}
                  onChange={(event) =>
                    setCourseForm({ ...courseForm, course_name: event.target.value })
                  }
                  placeholder="Enter course name"
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Department
                <select
                  value={courseForm.department_id}
                  onChange={(event) =>
                    setCourseForm({ ...courseForm, department_id: event.target.value })
                  }
                  required
                >
                  <option value="" disabled>Select department</option>
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

              {error && <div className={styles.errorBanner}>{error}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setCourseModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingCourseId ? "Save Changes" : "Create Course"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {offeringModal && (
        <div className={styles.modalOverlay}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>ACADEMIC ASSIGNMENT</p>
                <h2>{editingOfferingId ? "Edit Offering" : "Add Course Offering"}</h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setOfferingModal(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handleOfferingSubmit}>
              <label>
                Course
                <select
                  value={offeringForm.course_id}
                  onChange={(event) =>
                    setOfferingForm({ ...offeringForm, course_id: event.target.value })
                  }
                  required
                >
                  <option value="" disabled>Select course</option>
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_code} - {course.course_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Faculty Member
                <select
                  value={offeringForm.faculty_id}
                  onChange={(event) =>
                    setOfferingForm({ ...offeringForm, faculty_id: event.target.value })
                  }
                  required
                >
                  <option value="" disabled>Select faculty</option>
                  {faculty.map((member) => (
                    <option key={member.faculty_id} value={member.faculty_id}>
                      {member.name} — {member.department_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Expected Student Strength
                <input
                  type="number"
                  min="1"
                  value={offeringForm.expected_strength}
                  onChange={(event) =>
                    setOfferingForm({
                      ...offeringForm,
                      expected_strength: event.target.value,
                    })
                  }
                  placeholder="e.g. 60"
                  required
                />
              </label>

              <div className={styles.formRow}>
                <label>
                  Semester
                  <input
                    value={offeringForm.semester}
                    onChange={(event) =>
                      setOfferingForm({ ...offeringForm, semester: event.target.value })
                    }
                    placeholder="Semester 5"
                    maxLength={30}
                    required
                  />
                </label>
                <label>
                  Academic Year
                  <input
                    value={offeringForm.academic_year}
                    onChange={(event) =>
                      setOfferingForm({
                        ...offeringForm,
                        academic_year: event.target.value,
                      })
                    }
                    placeholder="2026-2027"
                    maxLength={20}
                    required
                  />
                </label>
              </div>

              <fieldset className={styles.facilityFieldset}>
                <legend>Required Classroom Facilities</legend>
                <p>Select all facilities required for this offering.</p>
                <div className={styles.facilityOptions}>
                  {facilities.map((facility) => (
                    <label key={facility.facility_id}>
                      <input
                        type="checkbox"
                        checked={offeringForm.facility_ids.includes(facility.facility_id)}
                        onChange={() => toggleFacility(facility.facility_id)}
                      />
                      {facility.facility_name}
                    </label>
                  ))}
                </div>
              </fieldset>

              {error && <div className={styles.errorBanner}>{error}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setOfferingModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={saving || courses.length === 0 || faculty.length === 0}
                >
                  {saving ? "Saving..." : editingOfferingId ? "Save Changes" : "Create Offering"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
