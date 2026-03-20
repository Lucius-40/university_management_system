import { useMemo, useState } from "react";
import Papa from "papaparse";

const REQUIRED_HEADERS = [
  "Full Name",
  "Roll Number",
  "Personal Email",
  "Official Email",
  "Mobile Number",
  "Birth Date",
  "Present Address",
  "Permanent Address",
  "Department Code",
  "Current Term",
];

const BatchStudentSection = ({ activeTab, activeMode, loading, result, onSubmit }) => {
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);

  if (activeTab !== "student" || activeMode !== "batch") return null;

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
        const headers = parsed.meta?.fields || [];
        const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

        if (missing.length) {
          setParseError(`Missing required columns: ${missing.join(", ")}`);
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
      <h2 className="text-xl font-semibold">Batch Import Students</h2>
      <p className="text-sm text-slate-600">
        Upload CSV with these columns: {REQUIRED_HEADERS.join(", ")}.
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
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">Roll Number</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Current Term</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row["Roll Number"] || index}`} className="border-t">
                    <td className="px-3 py-2">{row["Full Name"]}</td>
                    <td className="px-3 py-2">{row["Roll Number"]}</td>
                    <td className="px-3 py-2">{row["Department Code"]}</td>
                    <td className="px-3 py-2">{row["Current Term"]}</td>
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
            {loading ? "Importing..." : "Import Students"}
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
                  <div key={`student-failed-${item.row}`}>
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

export default BatchStudentSection;
