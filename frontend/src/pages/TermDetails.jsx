import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import { formatDateDisplay } from "../utils/dateFormat";

const toText = (value) => (value == null || value === "" ? "-" : String(value));

const TermDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [term, setTerm] = useState(null);
  const [department, setDepartment] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [termResponse, departmentsResponse, offeringsResponse] = await Promise.all([
        api.get(`/terms/${id}`),
        api.get("/departments"),
        api.get(`/courses/offerings/term/${id}`),
      ]);

      const nextTerm = termResponse.data;
      const departments = departmentsResponse.data || [];
      const nextOfferings = offeringsResponse.data?.offerings || [];

      setTerm(nextTerm || null);
      setDepartment(
        departments.find(
          (departmentRow) => Number(departmentRow.id) === Number(nextTerm?.department_id)
        ) || null
      );
      setOfferings(nextOfferings);
    } catch (requestError) {
      console.error("Failed to load term details:", requestError);
      setError(requestError.response?.data?.message || requestError.response?.data?.error || "Failed to load term details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const mandatoryOfferings = useMemo(
    () => offerings.filter((offering) => !offering.is_optional),
    [offerings]
  );

  const optionalOfferings = useMemo(
    () => offerings.filter((offering) => Boolean(offering.is_optional)),
    [offerings]
  );

  const groupedOptionalOfferings = useMemo(() => {
    const grouped = new Map();

    optionalOfferings.forEach((offering) => {
      const groupKey = String(offering.optional_group || offering.set_name || "General Optional");
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey).push(offering);
    });

    return [...grouped.entries()].map(([group, rows]) => ({
      group,
      rows,
    }));
  }, [optionalOfferings]);

  const renderOfferingTable = (rows) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Course Code</th>
            <th className="p-3 text-left">Course Name</th>
            <th className="p-3 text-left">Credits</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-left">Max Capacity</th>
            <th className="p-3 text-left">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-3 text-center text-gray-500">
                No courses found
              </td>
            </tr>
          ) : (
            rows.map((offering) => (
              <tr key={offering.id} className="border-t">
                <td className="p-3">{toText(offering.course_code)}</td>
                <td className="p-3">{toText(offering.name)}</td>
                <td className="p-3">{toText(offering.credit_hours)}</td>
                <td className="p-3">{toText(offering.type)}</td>
                <td className="p-3">{offering.max_capacity ?? "-"}</td>
                <td className="p-3">{offering.is_active === false ? "No" : "Yes"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  if (!term) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <p className="text-gray-600 font-medium">Term not found.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-6">
      <div className="bg-white border rounded-lg p-6 flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            Term {term.term_number} Details
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {department ? `${department.code} - ${department.name}` : `Department ${term.department_id}`}
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200 text-gray-700"
          onClick={fetchDetails}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs uppercase text-gray-500">Start Date</p>
          <p className="text-base font-semibold text-gray-800 mt-1">{formatDateDisplay(term.start_date)}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs uppercase text-gray-500">End Date</p>
          <p className="text-base font-semibold text-gray-800 mt-1">{formatDateDisplay(term.end_date)}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs uppercase text-gray-500">Max Credits</p>
          <p className="text-base font-semibold text-gray-800 mt-1">{toText(term.max_credit)}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs uppercase text-gray-500">Total Offerings</p>
          <p className="text-base font-semibold text-gray-800 mt-1">{offerings.length}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Mandatory Courses</h2>
          <p className="text-sm text-gray-500">Courses students must take for this term.</p>
        </div>
        {renderOfferingTable(mandatoryOfferings)}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Optional Courses</h2>
          <p className="text-sm text-gray-500">Courses students can choose if remaining credits allow.</p>
        </div>

        {groupedOptionalOfferings.length <= 1 ? (
          renderOfferingTable(optionalOfferings)
        ) : (
          <div className="space-y-4">
            {groupedOptionalOfferings.map((groupEntry) => (
              <div key={groupEntry.group} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">{groupEntry.group}</h3>
                {renderOfferingTable(groupEntry.rows)}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TermDetails;
