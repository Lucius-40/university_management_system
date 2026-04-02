import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { readAuthSession } from "../../utils/authStorage";
import { formatDateDisplay } from "../../utils/dateFormat";
import { getStudentAcademicOverview } from "../../services/studentAcademic";

const AcademicOverviewSection = () => {
  const { user } = useAuth();
  const fallbackSession = useMemo(() => readAuthSession(), []);
  const sessionUser = user || fallbackSession.user;
  const userId = sessionUser?.id;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOverview = async () => {
    if (!userId) {
      setErrorMessage("No user found in session. Please log in again.");
      setData(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const payload = await getStudentAcademicOverview(userId);
      setData(payload);
    } catch (error) {
      setData(null);
      setErrorMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to load academic overview."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const term = data?.academic_overview?.term || null;
  const department = data?.academic_overview?.department || null;
  const credits = data?.academic_overview?.credits || null;
  const advisor = data?.academic_overview?.advisor || null;
  const student = data?.student || null;

  return (
    <section className="max-w-7xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Academic Overview</h1>
            <p className="text-slate-600 mt-1">Current term summary, advisor details, and credit status.</p>
          </div>
          <button
            type="button"
            onClick={loadOverview}
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
          Loading overview...
        </div>
      ) : null}

      {!isLoading && data ? (
        <>
          <article className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                {student?.profile_image_url ? (
                  <img
                    src={student.profile_image_url}
                    alt={student?.name || "Student"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                    No Image
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{student?.name || "-"}</h2>
                <p className="text-sm text-slate-600">Roll: {student?.roll_number || "-"}</p>
                <p className="text-sm text-slate-600">Email: {student?.official_mail || student?.email || "-"}</p>
              </div>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Current Term</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Term</p>
                <p className="font-semibold text-slate-900 mt-1">{term?.term_number ? `Term ${term.term_number}` : "N/A"}</p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Department</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {department?.code ? `${department.code} - ${department?.name || ""}` : department?.name || "N/A"}
                </p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Start Date</p>
                <p className="font-semibold text-slate-900 mt-1">{formatDateDisplay(term?.start_date, "N/A")}</p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">End Date</p>
                <p className="font-semibold text-slate-900 mt-1">{formatDateDisplay(term?.end_date, "N/A")}</p>
              </div>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Credit Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <p className="text-blue-700">Current Credits</p>
                <p className="font-semibold text-blue-900 mt-1">{credits?.current ?? 0}</p>
              </div>
              <div className="rounded border border-green-200 bg-green-50 p-3">
                <p className="text-green-700">Credit Limit</p>
                <p className="font-semibold text-green-900 mt-1">{credits?.limit ?? 0}</p>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-amber-700">Remaining Credits</p>
                <p className="font-semibold text-amber-900 mt-1">{credits?.remaining ?? 0}</p>
              </div>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Advisor</h3>
            {advisor ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Name</p>
                  <p className="font-semibold text-slate-900 mt-1">{advisor.name || "-"}</p>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Email</p>
                  <p className="font-semibold text-slate-900 mt-1">{advisor.email || "-"}</p>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Appointment</p>
                  <p className="font-semibold text-slate-900 mt-1">{advisor.appointment || "-"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No active advisor assigned.</p>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
};

export default AcademicOverviewSection;
