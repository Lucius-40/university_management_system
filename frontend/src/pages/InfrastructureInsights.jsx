import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Filter, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import { sortTermsDepartment } from "../utils/termSort";

const INITIAL_LIMIT = 10;

const appointmentRank = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("department head")) return 1;
  if (text.includes("professor") && !text.includes("assistant")) return 2;
  if (text.includes("assistant professor")) return 3;
  if (text.includes("lecturer")) return 4;
  if (text.includes("adjunct")) return 5;
  return 6;
};

const createInitialFilters = (searchParams) => ({
  department_id: searchParams.get("department_id") || "",
  term_id: searchParams.get("term_id") || "",
  course_id: searchParams.get("course_id") || "",
  section_name: searchParams.get("section_name") || "",
  search: "",
});

const ModalShell = ({ open, title, onClose, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const InfrastructureInsights = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [departmentHead, setDepartmentHead] = useState(null);
  const [headForm, setHeadForm] = useState({ teacher_id: "", start_date: "" });
  const [headSaving, setHeadSaving] = useState(false);
  const [headMessage, setHeadMessage] = useState({ type: "", text: "" });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);

  const [filters, setFilters] = useState(() => createInitialFilters(searchParams));
  const [filterDraft, setFilterDraft] = useState(() => createInitialFilters(searchParams));
  const [expandedSections, setExpandedSections] = useState({
    teaching: false,
    teachers: false,
    students: false,
  });

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [deptRes, termRes, courseRes, sectionRes, assignRes, teacherRes, studentRes] = await Promise.all([
        api.get("/departments"),
        api.get("/terms"),
        api.get("/courses"),
        api.get("/sections"),
        api.get("/teacher-sections/assignments"),
        api.get("/users/inspect", { params: { identity: "teacher" } }),
        api.get("/users/inspect", { params: { identity: "student" } }),
      ]);

      setDepartments(deptRes.data || []);
      setTerms(termRes.data || []);
      setCourses(courseRes.data || []);
      setSections(sectionRes.data || []);
      setTeachingAssignments(assignRes.data?.assignments || []);
      setTeachers(teacherRes.data || []);
      setStudents(studentRes.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to load insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.department_id) next.set("department_id", filters.department_id);
    if (filters.term_id) next.set("term_id", filters.term_id);
    if (filters.course_id) next.set("course_id", filters.course_id);
    if (filters.section_name) next.set("section_name", filters.section_name);
    setSearchParams(next, { replace: true });
  }, [filters.department_id, filters.term_id, filters.course_id, filters.section_name, setSearchParams]);

  useEffect(() => {
    const loadHead = async () => {
      if (!filters.department_id) {
        setDepartmentHead(null);
        setHeadForm({ teacher_id: "", start_date: "" });
        setHeadMessage({ type: "", text: "" });
        return;
      }

      try {
        const response = await api.get(`/departments/${filters.department_id}/heads/current`);
        setDepartmentHead(response.data?.current_head || null);
      } catch {
        setDepartmentHead(null);
      }
    };

    loadHead();
  }, [filters.department_id]);

  const loadCurrentDepartmentHead = async (departmentId) => {
    if (!departmentId) {
      setDepartmentHead(null);
      return;
    }

    try {
      const response = await api.get(`/departments/${departmentId}/heads/current`);
      setDepartmentHead(response.data?.current_head || null);
    } catch {
      setDepartmentHead(null);
    }
  };

  const sortedTerms = useMemo(() => sortTermsDepartment(terms, departments), [terms, departments]);

  const availableTermsForDraft = useMemo(
    () =>
      sortedTerms.filter((term) =>
        filterDraft.department_id ? Number(term.department_id) === Number(filterDraft.department_id) : true
      ),
    [sortedTerms, filterDraft.department_id]
  );

  const availableCoursesForDraft = useMemo(
    () =>
      courses.filter((course) =>
        filterDraft.department_id ? Number(course.department_id) === Number(filterDraft.department_id) : true
      ),
    [courses, filterDraft.department_id]
  );

  const availableSectionsForDraft = useMemo(
    () =>
      sections.filter((section) => {
        if (filterDraft.term_id) {
          return Number(section.term_id) === Number(filterDraft.term_id);
        }
        if (filterDraft.department_id) {
          const term = terms.find((item) => Number(item.id) === Number(section.term_id));
          return Number(term?.department_id) === Number(filterDraft.department_id);
        }
        return true;
      }),
    [sections, terms, filterDraft.term_id, filterDraft.department_id]
  );

  const filteredAssignments = useMemo(() => {
    const q = String(filters.search || "").toLowerCase().trim();
    return teachingAssignments.filter((assignment) => {
      const matchesDepartment =
        !filters.department_id || Number(assignment.department_id) === Number(filters.department_id);
      const matchesTerm = !filters.term_id || Number(assignment.term_id) === Number(filters.term_id);
      const matchesCourse = !filters.course_id || Number(assignment.course_id) === Number(filters.course_id);
      const matchesSection = !filters.section_name || assignment.section_name === filters.section_name;

      if (!matchesDepartment || !matchesTerm || !matchesCourse || !matchesSection) {
        return false;
      }

      if (!q) return true;

      return (
        String(assignment.teacher_name || "").toLowerCase().includes(q) ||
        String(assignment.teacher_appointment || "").toLowerCase().includes(q) ||
        String(assignment.course_code || "").toLowerCase().includes(q) ||
        String(assignment.course_name || "").toLowerCase().includes(q) ||
        String(assignment.section_name || "").toLowerCase().includes(q)
      );
    });
  }, [teachingAssignments, filters]);

  const filteredTeachers = useMemo(() => {
    const q = String(filters.search || "").toLowerCase().trim();

    const selectedDept = filters.department_id
      ? departments.find(d => Number(d.id) === Number(filters.department_id))
      : null;

    return teachers
      .filter((teacher) => {
        if (selectedDept && teacher.department_code !== selectedDept.code) {
          return false;
        }

        if (!q) return true;

        return (
          String(teacher.full_name || teacher.name || "").toLowerCase().includes(q) ||
          String(teacher.appointment || "").toLowerCase().includes(q) ||
          String(teacher.department_code || "").toLowerCase().includes(q)
        );
      })
      .sort((left, right) => {
        const rankDiff = appointmentRank(left.appointment) - appointmentRank(right.appointment);
        if (rankDiff !== 0) return rankDiff;
        return String(left.full_name || left.name || "").localeCompare(String(right.full_name || right.name || ""));
      });
  }, [teachers, filters, departments]);

  const departmentTeachers = useMemo(() => {
    if (!filters.department_id) return [];

    const selectedDept = departments.find(d => Number(d.id) === Number(filters.department_id));
    if (!selectedDept) return [];

    return teachers
      .filter((teacher) => teacher.department_code === selectedDept.code)
      .sort((left, right) => {
        const rankDiff = appointmentRank(left.appointment) - appointmentRank(right.appointment);
        if (rankDiff !== 0) return rankDiff;
        return String(left.full_name || left.name || "").localeCompare(
          String(right.full_name || right.name || "")
        );
      });
  }, [teachers, filters.department_id, departments]);

  const filteredStudents = useMemo(() => {
    const q = String(filters.search || "").toLowerCase().trim();
    
    const selectedDept = filters.department_id 
      ? departments.find(d => Number(d.id) === Number(filters.department_id))
      : null;

    return students
      .filter((student) => {
        if (selectedDept && student.department_code !== selectedDept.code) {
          return false;
        }

        if (filters.term_id && Number(student.term_id) !== Number(filters.term_id)) {
          return false;
        }

        if (filters.section_name) {
          const sectionNames = String(student.section_names || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
          if (!sectionNames.includes(filters.section_name)) {
            return false;
          }
        }

        if (!q) return true;

        return (
          String(student.full_name || "").toLowerCase().includes(q) ||
          String(student.roll_number || "").toLowerCase().includes(q) ||
          String(student.department_code || "").toLowerCase().includes(q)
        );
      })
      .sort((left, right) => {
        const leftTerm = Number(left.term_number || 0);
        const rightTerm = Number(right.term_number || 0);
        if (leftTerm !== rightTerm) return leftTerm - rightTerm;
        return String(left.roll_number || "").localeCompare(String(right.roll_number || ""));
      });
  }, [students, filters]);

  const selectedDepartment = departments.find(
    (department) => Number(department.id) === Number(filters.department_id)
  );

  const handleAssignDepartmentHead = async () => {
    if (!filters.department_id) {
      setHeadMessage({ type: "error", text: "Select a department first." });
      return;
    }

    if (!headForm.teacher_id) {
      setHeadMessage({ type: "error", text: "Select a teacher to assign as department head." });
      return;
    }

    setHeadSaving(true);
    setHeadMessage({ type: "", text: "" });

    try {
      await api.post(`/departments/${filters.department_id}/heads`, {
        teacher_id: Number(headForm.teacher_id),
        start_date: headForm.start_date || undefined,
      });

      await loadCurrentDepartmentHead(filters.department_id);
      await fetchAll();
      setHeadMessage({ type: "success", text: "Department head reassigned successfully." });
      setHeadForm({ teacher_id: "", start_date: "" });
      setIsHeadModalOpen(false);
    } catch (requestError) {
      setHeadMessage({
        type: "error",
        text: requestError.response?.data?.error || "Failed to reassign department head.",
      });
    } finally {
      setHeadSaving(false);
    }
  };

  const activeFilterCount = useMemo(
    () =>
      [
        filters.department_id,
        filters.term_id,
        filters.course_id,
        filters.section_name,
        String(filters.search || "").trim(),
      ].filter(Boolean).length,
    [filters]
  );

  const openFilterModal = () => {
    setFilterDraft({ ...filters });
    setIsFilterModalOpen(true);
  };

  const applyFilterDraft = () => {
    setFilters({ ...filterDraft });
    setIsFilterModalOpen(false);
  };

  const clearFilterDraft = () => {
    setFilterDraft({
      department_id: "",
      term_id: "",
      course_id: "",
      section_name: "",
      search: "",
    });
  };

  const openHeadModal = () => {
    if (!selectedDepartment) return;
    setHeadMessage({ type: "", text: "" });
    setIsHeadModalOpen(true);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Infrastructure Insights</h1>
          <p className="text-sm text-slate-600 mt-1">Centralized filtered view for infrastructure and entities.</p>
        </div>
        <div className="flex items-center gap-2">
          
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openFilterModal}
            className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            <Filter size={16} />
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}


      {selectedDepartment && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Department Overview</h2>
              <p className="text-sm text-slate-600 mt-1">{selectedDepartment.code} - {selectedDepartment.name}</p>
              <p className="text-sm text-slate-600 mt-1">
                  Department Head: {departmentHead?.name || "Not assigned"}
              </p>

              {headMessage.text && (
                  <p
                  className={`mt-3 text-sm ${
                      headMessage.type === "error" ? "text-red-600" : "text-green-700"
                  }`}
                  >
                  {headMessage.text}
                  </p>
              )}
            </div>
            <button
                type="button"
                onClick={openHeadModal}
                disabled={!selectedDepartment}
                className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
                Reassign Head
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Teaching Overview</h2>
          <button
            type="button"
            onClick={() => toggleSection("teaching")}
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {expandedSections.teaching ? (
              <>
                <ChevronUp size={16} /> Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} /> Show More ({filteredAssignments.length})
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Term</th>
                <th className="p-3 text-left">Course</th>
                <th className="p-3 text-left">Section</th>
                <th className="p-3 text-left">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-3 text-center text-slate-500">No teaching assignments found.</td>
                </tr>
              ) : (
                (expandedSections.teaching ? filteredAssignments : filteredAssignments.slice(0, INITIAL_LIMIT)).map((assignment) => (
                  <tr key={`${assignment.course_offering_id}-${assignment.section_name}`} className="border-t">
                    <td className="p-3">{assignment.department_code}</td>
                    <td className="p-3">{assignment.term_number}</td>
                    <td className="p-3">{assignment.course_code} - {assignment.course_name}</td>
                    <td className="p-3">{assignment.section_name}</td>
                    <td className="p-3">{assignment.teacher_name} ({assignment.teacher_appointment || "-"})</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Teachers</h2>
          <button
            type="button"
            onClick={() => toggleSection("teachers")}
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {expandedSections.teachers ? (
              <>
                <ChevronUp size={16} /> Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} /> Show More ({filteredTeachers.length})
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Appointment</th>
                <th className="p-3 text-left">Department</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-3 text-center text-slate-500">No teachers found.</td>
                </tr>
              ) : (
                (expandedSections.teachers ? filteredTeachers : filteredTeachers.slice(0, INITIAL_LIMIT)).map((teacher) => {
                  const teacherId = teacher.user_id || teacher.teacher_id || teacher.id;
                  return (
                  <tr
                    key={teacherId || `${teacher.full_name || teacher.name}-${teacher.department_code || "dept"}`}
                    className={`border-t ${teacherId ? "hover:bg-slate-50 cursor-pointer" : ""}`}
                    onClick={() => {
                      if (!teacherId) return;
                      navigate(`/admin/dashboard/profiles/teacher/${teacherId}`);
                    }}
                  >
                    <td className="p-3">{teacher.full_name || teacher.name}</td>
                    <td className="p-3">{teacher.appointment || "-"}</td>
                    <td className="p-3">{teacher.department_code || "-"}</td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Students</h2>
          <button
            type="button"
            onClick={() => toggleSection("students")}
            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {expandedSections.students ? (
              <>
                <ChevronUp size={16} /> Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} /> Show More ({filteredStudents.length})
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Roll</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Term</th>
                <th className="p-3 text-left">Sections</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-3 text-center text-slate-500">No students found.</td>
                </tr>
              ) : (
                (expandedSections.students ? filteredStudents : filteredStudents.slice(0, INITIAL_LIMIT)).map((student) => {
                  const studentId = student.user_id || student.student_id || student.id;
                  return (
                  <tr
                    key={studentId || `${student.roll_number}-${student.full_name}`}
                    className={`border-t ${studentId ? "hover:bg-slate-50 cursor-pointer" : ""}`}
                    onClick={() => {
                      if (!studentId) return;
                      navigate(`/admin/dashboard/profiles/student/${studentId}`);
                    }}
                  >
                    <td className="p-3">{student.full_name}</td>
                    <td className="p-3">{student.roll_number || "-"}</td>
                    <td className="p-3">{student.department_code || "-"}</td>
                    <td className="p-3">{student.term_number ? `Term ${student.term_number}` : "-"}</td>
                    <td className="p-3">{student.section_names || "-"}</td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalShell open={isFilterModalOpen} title="Filter Insights" onClose={() => setIsFilterModalOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select
                value={filterDraft.department_id}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    department_id: event.target.value,
                    term_id: "",
                    course_id: "",
                    section_name: "",
                  }))
                }
                className="w-full rounded border border-slate-300 p-2"
              >
                <option value="">All Departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} - {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
              <select
                value={filterDraft.term_id}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, term_id: event.target.value, section_name: "" }))
                }
                className="w-full rounded border border-slate-300 p-2"
              >
                <option value="">All Terms</option>
                {availableTermsForDraft.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.department_code || "Dept"} - Term {term.term_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
              <select
                value={filterDraft.course_id}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, course_id: event.target.value }))
                }
                className="w-full rounded border border-slate-300 p-2"
              >
                <option value="">All Courses</option>
                {availableCoursesForDraft.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <select
                value={filterDraft.section_name}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, section_name: event.target.value }))
                }
                className="w-full rounded border border-slate-300 p-2"
              >
                <option value="">All Sections</option>
                {availableSectionsForDraft
                  .slice()
                  .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))
                  .map((section) => (
                    <option key={`${section.term_id}-${section.name}`} value={section.name}>
                      {section.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quick Search</label>
            <input
              type="text"
              value={filterDraft.search}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Search teachers, students, courses, sections"
              className="w-full rounded border border-slate-300 p-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={clearFilterDraft}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyFilterDraft}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={isHeadModalOpen} title="Reassign Department Head" onClose={() => setIsHeadModalOpen(false)}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await handleAssignDepartmentHead();
          }}
          className="space-y-4"
        >
          <div>
            <p className="text-sm text-slate-700">
              {selectedDepartment
                ? `${selectedDepartment.code} - ${selectedDepartment.name}`
                : "Select a department first from filters."}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Current head: {departmentHead?.name || "Not assigned"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teacher</label>
            <select
              value={headForm.teacher_id}
              onChange={(event) =>
                setHeadForm((previous) => ({ ...previous, teacher_id: event.target.value }))
              }
              className="w-full rounded border border-slate-300 p-2"
              disabled={headSaving}
              required
            >
              <option value="">Select teacher for department head</option>
              {departmentTeachers.map((teacher) => {
                const teacherId = teacher.user_id || teacher.teacher_id || teacher.id;
                return (
                  <option key={teacherId} value={teacherId}>
                    {teacher.full_name || teacher.name} ({teacher.appointment || "Teacher"})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
            <input
              type="date"
              value={headForm.start_date}
              onChange={(event) =>
                setHeadForm((previous) => ({ ...previous, start_date: event.target.value }))
              }
              className="w-full rounded border border-slate-300 p-2"
              disabled={headSaving}
            />
          </div>

          {headMessage.text && (
            <p className={`text-sm ${headMessage.type === "error" ? "text-red-600" : "text-green-700"}`}>
              {headMessage.text}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsHeadModalOpen(false)}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={headSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={headSaving}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
            >
              {headSaving ? "Saving..." : "Reassign Head"}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};

export default InfrastructureInsights;