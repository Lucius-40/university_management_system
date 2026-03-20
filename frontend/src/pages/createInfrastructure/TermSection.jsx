import SearchBar from "../../components/SearchBar";

const TermSection = ({
  activeTab,
  showInsertion,
  showInspection,
  handleTermSubmit,
  termForm,
  setTermForm,
  departments,
  sortedTerms,
  search,
  setSearch,
  filteredTerms,
  openInsights,
  navigate,
}) => {
  if (activeTab !== "term") return null;

  return (
    <>
      {showInsertion && (
        <form onSubmit={handleTermSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Term Credit Inclusion</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                required
                value={termForm.department_id}
                onChange={(event) =>
                  setTermForm((prev) => ({
                    ...prev,
                    department_id: event.target.value,
                    term_number: "",
                  }))
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code} - {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Term Number</label>
              <select
                required
                value={termForm.term_number}
                onChange={(event) =>
                  setTermForm((prev) => ({ ...prev, term_number: event.target.value }))
                }
                className="w-full p-2 border rounded"
                disabled={!termForm.department_id}
              >
                <option value="">Select Term</option>
                {sortedTerms
                  .filter((term) => Number(term.department_id) === Number(termForm.department_id))
                  .map((term) => (
                    <option key={term.id} value={term.term_number}>
                      Term {term.term_number}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Maximum Credit</label>
              <input
                required
                min="0.5"
                step="0.5"
                type="number"
                value={termForm.max_credit}
                onChange={(event) => setTermForm({ ...termForm, max_credit: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Save Credit
          </button>
        </form>
      )}

      {showInspection && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Inspection</h3>
          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search records"
          />

          <table className="w-full text-left bg-white rounded-lg shadow overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3">Department</th>
                <th className="p-3">Term</th>
                <th className="p-3">Max Credit</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-3 text-center text-gray-500">
                    No terms found
                  </td>
                </tr>
              ) : (
                filteredTerms.map((term) => {
                  const department = departments.find((dept) => Number(dept.id) === Number(term.department_id));
                  return (
                    <tr
                      key={term.id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() => openInsights({ department_id: term.department_id, term_id: term.id })}
                    >
                      <td className="p-3">{department ? department.code : term.department_id}</td>
                      <td className="p-3">{term.term_number}</td>
                      <td className="p-3">{term.max_credit ?? "-"}</td>
                      <td className="p-3 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/admin/dashboard/terms/${term.id}`);
                          }}
                          className="text-slate-600 hover:text-slate-800 text-sm"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default TermSection;
