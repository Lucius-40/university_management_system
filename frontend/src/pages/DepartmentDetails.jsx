import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap, RefreshCw, Users, X } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";
import { formatDateDisplay } from "../utils/dateFormat";

const INITIAL_LIMIT = 10;
const EMPTY_ARRAY = [];

const teacherRankWeight = (teacher) => {
  const appointment = String(teacher.appointment || "").toLowerCase();

  if (appointment.includes("department head")) return 1;
  if (appointment.includes("professor") && !appointment.includes("assistant")) return 2;
  if (appointment.includes("assistant professor")) return 3;
  if (appointment.includes("lecturer")) return 4;
  if (appointment.includes("adjunct")) return 5;
  return 6;
};

const DepartmentDetails = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [courseSearch, setCourseSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const [showAllCourses, setShowAllCourses] = useState(false);
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState({});
  const [headForm, setHeadForm] = useState({ teacher_id: "", start_date: "" });
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [headMessage, setHeadMessage] = useState({ type: "", text: "" });
  const [headSaving, setHeadSaving] = useState(false);
  const [entryEndDates, setEntryEndDates] = useState({});
  const [currentDepartmentHead, setCurrentDepartmentHead] = useState(null);
  const [departmentHeadHistory, setDepartmentHeadHistory] = useState(EMPTY_ARRAY);

  const cacheKey = `dept-details-${identifier}`;

  const fetchHeadData = useCallback(async (deptId) => {
    if (!deptId) {
      setCurrentDepartmentHead(null);
      setDepartmentHeadHistory(EMPTY_ARRAY);
      return;
    }

    const [currentRes, historyRes] = await Promise.all([
      api.get(`/departments/${deptId}/heads/current`),
      api.get(`/departments/${deptId}/heads/history`),
    ]);

    setCurrentDepartmentHead(currentRes.data?.current_head || null);
    setDepartmentHeadHistory(historyRes.data?.history || EMPTY_ARRAY);
  }, []);

  const fetchDetails = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError("");

    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cachedPayload = JSON.parse(cached);
          setPayload(cachedPayload);
          await fetchHeadData(Number(cachedPayload?.department?.id || 0));
        }
      }

      const response = await api.get(`/departments/details/${encodeURIComponent(identifier)}`);
      setPayload(response.data);
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
      await fetchHeadData(Number(response.data?.department?.id || 0));
    } catch (requestError) {
      console.error("Failed to load department details:", requestError);
      setError(requestError.response?.data?.message || "Failed to load department details.");
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, fetchHeadData, identifier]);

  useEffect(() => {
    setShowAllCourses(false);
    setShowAllTeachers(false);
    setExpandedTerms({});
    fetchDetails();
  }, [fetchDetails, identifier]);

  const department = payload?.department || null;
  const allCourses = payload?.courses ?? EMPTY_ARRAY;
  const allTeachers = payload?.teachers ?? EMPTY_ARRAY;
  const allStudents = payload?.students ?? EMPTY_ARRAY;
  const allStudentsByTerm = payload?.students_by_term ?? EMPTY_ARRAY;
  const departmentId = Number(department?.id || 0);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.toLowerCase();
    return allCourses.filter(
      (course) =>
        course.code?.toLowerCase().includes(q) ||
        course.name?.toLowerCase().includes(q) ||
        String(course.type || "").toLowerCase().includes(q)
    );
  }, [allCourses, courseSearch]);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.toLowerCase();
    return [...allTeachers]
      .filter(
        (teacher) =>
          teacher.name?.toLowerCase().includes(q) ||
          teacher.email?.toLowerCase().includes(q) ||
          String(teacher.designation || "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const rankDiff = teacherRankWeight(a) - teacherRankWeight(b);
        if (rankDiff !== 0) return rankDiff;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [allTeachers, teacherSearch]);

  const filteredStudentsByTerm = useMemo(() => {
    const q = studentSearch.toLowerCase();

    return allStudentsByTerm
      .map((termGroup) => ({
        ...termGroup,
        students: (termGroup.students || []).filter(
          (student) =>
            student.name?.toLowerCase().includes(q) ||
            student.email?.toLowerCase().includes(q) ||
            student.roll_number?.toLowerCase().includes(q)
        ),
      }))
      .filter((termGroup) => (termGroup.students || []).length > 0)
      .sort((a, b) => b.term_number - a.term_number);
  }, [allStudentsByTerm, studentSearch]);

  const visibleCourses = showAllCourses ? filteredCourses : filteredCourses.slice(0, INITIAL_LIMIT);
  const visibleTeachers = showAllTeachers ? filteredTeachers : filteredTeachers.slice(0, INITIAL_LIMIT);

  const availableHeadTeachers = useMemo(() => {
    return [...allTeachers].sort((left, right) =>
      String(left.name || "").localeCompare(String(right.name || ""))
    );
  }, [allTeachers]);

  const handleHeadAssign = async (event) => {
    event.preventDefault();

    if (!departmentId) return;

    if (!headForm.teacher_id) {
      setHeadMessage({ type: "error", text: "Teacher is required." });
      return;
    }

    try {
      setHeadSaving(true);
      setHeadMessage({ type: "", text: "" });
      const payloadToSend = {
        teacher_id: Number(headForm.teacher_id),
      };

      if (headForm.start_date) {
        payloadToSend.start_date = headForm.start_date;
      }

      await api.post(`/departments/${departmentId}/heads`, payloadToSend);

      setHeadForm({ teacher_id: "", start_date: "" });
      setIsReassignModalOpen(false);
      setHeadMessage({ type: "success", text: "Department head assigned successfully." });
      await fetchDetails(true);
    } catch (requestError) {
      setHeadMessage({
        type: "error",
        text: requestError.response?.data?.error || "Failed to assign department head.",
      });
    } finally {
      setHeadSaving(false);
    }
  };

  const handleEndDateUpdate = async (entryId) => {
    if (!departmentId) return;

    const endDate = entryEndDates[entryId];
    if (!endDate) {
      setHeadMessage({ type: "error", text: "Please select an end date first." });
      return;
    }

    try {
      setHeadSaving(true);
      setHeadMessage({ type: "", text: "" });
      await api.patch(`/departments/${departmentId}/heads/${entryId}`, {
        end_date: endDate,
      });
      setHeadMessage({ type: "success", text: "Department head timeline updated." });
      await fetchDetails(true);
    } catch (requestError) {
      setHeadMessage({
        type: "error",
        text: requestError.response?.data?.error || "Failed to update department head timeline.",
      });
    } finally {
      setHeadSaving(false);
    }
  };

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard/departments")}
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Back to departments
        </button>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-600">
        Department not found.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="bg-white border rounded-lg p-6 flex flex-col md:flex-row justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard/departments")}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="mt-2 text-3xl font-bold text-gray-800">{department.name}</h1>
          <div className="mt-1 flex flex-col gap-2 text-gray-500">
            <p>Code: {department.code}</p>
            <div className="flex items-center justify-between gap-3 rounded px-3 py-2 text-sm text-slate-700 w-fit">
              <div className="min-w-0">
                <span className="font-medium">Head:</span>{" "}
                {currentDepartmentHead ? (
                  <>
                    <span className="font-semibold text-slate-900">{currentDepartmentHead.name}</span>
                    <span className="ml-2 text-slate-500">since {formatDateDisplay(currentDepartmentHead.start_date)}</span>
                  </>
                ) : (
                  <span className="text-slate-500">Not assigned</span>
                )}
              </div>
              <button
                type="button"
                className="rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                onClick={() => {
                  setHeadMessage({ type: "", text: "" });
                  setHeadForm({
                    teacher_id: currentDepartmentHead?.teacher_id ? String(currentDepartmentHead.teacher_id) : "",
                    start_date: "",
                  });
                  setIsReassignModalOpen(true);
                }}
              >
                Reassign
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-24 text-center rounded border bg-blue-50 border-blue-100 p-3">
            <p className="text-2xl font-bold text-blue-700">{allCourses.length}</p>
            <p className="text-xs uppercase text-blue-700">Courses</p>
          </div>
          <div className="w-24 text-center rounded border bg-emerald-50 border-emerald-100 p-3">
            <p className="text-2xl font-bold text-emerald-700">{allTeachers.length}</p>
            <p className="text-xs uppercase text-emerald-700">Teachers</p>
          </div>
          <div className="w-24 text-center rounded border bg-violet-50 border-violet-100 p-3">
            <p className="text-2xl font-bold text-violet-700">{allStudents.length}</p>
            <p className="text-xs uppercase text-violet-700">Students</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200 text-gray-700"
            onClick={() => fetchDetails(true)}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white border rounded-lg p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-blue-700">
            <BookOpen size={18} />
            <h2 className="font-bold text-lg text-gray-800">Courses</h2>
          </div>

          <SearchBar
            value={courseSearch}
            onChange={(event) => setCourseSearch(event.target.value)}
            placeholder="Search courses"
            className="mb-4"
          />

          <div className="border rounded-md overflow-auto max-h-130">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 sticky top-0">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Credits</th>
                </tr>
              </thead>
              <tbody>
                {visibleCourses.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-3 text-center text-gray-500">
                      No courses found
                    </td>
                  </tr>
                ) : (
                  visibleCourses.map((course) => (
                    <tr key={course.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-medium">{course.code}</td>
                      <td className="p-2">{course.name}</td>
                      <td className="p-2 capitalize">{course.type}</td>
                      <td className="p-2">{course.credit_hours}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredCourses.length > INITIAL_LIMIT && (
            <button
              type="button"
              className="mt-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-blue-700 text-sm font-medium"
              onClick={() => setShowAllCourses((prev) => !prev)}
            >
              {showAllCourses ? "Show Less" : `Show All (${filteredCourses.length})`}
            </button>
          )}
        </section>

        <section className="bg-white border rounded-lg p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
            <Users size={18} />
            <h2 className="font-bold text-lg text-gray-800">Teachers</h2>
          </div>

          <SearchBar
            value={teacherSearch}
            onChange={(event) => setTeacherSearch(event.target.value)}
            placeholder="Search teachers"
            className="mb-4"
          />

          <div className="border rounded-md overflow-auto max-h-130">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 sticky top-0">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Designation</th>
                  <th className="text-left p-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {visibleTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-3 text-center text-gray-500">
                      No teachers found
                    </td>
                  </tr>
                ) : (
                  visibleTeachers.map((teacher) => (
                    <tr
                      key={teacher.user_id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/dashboard/profiles/teacher/${teacher.user_id}`)}
                    >
                      <td className="p-2 font-medium text-emerald-700">{teacher.name}</td>
                      <td className="p-2">{teacher.designation || teacher.appointment}</td>
                      <td className="p-2">{teacher.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredTeachers.length > INITIAL_LIMIT && (
            <button
              type="button"
              className="mt-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-emerald-700 text-sm font-medium"
              onClick={() => setShowAllTeachers((prev) => !prev)}
            >
              {showAllTeachers ? "Show Less" : `Show All (${filteredTeachers.length})`}
            </button>
          )}
        </section>

        <section className="bg-white border rounded-lg p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-violet-700">
            <GraduationCap size={18} />
            <h2 className="font-bold text-lg text-gray-800">Students By Term</h2>
          </div>

          <SearchBar
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Search students"
            className="mb-4"
          />

          <div className="space-y-4 overflow-auto max-h-130 pr-1">
            {filteredStudentsByTerm.length === 0 ? (
              <div className="text-center text-sm text-gray-500 border rounded-md p-3">No students found</div>
            ) : (
              filteredStudentsByTerm.map((termGroup) => {
                const expanded = Boolean(expandedTerms[termGroup.term_id]);
                const students = termGroup.students || [];
                const visibleStudents = expanded ? students : students.slice(0, INITIAL_LIMIT);

                return (
                  <div key={termGroup.term_id} className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 font-semibold text-sm text-gray-700 flex items-center justify-between">
                      <span>Term {termGroup.term_number}</span>
                      <span className="text-xs text-gray-500">{students.length} students</span>
                    </div>

                    <table className="w-full text-sm">
                      <thead className="bg-white text-gray-700">
                        <tr>
                          <th className="text-left p-2">Roll</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStudents.map((student) => (
                          <tr
                            key={student.user_id}
                            className="border-t hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/admin/dashboard/profiles/student/${student.user_id}`)}
                          >
                            <td className="p-2">{student.roll_number}</td>
                            <td className="p-2 font-medium text-violet-700">{student.name}</td>
                            <td className="p-2">{student.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {students.length > INITIAL_LIMIT && (
                      <button
                        type="button"
                        className="w-full py-2 border-t bg-gray-50 hover:bg-gray-100 text-violet-700 text-sm font-medium"
                        onClick={() =>
                          setExpandedTerms((prev) => ({
                            ...prev,
                            [termGroup.term_id]: !prev[termGroup.term_id],
                          }))
                        }
                      >
                        {expanded ? "Show Less" : `Show All (${students.length})`}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Reassign Department Head</h3>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setIsReassignModalOpen(false);
                  setHeadForm({ teacher_id: "", start_date: "" });
                }}
                disabled={headSaving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleHeadAssign} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Teacher</label>
                <select
                  required
                  value={headForm.teacher_id}
                  onChange={(event) => setHeadForm((prev) => ({ ...prev, teacher_id: event.target.value }))}
                  className="w-full p-2 border rounded"
                  disabled={headSaving}
                >
                  <option value="">Select Teacher</option>
                  {availableHeadTeachers.map((teacher) => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {teacher.name} ({teacher.appointment || "Teacher"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Start Date (optional)
                </label>
                <input
                  type="date"
                  value={headForm.start_date}
                  onChange={(event) => setHeadForm((prev) => ({ ...prev, start_date: event.target.value }))}
                  className="w-full p-2 border rounded"
                  disabled={headSaving}
                />
                <p className="mt-1 text-xs text-slate-500">
                  If empty, current date will be used automatically.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setIsReassignModalOpen(false);
                    setHeadForm({ teacher_id: "", start_date: "" });
                  }}
                  disabled={headSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={headSaving}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {headSaving ? "Saving..." : "Confirm Reassign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDetails;
