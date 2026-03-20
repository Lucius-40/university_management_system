const OverrideSection = ({
  activeMode,
  overrideForm,
  setOverrideForm,
  rules,
  departments,
  handleOverrideSubmit,
}) => {
  if (activeMode === "insertion") {
    return (
      <form onSubmit={handleOverrideSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">Add Rule Amount Override</h3>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Rule</span>
          <select
            required
            value={overrideForm.rule_id}
            onChange={(event) => setOverrideForm((prev) => ({ ...prev, rule_id: event.target.value }))}
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
          <span className="text-slate-700">Override Amount</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={overrideForm.override_amount}
            onChange={(event) =>
              setOverrideForm((prev) => ({ ...prev, override_amount: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Department (optional)</span>
          <select
            value={overrideForm.department_id}
            onChange={(event) =>
              setOverrideForm((prev) => ({ ...prev, department_id: event.target.value }))
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
            value={overrideForm.term_number}
            onChange={(event) =>
              setOverrideForm((prev) => ({ ...prev, term_number: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Section Name (optional)</span>
          <input
            value={overrideForm.section_name}
            onChange={(event) =>
              setOverrideForm((prev) => ({ ...prev, section_name: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Batch Year (optional)</span>
          <input
            type="number"
            min="1900"
            max="3000"
            value={overrideForm.batch_year}
            onChange={(event) => setOverrideForm((prev) => ({ ...prev, batch_year: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Add Override
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
      Overrides list inspection is not implemented yet.
    </div>
  );
};

export default OverrideSection;
