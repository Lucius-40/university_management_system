const ScopeSection = ({
  activeMode,
  scopeForm,
  setScopeForm,
  rules,
  departments,
  handleScopeSubmit,
}) => {
  if (activeMode === "insertion") {
    return (
      <form onSubmit={handleScopeSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">Add Rule Scope</h3>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Rule</span>
          <select
            required
            value={scopeForm.rule_id}
            onChange={(event) => setScopeForm((prev) => ({ ...prev, rule_id: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="">Select rule</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Department (optional)</span>
          <select
            value={scopeForm.department_id}
            onChange={(event) =>
              setScopeForm((prev) => ({ ...prev, department_id: event.target.value }))
            }
            className="w-full p-2 border rounded"
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} - {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Term Number (optional)</span>
          <input
            type="number"
            min="1"
            value={scopeForm.term_number}
            onChange={(event) => setScopeForm((prev) => ({ ...prev, term_number: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Section Name (optional)</span>
          <input
            value={scopeForm.section_name}
            onChange={(event) => setScopeForm((prev) => ({ ...prev, section_name: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Batch Year (optional)</span>
          <input
            type="number"
            min="1900"
            max="3000"
            value={scopeForm.batch_year}
            onChange={(event) => setScopeForm((prev) => ({ ...prev, batch_year: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Add Scope
          </button>
        </div>
      </form>
    );
  }

  // Inspection mode
  return (
    <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
      Scope list inspection is not implemented yet.
    </div>
  );
};

export default ScopeSection;
