import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, RefreshCw, Save, X } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import { compareDateOnly, formatDateDisplay, formatDateInput } from "../utils/dateFormat";

const EMPTY_FORM = {
  reg_start: "",
  reg_end: "",
  term_start: "",
  term_end: "",
};

const SystemStateDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [state, setState] = useState(null);
  const [canEdit, setCanEdit] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/system-state");
      const payload = response.data || {};
      const currentState = payload.state || null;

      setState(currentState);
      setCanEdit(Boolean(payload.canEdit));

      if (currentState) {
        setForm({
          reg_start: formatDateInput(currentState.reg_start),
          reg_end: formatDateInput(currentState.reg_end),
          term_start: formatDateInput(currentState.term_start || currentState.newest_term_start),
          term_end: formatDateInput(currentState.term_end),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load current state.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const validationError = useMemo(() => {
    if (!form.reg_start || !form.reg_end || !form.term_start || !form.term_end) {
      return "All date fields are required.";
    }
    if (compareDateOnly(form.reg_start, form.reg_end) > 0) {
      return "Registration start must be before registration end.";
    }
    if (compareDateOnly(form.term_start, form.term_end) > 0) {
      return "Term start must be before term end.";
    }
    return "";
  }, [form]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canEdit) return;

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const response = await api.put("/system-state", form);
      const insertedTerms = response.data?.insertedTerms ?? 0;

      setMessage({
        type: "success",
        text: `University state updated successfully. Missing term rows created: ${insertedTerms}.`,
      });

      setIsEditing(false);

      await fetchState();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to update university state.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-xl  border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Current Session</h1>
          
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchState}
            className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setMessage({ type: "", text: "" });
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Pencil size={16} />
              Edit
            </button>
          )}
        </div>
        </div>

        {state && (
          <p className="mt-4 text-xs text-slate-500">
            Last updated: {formatDateDisplay(state.updated_at, "N/A")}
          </p>
        )}
      </div>

      {message.text && (
        <div
          className={`rounded border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Current Session Snapshot</h2>
        {/* <p className="mt-1 text-sm text-slate-600">These values are read directly from the current_state table.</p> */}
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registration Start</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatDateDisplay(state?.reg_start, "Not set")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registration End</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatDateDisplay(state?.reg_end, "Not set")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Term Start</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatDateDisplay(state?.term_start || state?.newest_term_start, "Not set")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Term End</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatDateDisplay(state?.term_end, "Not set")}</p>
          </div>
        </div>

        {!canEdit && (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            You have read-only access. Only system admin can update state.
          </p>
        )}

        {isEditing && (
          <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Registration Start</span>
            <input
              type="date"
              name="reg_start"
              value={form.reg_start}
              onChange={handleChange}
              disabled={!canEdit || saving}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Registration End</span>
            <input
              type="date"
              name="reg_end"
              value={form.reg_end}
              onChange={handleChange}
              disabled={!canEdit || saving}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Term Start</span>
            <input
              type="date"
              name="term_start"
              value={form.term_start}
              onChange={handleChange}
              disabled={!canEdit || saving}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Term End</span>
            <input
              type="date"
              name="term_end"
              value={form.term_end}
              onChange={handleChange}
              disabled={!canEdit || saving}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
            />
          </label>

          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                if (state) {
                  setForm({
                    reg_start: formatDateInput(state.reg_start),
                    reg_end: formatDateInput(state.reg_end),
                    term_start: formatDateInput(state.term_start || state.newest_term_start),
                    term_end: formatDateInput(state.term_end),
                  });
                }
                setIsEditing(false);
              }}
              disabled={saving}
              className="mr-2 inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canEdit || saving}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save University State"}
            </button>
          </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default SystemStateDashboard;
