import { useMemo, useState } from "react";
import { Search } from "lucide-react";

const ScopeSection = ({
  activeMode,
  scopeForm,
  setScopeForm,
  rules,
  departments,
  scopes,
  handleScopeSubmit,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState("");

  const filteredScopes = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return (scopes || []).filter((scope) => {
      const ruleMatches = !selectedRuleId || Number(scope.rule_id) === Number(selectedRuleId);
      if (!ruleMatches) return false;

      if (!q) return true;
      return (
        String(scope.rule_name || "").toLowerCase().includes(q) ||
        String(scope.due_name || "").toLowerCase().includes(q) ||
        String(scope.department_code || "").toLowerCase().includes(q) ||
        String(scope.department_name || "").toLowerCase().includes(q) ||
        String(scope.section_name || "").toLowerCase().includes(q) ||
        String(scope.batch_year || "").toLowerCase().includes(q) ||
        String(scope.term_number || "").toLowerCase().includes(q)
      );
    });
  }, [scopes, searchText, selectedRuleId]);

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
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-slate-900">Rule Scopes</h3>
        <div className="flex w-full md:w-auto gap-2">
          <select
            value={selectedRuleId}
            onChange={(event) => setSelectedRuleId(event.target.value)}
            className="p-2 border rounded text-sm min-w-52"
          >
            <option value="">All rules</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search scopes"
              className="w-full pl-9 pr-3 py-2 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Rule</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-left">Department</th>
              <th className="p-2 text-left">Term</th>
              <th className="p-2 text-left">Section</th>
              <th className="p-2 text-left">Batch</th>
            </tr>
          </thead>
          <tbody>
            {filteredScopes.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-slate-500">
                  No scopes found.
                </td>
              </tr>
            ) : null}

            {filteredScopes.map((scope) => {
              const departmentLabel = scope.department_id
                ? `${scope.department_code || ""}${scope.department_name ? ` - ${scope.department_name}` : ""}`
                : "All departments";

              return (
                <tr key={scope.id} className="border-t">
                  <td className="p-2">{scope.rule_name}</td>
                  <td className="p-2">{scope.due_name}</td>
                  <td className="p-2">{departmentLabel}</td>
                  <td className="p-2">{scope.term_number || "All terms"}</td>
                  <td className="p-2">{scope.section_name || "All sections"}</td>
                  <td className="p-2">{scope.batch_year || "All batches"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScopeSection;
