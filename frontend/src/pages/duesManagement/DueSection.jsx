import { Search } from "lucide-react";

const INITIAL_DUE_FORM = {
  name: "",
  amount: "",
  bank_account_number: "",
  is_active: true,
  required_for_registration: true,
  description: "",
};

const DueSection = ({
  activeMode,
  dueForm,
  setDueForm,
  editingDueId,
  setEditingDueId,
  dueSearch,
  setDueSearch,
  filteredDues,
  handleDueSubmit,
  handleDueEdit,
  handleDueDelete,
}) => {
  if (activeMode === "insertion") {
    return (
      <form onSubmit={handleDueSubmit} className="rounded-lg border bg-white p-4 grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold text-slate-900">
          {editingDueId ? "Edit Due" : "Create Due"}
        </h3>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Name</span>
          <input
            required
            value={dueForm.name}
            onChange={(event) => setDueForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Amount</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={dueForm.amount}
            onChange={(event) => setDueForm((prev) => ({ ...prev, amount: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Bank Account Number</span>
          <input
            value={dueForm.bank_account_number}
            onChange={(event) =>
              setDueForm((prev) => ({ ...prev, bank_account_number: event.target.value }))
            }
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm space-y-1">
          <span className="text-slate-700">Description</span>
          <input
            value={dueForm.description}
            onChange={(event) => setDueForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full p-2 border rounded"
          />
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(dueForm.required_for_registration)}
            onChange={(event) =>
              setDueForm((prev) => ({ ...prev, required_for_registration: event.target.checked }))
            }
          />
          Required for registration
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(dueForm.is_active)}
            onChange={(event) => setDueForm((prev) => ({ ...prev, is_active: event.target.checked }))}
          />
          Active
        </label>

        <div className="md:col-span-2 flex gap-2 justify-end">
          {editingDueId && (
            <button
              type="button"
              onClick={() => {
                setEditingDueId(null);
                setDueForm(INITIAL_DUE_FORM);
              }}
              className="px-4 py-2 rounded border bg-white hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
          <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" type="submit">
            {editingDueId ? "Update Due" : "Create Due"}
          </button>
        </div>
      </form>
    );
  }

  // Inspection mode
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-semibold text-slate-900">Dues List</h3>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={dueSearch}
            onChange={(event) => setDueSearch(event.target.value)}
            placeholder="Search dues"
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Required</th>
              <th className="p-2 text-left">Active</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDues.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-500">
                  No dues found.
                </td>
              </tr>
            ) : null}
            {filteredDues.map((due) => (
              <tr className="border-t" key={due.id}>
                <td className="p-2">{due.name}</td>
                <td className="p-2">{due.amount}</td>
                <td className="p-2">{due.required_for_registration ? "Yes" : "No"}</td>
                <td className="p-2">{due.is_active ? "Yes" : "No"}</td>
                <td className="p-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDueEdit(due)}
                    className="px-2 py-1 rounded border hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDueDelete(due.id)}
                    className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
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

export default DueSection;
