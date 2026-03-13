import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap, RefreshCw, Users } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";

const INITIAL_LIMIT = 10;
const EMPTY_ARRAY = [];

const teacherRankWeight = (teacher) => {
  const designation = String(teacher.designation || "").toLowerCase();
  const appointment = String(teacher.appointment || "").toLowerCase();
  const value = designation || appointment;

  if (value.includes("department head")) return 1;
  if (value.includes("professor") && !value.includes("assistant")) return 2;
  if (value.includes("assistant professor")) return 3;
  if (value.includes("lecturer")) return 4;
  if (value.includes("adjunct")) return 5;
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

  const cacheKey = `dept-details-${identifier}`;

  const fetchDetails = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError("");

    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setPayload(JSON.parse(cached));
          setIsLoading(false);
          return;
        }
      }

      const response = await api.get(`/departments/details/${encodeURIComponent(identifier)}`);
      setPayload(response.data);
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
    } catch (requestError) {
      console.error("Failed to load department details:", requestError);
      setError(requestError.response?.data?.message || "Failed to load department details.");
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, identifier]);

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

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard/inspection/departments")}
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
            onClick={() => navigate("/admin/dashboard/inspection/departments")}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="mt-2 text-3xl font-bold text-gray-800">{department.name}</h1>
          <p className="text-gray-500">Code: {department.code}</p>
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

          <div className="border rounded-md overflow-auto max-h-[520px]">
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

          <div className="border rounded-md overflow-auto max-h-[520px]">
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

          <div className="space-y-4 overflow-auto max-h-[520px] pr-1">
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
    </div>
  );
};

export default DepartmentDetails;
