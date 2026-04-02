import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { readAuthSession } from "../../utils/authStorage";
import { getStudentAcademicOverview } from "../../services/studentAcademic";

const ProgressTrackerSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProgress = async () => {
    if (!userId) {
      setErrorMessage("No user found in session. Please log in again.");
      setRows([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const payload = await getStudentAcademicOverview(userId);
      setRows(Array.isArray(payload?.progress_tracker) ? payload.progress_tracker : []);
    } catch (error) {
      setRows([]);
      setErrorMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to load progress tracker."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Progress Tracker</h1>
            <p className="text-slate-600 mt-1">Published CT, Attendance, Midterm, and Final components for your current term.</p>
          </div>
          <button
            type="button"
            onClick={loadProgress}
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
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-slate-700">
          Loading progress...
        </div>
      ) : null}

      {!isLoading && rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-slate-700">
          No published mark components found for current term.
        </div>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className="space-y-4">
          {rows.map((row) => (
            <article key={row.enrollment_id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {row.course_code} - {row.course_name}
                  </h3>
                  <p className="text-sm text-slate-600">Enrollment: {row.enrollment_status || "-"}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-slate-600">Progress</p>
                  <p className="font-semibold text-slate-900">
                    {row.progress?.obtained ?? 0} / {row.progress?.total ?? 0}
                    {row.progress?.percentage != null ? ` (${row.progress.percentage}%)` : ""}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-800">
                    <tr>
                      <th className="p-3 text-left">Component</th>
                      <th className="p-3 text-left">Obtained</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(row.marks || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-slate-600">
                          No published components yet.
                        </td>
                      </tr>
                    ) : (
                      (row.marks || []).map((mark) => (
                        <tr key={mark.id} className="border-t border-slate-200">
                          <td className="p-3">{mark.type}</td>
                          <td className="p-3">{mark.marks_obtained}</td>
                          <td className="p-3">{mark.total_marks}</td>
                          <td className="p-3">{mark.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>
                  Final Snapshot: {row.term_result?.grade || "-"}
                  {row.term_result?.percentage != null ? ` (${row.term_result.percentage}%)` : ""}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ProgressTrackerSection;
