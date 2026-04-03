import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Power, RefreshCw, Save, X } from "lucide-react";
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
  const [endingSession, setEndingSession] = useState(false);
  const [sessionResult, setSessionResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [impactPreview, setImpactPreview] = useState(null);

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

  const openEndSessionPreviewModal = async () => {
    if (!canEdit || endingSession || previewLoading) return;

    try {
      setPreviewLoading(true);
      setMessage({ type: "", text: "" });

      const response = await api.get("/system-state/end-session-preview");
      setImpactPreview(response.data || null);
      setPreviewModalOpen(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to generate end-session impact preview.",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmEndCurrentSession = async () => {
    if (!canEdit || endingSession) return;

    try {
      setEndingSession(true);
      setMessage({ type: "", text: "" });

      const response = await api.post("/system-state/end-session", {
        confirm: true,
        reason: "Manual kill switch from system dashboard",
      });

      const payload = response.data || {};
      const summary = payload.summary || {};

      setSessionResult(payload);
      setPreviewModalOpen(false);
      setImpactPreview(null);
      setMessage({
        type: "success",
        text: `Session ended. Promoted: ${summary.promoted_count || 0}, Graduated: ${summary.graduated_count || 0}, Retained (Term 8 credit shortfall): ${summary.retained_terminal_term_count || 0}, Skipped: ${summary.skipped_count || 0}.`,
      });

      await fetchState();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to end current session.",
      });
    } finally {
      setEndingSession(false);
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

      <section className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Session End Kill Switch</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ends the active session immediately and upgrades students based on finalized results.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Last run status: <span className="font-semibold uppercase">{String(state?.session_end_status || "idle")}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={openEndSessionPreviewModal}
            disabled={!canEdit || endingSession || saving || previewLoading}
            className="inline-flex items-center justify-center gap-2 rounded bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Power size={16} />
            {previewLoading ? "Preparing Report..." : "End Current Session Now"}
          </button>
        </div>

        {!canEdit && (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Only system admin can execute this action.
          </p>
        )}

        {sessionResult?.summary && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms Processed</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{sessionResult.summary.terms_processed || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Auto Approved</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{sessionResult.summary.pending_auto_approved || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archived Enrollments</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{sessionResult.summary.archived_enrollments || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Promoted</p>
                <p className="mt-1 text-base font-semibold text-emerald-700">{sessionResult.summary.promoted_count || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Graduated</p>
                <p className="mt-1 text-base font-semibold text-indigo-700">{sessionResult.summary.graduated_count || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Retained/Skipped</p>
                <p className="mt-1 text-base font-semibold text-rose-700">
                  {(sessionResult.summary.retained_terminal_term_count || 0) + (sessionResult.summary.skipped_count || 0)}
                </p>
              </div>
            </div>

            {Array.isArray(sessionResult.student_outcomes) && sessionResult.student_outcomes.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No student outcomes were generated. Check that students have enrollments in the ended term window.
              </div>
            )}

            {Array.isArray(sessionResult.student_outcomes) && sessionResult.student_outcomes.length > 0 && (
              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">Student Outcomes</h3>
                </div>
                <div className="max-h-72 overflow-auto px-4 py-3">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 pr-2">Student</th>
                        <th className="py-1 pr-2">Outcome</th>
                        <th className="py-1 pr-2">From Term</th>
                        <th className="py-1 pr-2">To Term</th>
                        <th className="py-1 pr-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionResult.student_outcomes.map((row, index) => (
                        <tr key={`${row.student_id}-${index}`} className="border-t border-slate-100">
                          <td className="py-1 pr-2">{row.student_id}</td>
                          <td className="py-1 pr-2 uppercase">{row.outcome}</td>
                          <td className="py-1 pr-2">{row.from_term_id ?? "-"}</td>
                          <td className="py-1 pr-2">{row.to_term_id ?? "-"}</td>
                          <td className="py-1 pr-2">{row.reason || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {previewModalOpen && impactPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Confirm End Current Session</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Compact impact report for {formatDateDisplay(impactPreview?.session_window?.term_start)} to {formatDateDisplay(impactPreview?.session_window?.term_end)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (endingSession) return;
                  setPreviewModalOpen(false);
                }}
                className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Eligible For Next Term</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-800">{impactPreview.summary?.students_eligible_for_next_term || 0}</p>
                </div>
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Will Graduate</p>
                  <p className="mt-1 text-xl font-semibold text-indigo-800">{impactPreview.summary?.students_will_graduate || 0}</p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Not Eligible</p>
                  <p className="mt-1 text-xl font-semibold text-rose-800">{impactPreview.summary?.students_not_eligible || 0}</p>
                </div>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entities Affected</p>
                  <p className="mt-1 text-slate-800">Students considered: <span className="font-semibold">{impactPreview.summary?.students_considered || 0}</span></p>
                  <p className="text-slate-800">Enrollments to archive: <span className="font-semibold">{impactPreview.summary?.enrollments_to_archive || 0}</span></p>
                  <p className="text-slate-800">Pending to auto-approve: <span className="font-semibold">{impactPreview.summary?.pending_to_auto_approve || 0}</span></p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quality Notes</p>
                  <p className="mt-1 text-slate-800">Terms processed: <span className="font-semibold">{impactPreview.summary?.terms_processed || 0}</span></p>
                  <p className="text-slate-800">Missing grade to default F: <span className="font-semibold">{impactPreview.summary?.enrollments_missing_grade_to_f || 0}</span></p>
                  <p className="text-slate-800">Retained in term 8: <span className="font-semibold">{impactPreview.summary?.students_retained_terminal_term || 0}</span></p>
                </div>
              </div>

              {impactPreview.advisory_note && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  <p className="font-semibold">Preview note</p>
                  <p className="mt-1">{impactPreview.advisory_note}</p>
                </div>
              )}

              {impactPreview.can_execute === false && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Cannot execute right now</p>
                  <p className="mt-1">{impactPreview.blocking_reason || "Session end operation is currently blocked."}</p>
                </div>
              )}

              {Array.isArray(impactPreview.eligible_next_term_targets) && impactPreview.eligible_next_term_targets.length > 0 && (
                <div className="rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Eligible Student Distribution By Next Term</h4>
                  </div>
                  <div className="max-h-36 overflow-auto px-4 py-3 text-sm text-slate-700">
                    {impactPreview.eligible_next_term_targets.map((item) => (
                      <div key={`target-term-${item.term_id}`} className="flex items-center justify-between border-b border-slate-100 py-1 last:border-b-0">
                        <span>Term ID {item.term_id}</span>
                        <span className="font-semibold">{item.student_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(impactPreview.ineligible_reason_breakdown) && impactPreview.ineligible_reason_breakdown.length > 0 && (
                <div className="rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ineligible Reason Breakdown</h4>
                  </div>
                  <div className="max-h-36 overflow-auto px-4 py-3 text-sm text-slate-700">
                    {impactPreview.ineligible_reason_breakdown.map((item) => (
                      <div key={`reason-${item.reason}`} className="flex items-center justify-between border-b border-slate-100 py-1 last:border-b-0">
                        <span>{item.reason}</span>
                        <span className="font-semibold">{item.student_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  if (endingSession) return;
                  setPreviewModalOpen(false);
                }}
                disabled={endingSession}
                className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndCurrentSession}
                disabled={endingSession || impactPreview?.can_execute === false}
                className="inline-flex items-center gap-2 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Power size={14} />
                {endingSession
                  ? "Ending Session..."
                  : impactPreview?.can_execute === false
                    ? "Execution Blocked"
                    : "Confirm End Current Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStateDashboard;
