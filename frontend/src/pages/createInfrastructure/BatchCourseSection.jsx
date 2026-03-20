import { useMemo, useState } from "react";
import Papa from "papaparse";

const BatchCourseSection = ({ activeTab, activeMode, loading, result, onSubmit }) => {
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);

  if (activeTab !== "course" || activeMode !== "batch") return null;

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    setParseError("");
    setRows([]);
    setFileName(file?.name || "");

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        if (parsed.errors?.length) {
          setParseError(parsed.errors[0]?.message || "Failed to parse CSV file.");
          return;
        }

        setRows(parsed.data || []);
      },
      error: (error) => {
        setParseError(error.message || "Failed to parse CSV file.");
      },
    });
  };

  const handleSubmit = async () => {
    if (!rows.length || loading) return;
    await onSubmit(rows);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Batch Import Courses</h2>
      <p className="text-sm text-slate-600">
        Expected columns include Course Code, Course Name, Credit Hours, Type, Department, and optional Prerequisites.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="block w-full rounded border border-slate-300 p-2 text-sm"
      />

      {fileName && <p className="text-sm text-slate-600">Selected file: {fileName}</p>}

      {parseError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {parseError}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="rounded border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Parsed rows: {rows.length}
          </div>

          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Course Code</th>
                  <th className="px-3 py-2">Course Name</th>
                  <th className="px-3 py-2">Credit</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Department</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row["Course Code"] || row.course_code || index}`} className="border-t">
                    <td className="px-3 py-2">{row["Course Code"] || row.course_code || row.code}</td>
                    <td className="px-3 py-2">{row["Course Name"] || row.name}</td>
                    <td className="px-3 py-2">{row["Credit Hours"] || row.credit_hours || row.credit}</td>
                    <td className="px-3 py-2">{row["Type"] || row.type || row["Course Type"]}</td>
                    <td className="px-3 py-2">{row["Department"] || row.department || row["Department Code"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Importing..." : "Import Courses"}
          </button>
        </>
      )}

      {result && (
        <div className="space-y-2 rounded border bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Import Summary</h3>
          <p className="text-sm text-slate-700">
            Total: {result.total} | Inserted: {result.inserted} | Failed: {result.failed}
          </p>
          {Array.isArray(result.results) && result.results.some((item) => item.status === "failed") && (
            <div className="max-h-48 overflow-y-auto rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {result.results
                .filter((item) => item.status === "failed")
                .map((item) => (
                  <div key={`course-failed-${item.row}`}>
                    Row {item.row}: {item.reason}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchCourseSection;
