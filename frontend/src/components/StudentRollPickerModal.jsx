import { Fragment, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const StudentRollPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  departmentId,
  termId,
  title = "Select Roll",
}) => {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const canQuery = useMemo(
    () => Number.isInteger(Number(departmentId)) && Number(departmentId) > 0 && Number.isInteger(Number(termId)) && Number(termId) > 0,
    [departmentId, termId]
  );

  const groupedRows = useMemo(() => {
    const sortedRows = [...rows].sort((left, right) =>
      String(left.roll_number || "").localeCompare(String(right.roll_number || ""))
    );

    const groups = new Map();
    sortedRows.forEach((row) => {
      const roll = String(row.roll_number || "").trim();
      const batchKey = roll.slice(0, 5) || "UNKNOWN";

      if (!groups.has(batchKey)) {
        groups.set(batchKey, []);
      }
      groups.get(batchKey).push(row);
    });

    return [...groups.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([batch, items]) => ({ batch, items }));
  }, [rows]);

  const cacheKey = useMemo(() => {
    if (!canQuery) return "";
    return `student-roll-options:${Number(departmentId)}:${Number(termId)}`;
  }, [canQuery, departmentId, termId]);

  const readCache = () => {
    if (!cacheKey) return [];
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeCache = (items) => {
    if (!cacheKey) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(Array.isArray(items) ? items : []));
    } catch {
      
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setRows([]);
      setError("");
      return;
    }

    if (!canQuery) {
      setRows([]);
      setError("Select department and term first.");
      return;
    }

    const cachedRows = readCache();
    if (!search && cachedRows.length > 0) {
      setRows(cachedRows);
      setError("");
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/students/roll-options", {
          params: {
            department_id: Number(departmentId),
            term_id: Number(termId),
            search,
            limit: 150,
          },
        });

        if (cancelled) return;
        const serverRows = Array.isArray(response.data?.rolls) ? response.data.rolls : [];

        if (!search) {
          writeCache(serverRows);
        }

        if (serverRows.length > 0) {
          setRows(serverRows);
          setError("");
          return;
        }

        if (!search && cachedRows.length > 0) {
          setRows(cachedRows);
          setError("No latest rows from server. Showing cached students.");
          return;
        }

        if (search && cachedRows.length > 0) {
          const q = search.toLowerCase().trim();
          const filteredCache = cachedRows.filter(
            (row) =>
              String(row.roll_number || "").toLowerCase().includes(q) ||
              String(row.student_name || "").toLowerCase().includes(q)
          );
          setRows(filteredCache);
          setError("");
          return;
        }

        setRows([]);
        setError("");
      } catch (requestError) {
        if (cancelled) return;
        if (cachedRows.length > 0) {
          setRows(cachedRows);
          setError("Could not reach server. Showing cached students.");
        } else {
          setRows([]);
          setError(requestError.response?.data?.error || "Failed to load rolls.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, canQuery, departmentId, termId, search, cacheKey, refreshTick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by roll or student name"
              className="w-full rounded border p-2"
            />
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm hover:bg-gray-100"
              onClick={() => setRefreshTick((previous) => previous + 1)}
            >
              Refresh DB
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {rows.length} student{rows.length === 1 ? "" : "s"} available for selection.
          </p>

          {loading ? (
            <p className="text-sm text-gray-500">Loading rolls...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">No matching students found.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Roll</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Suffix</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((group) => (
                    <Fragment key={`batch-${group.batch}`}>
                      <tr className="border-t bg-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-900" colSpan={4}>
                          Batch {group.batch} ({group.items.length})
                        </td>
                      </tr>
                      {group.items.map((row) => (
                        <tr key={row.student_id} className="border-t">
                          <td className="px-3 py-2 font-medium text-gray-900">{row.roll_number}</td>
                          <td className="px-3 py-2 text-gray-700">{row.student_name || "-"}</td>
                          <td className="px-3 py-2 text-gray-700">{row.roll_suffix ?? "-"}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="rounded bg-slate-800 px-3 py-1 text-white hover:bg-slate-900"
                              onClick={() => onSelect(row.roll_number)}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentRollPickerModal;
