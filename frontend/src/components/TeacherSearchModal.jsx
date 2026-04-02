import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const PAGE_SIZE = 40;

const TeacherSearchModal = ({
  isOpen,
  onClose,
  onSelect,
  departments = [],
  offeringId = "",
}) => {
  const [teachers, setTeachers] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const hasMore = useMemo(() => teachers.length < total, [teachers.length, total]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, searchTerm]);

  const fetchTeachers = async ({ append = false, customOffset = 0 } = {}) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/teachers/search", {
        params: {
          search: debouncedSearch || undefined,
          department_id: departmentFilter || undefined,
          offering_id: offeringId || undefined,
          limit: PAGE_SIZE,
          offset: customOffset,
        },
      });

      const payload = response.data || {};
      const rows = Array.isArray(payload.teachers) ? payload.teachers : [];
      const nextTotal = Number(payload.total || 0);

      setTeachers((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(nextTotal);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to load teachers.");
      if (!append) {
        setTeachers([]);
        setTotal(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchTeachers({ append: false, customOffset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, debouncedSearch, departmentFilter, offeringId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-slate-900">Select Teacher</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, appointment, or ID"
              className="md:col-span-2 w-full p-2 border border-slate-300 rounded"
            />
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="w-full p-2 border border-slate-300 rounded"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">Showing {teachers.length} of {total} teachers</p>
          {error ? (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {teachers.length === 0 && !isLoading ? (
            <p className="p-4 text-sm text-slate-600">No teachers found.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {teachers.map((teacher) => (
                <li key={teacher.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{teacher.name}</p>
                    <p className="text-xs text-slate-600 truncate">
                      ID: {teacher.user_id} • {teacher.appointment || "Teacher"} • {teacher.department_code || "-"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {teacher.official_mail || teacher.email || "No email"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect(teacher)}
                    className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading || !hasMore}
            onClick={() => fetchTeachers({ append: true, customOffset: teachers.length })}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? "Loading..." : hasMore ? "Load More" : "No More Results"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherSearchModal;
