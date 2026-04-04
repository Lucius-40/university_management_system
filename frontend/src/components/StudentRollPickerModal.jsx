import { useEffect, useMemo, useState } from "react";
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

  const canQuery = useMemo(
    () => Number.isInteger(Number(departmentId)) && Number(departmentId) > 0 && Number.isInteger(Number(termId)) && Number(termId) > 0,
    [departmentId, termId]
  );

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
        setRows(response.data?.rolls || []);
      } catch (requestError) {
        if (cancelled) return;
        setRows([]);
        setError(requestError.response?.data?.error || "Failed to load rolls.");
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
  }, [isOpen, canQuery, departmentId, termId, search]);

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
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by roll or student name"
            className="w-full rounded border p-2"
          />

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
                  {rows.map((row) => (
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
