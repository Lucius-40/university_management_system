const RuleSection = ({
  activeMode,
  ruleForm,
  setRuleForm,
  rules,
  dues,
  issuingRuleId,
  handleRuleSubmit,
  handleIssueRule,
}) => {
  if (activeMode === "insertion") {
    return (
      <form onSubmit={handleRuleSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">Create Due Rule</h3>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Rule Name</span>
          <input
            required
            value={ruleForm.name}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Due</span>
          <select
            required
            value={ruleForm.due_id}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, due_id: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="">Select due</option>
            {dues.map((due) => (
              <option key={due.id} value={due.id}>
                {due.name} ({due.amount})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Frequency</span>
          <select
            value={ruleForm.frequency}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, frequency: event.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="per_year">Per Year</option>
            <option value="per_term">Per Term</option>
            <option value="one_time">One Time</option>
          </select>
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Issue Offset Days</span>
          <input
            type="number"
            min="0"
            value={ruleForm.issue_offset_days}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, issue_offset_days: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Starts On</span>
          <input
            type="date"
            value={ruleForm.starts_on}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, starts_on: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Ends On</span>
          <input
            type="date"
            value={ruleForm.ends_on}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, ends_on: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(ruleForm.required_for_registration)}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, required_for_registration: event.target.checked }))
            }
          />
          Required for registration
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(ruleForm.is_active)}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, is_active: event.target.checked }))}
          />
          Rule active
        </label>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Create Rule
          </button>
        </div>
      </form>
    );
  }

  // Inspection mode
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">Rules</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Rule</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-left">Frequency</th>
              <th className="p-2 text-left">Required</th>
              <th className="p-2 text-left">Active</th>
              <th className="p-2 text-left">Issue</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-slate-500">
                  No rules found.
                </td>
              </tr>
            ) : null}
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t">
                <td className="p-2">{rule.name}</td>
                <td className="p-2">{rule.due_name}</td>
                <td className="p-2">{rule.frequency}</td>
                <td className="p-2">{rule.required_for_registration ? "Yes" : "No"}</td>
                <td className="p-2">{rule.is_active ? "Yes" : "No"}</td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => handleIssueRule(rule.id)}
                    disabled={issuingRuleId === rule.id}
                    className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {issuingRuleId === rule.id ? "Issuing..." : "Issue"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RuleSection;
