import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";

const EMPTY_FILTERS = {
  identity: "student",
  department: "",
  batch: "",
  term: "",
  section: "",
};

const normalizeSectionValues = (rows = []) => {
  const values = new Set();

  rows.forEach((row) => {
    const sectionNames = String(row.section_names || "").split(",");
    sectionNames
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => values.add(value));
  });

  return [...values].sort((a, b) => a.localeCompare(b));
};

const EntityInspect = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFilterMeta = useCallback(async () => {
    try {
      const [departmentResponse, termResponse, allResponse] = await Promise.all([
        api.get("/departments"),
        api.get("/terms"),
        api.get("/users/inspect"),
      ]);

      setDepartments(departmentResponse.data || []);
      setTerms(termResponse.data || []);
      setAllRows(allResponse.data || []);
    } catch (metaError) {
      console.error("Failed to load inspect metadata:", metaError);
    }
  }, []);

  const loadData = useCallback(
    async (forceIdentity = undefined) => {
      setIsLoading(true);
      setError("");

      try {
        const effectiveFilters = { ...filters };

        if (forceIdentity) {
          effectiveFilters.identity = forceIdentity;
        }

        if (effectiveFilters.identity === "teacher") {
          effectiveFilters.batch = "";
          effectiveFilters.term = "";
          effectiveFilters.section = "";
        }

        const params = {};

        if (effectiveFilters.identity) params.identity = effectiveFilters.identity;
        if (effectiveFilters.department) params.department = effectiveFilters.department;
        if (effectiveFilters.batch) params.batch = effectiveFilters.batch;
        if (effectiveFilters.term) params.term = effectiveFilters.term;
        if (effectiveFilters.section) params.section = effectiveFilters.section;

        const response = await api.get("/users/inspect", { params });
        setRows(response.data || []);
      } catch (requestError) {
        console.error("Failed to load inspect data:", requestError);
        setError(requestError.response?.data?.message || "Failed to load inspect data.");
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchFilterMeta();
  }, [fetchFilterMeta]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const studentRows = useMemo(
    () => allRows.filter((row) => row.identity === "student"),
    [allRows]
  );

  const batchOptions = useMemo(() => {
    const values = new Set(studentRows.map((row) => String(row.batch || "")).filter(Boolean));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [studentRows]);

  const sectionOptions = useMemo(() => normalizeSectionValues(studentRows), [studentRows]);

  const termOptions = useMemo(() => {
    const values = new Set(studentRows.map((row) => Number(row.term_id)).filter(Boolean));
    return terms
      .filter((term) => values.has(Number(term.id)))
      .sort((a, b) => a.term_number - b.term_number);
  }, [studentRows, terms]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      if (key === "identity" && value === "teacher") {
        return { ...prev, identity: value, batch: "", term: "", section: "" };
      }

      return { ...prev, [key]: value };
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Inspect Entities</h1>
        <button
          type="button"
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Identity</label>
            <select
              value={filters.identity}
              onChange={(event) => handleFilterChange("identity", event.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              value={filters.department}
              onChange={(event) => handleFilterChange("department", event.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.code}>
                  {department.code} - {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Batch</label>
            <select
              value={filters.batch}
              onChange={(event) => handleFilterChange("batch", event.target.value)}
              className="w-full p-2 border rounded"
              disabled={filters.identity !== "student"}
            >
              <option value="">All Batches</option>
              {batchOptions.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Term</label>
            <select
              value={filters.term}
              onChange={(event) => handleFilterChange("term", event.target.value)}
              className="w-full p-2 border rounded"
              disabled={filters.identity !== "student"}
            >
              <option value="">All Terms</option>
              {termOptions.map((term) => (
                <option key={term.id} value={term.id}>
                  Term {term.term_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Section</label>
            <select
              value={filters.section}
              onChange={(event) => handleFilterChange("section", event.target.value)}
              className="w-full p-2 border rounded"
              disabled={filters.identity !== "student"}
            >
              <option value="">All Sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-white border rounded-lg p-6 text-red-600">{error}</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left p-3">Identity</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Personal Email</th>
                <th className="text-left p-3">Official Email</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Roll</th>
                <th className="text-left p-3">Batch</th>
                <th className="text-left p-3">Term</th>
                <th className="text-left p-3">Section</th>
                <th className="text-left p-3">Mobile</th>
                <th className="text-left p-3">Birth Date</th>
                <th className="text-left p-3">Appointment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="12" className="p-4 text-center text-gray-500">
                    No records found for current filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.identity}-${row.user_id}`} className="border-t hover:bg-gray-50">
                    <td className="p-3 capitalize">{row.identity}</td>
                    <td className="p-3 font-medium">{row.full_name}</td>
                    <td className="p-3">{row.personal_email || "-"}</td>
                    <td className="p-3">{row.official_mail || "-"}</td>
                    <td className="p-3">{row.department_code || "-"}</td>
                    <td className="p-3">{row.roll_number || "-"}</td>
                    <td className="p-3">{row.batch || "-"}</td>
                    <td className="p-3">{row.term_number ? `Term ${row.term_number}` : "-"}</td>
                    <td className="p-3">{row.section_names || "-"}</td>
                    <td className="p-3">{row.mobile_number || "-"}</td>
                    <td className="p-3">{row.birth_date ? String(row.birth_date).slice(0, 10) : "-"}</td>
                    <td className="p-3">{row.appointment || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EntityInspect;
