import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { readAuthSession } from "../../utils/authStorage";
import { getStudentAcademicOverview } from "../../services/studentAcademic";

const EnrolledCoursesSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;

  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCourses = async () => {
    if (!userId) {
      setErrorMessage("No user found in session. Please log in again.");
      setCourses([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const payload = await getStudentAcademicOverview(userId);
      setCourses(Array.isArray(payload?.enrolled_courses) ? payload.enrolled_courses : []);
    } catch (error) {
      setCourses([]);
      setErrorMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to load enrolled courses."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Enrolled Courses</h1>
            <p className="text-slate-600 mt-1">Current term course list with section and instructor information.</p>
          </div>
          <button
            type="button"
            onClick={loadCourses}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? <p className="text-slate-600">Loading courses...</p> : null}
      </div>

      {!isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                <th className="p-3 text-left">Course</th>
                <th className="p-3 text-left">Credit</th>
                <th className="p-3 text-left">Section</th>
                <th className="p-3 text-left">Teacher</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-slate-600 text-center">
                    No courses found for the current term.
                  </td>
                </tr>
              ) : (
                courses.map((row) => (
                  <tr key={row.enrollment_id} className="border-t border-slate-200 align-top">
                    <td className="p-3">
                      <p className="font-medium text-slate-900">
                        {row.course?.code} - {row.course?.name}
                      </p>
                      {row.is_retake ? (
                        <span className="inline-block mt-1 rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">
                          Retake
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 text-slate-700">{row.course?.credit_hours ?? 0}</td>
                    <td className="p-3 text-slate-700">{row.section_name || "-"}</td>
                    <td className="p-3">
                      {row.teacher ? (
                        <>
                          <p className="font-medium text-slate-900">{row.teacher.name || "-"}</p>
                          <p className="text-xs text-slate-600">
                            {row.teacher.appointment || "Teacher"}
                            {row.teacher.department_code ? ` • ${row.teacher.department_code}` : ""}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.teacher.official_mail || row.teacher.email || "No email"}
                          </p>
                        </>
                      ) : (
                        <p className="text-slate-500">Not assigned yet</p>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="inline-block rounded bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium">
                        {row.enrollment_status || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
};

export default EnrolledCoursesSection;
