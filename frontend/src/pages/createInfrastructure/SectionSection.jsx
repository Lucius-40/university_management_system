import SearchBar from "../../components/SearchBar";

const SectionSection = ({
  activeTab,
  showInsertion,
  showInspection,
  isEditing,
  handleSectionSubmit,
  handleResetForm,
  sectionForm,
  setSectionForm,
  departments,
  sortedTerms,
  search,
  setSearch,
  filteredSections,
  terms,
  openInsights,
}) => {
  if (activeTab !== "section") return null;

  const groupedRows = filteredSections.reduce((accumulator, section) => {
    const term = terms.find((item) => Number(item.id) === Number(section.term_id));
    const department = departments.find((item) => Number(item.id) === Number(term?.department_id));
    const key = `${department?.id || "-"}-${term?.id || section.term_id}`;

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        department_id: department?.id || null,
        department_code: department?.code || "-",
        term_id: term?.id || section.term_id,
        term_number: term?.term_number ?? section.term_id,
        section_names: [],
      });
    }

    const row = accumulator.get(key);
    if (!row.section_names.includes(section.name)) {
      row.section_names.push(section.name);
    }

    return accumulator;
  }, new Map());

  const rows = [...groupedRows.values()].sort((left, right) => {
    if (left.department_code === right.department_code) {
      return Number(left.term_number) - Number(right.term_number);
    }
    return String(left.department_code).localeCompare(String(right.department_code));
  });

  return (
    <>
      {showInsertion && (
        <form onSubmit={handleSectionSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {isEditing ? "Edit Section" : "Create New Section"}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                required
                value={sectionForm.department_id}
                onChange={(event) =>
                  setSectionForm({
                    ...sectionForm,
                    department_id: event.target.value,
                    term_id: "",
                  })
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
              <label className="block text-sm font-medium mb-1">Term</label>
              <select
                required
                value={sectionForm.term_id}
                onChange={(event) => setSectionForm({ ...sectionForm, term_id: event.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Term</option>
                {sortedTerms
                  .filter((term) =>
                    sectionForm.department_id
                      ? Number(term.department_id) === Number(sectionForm.department_id)
                      : true
                  )
                  .map((term) => (
                    <option key={term.id} value={term.id}>
                      Term {term.term_number}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Section Name</label>
              <input
                required
                type="text"
                placeholder="e.g., A"
                value={sectionForm.name}
                onChange={(event) => setSectionForm({ ...sectionForm, name: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            {isEditing ? "Update Section" : "Create Section"}
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
                <th className="p-3">Sections</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-3 text-center text-gray-500">
                    No sections found
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  return (
                    <tr
                      key={`${row.department_id || "-"}-${row.term_id}`}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() => openInsights({ department_id: row.department_id, term_id: row.term_id })}
                    >
                      <td className="p-3">{row.department_code}</td>
                      <td className="p-3">{row.term_number}</td>
                      <td className="p-3 font-medium">{row.section_names.sort((a, b) => a.localeCompare(b)).join(", ")}</td>
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

export default SectionSection;
