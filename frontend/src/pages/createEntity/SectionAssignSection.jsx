import SearchBar from "../../components/SearchBar";

const SectionAssignSection = ({
  activeMode,
  activeTab,
  inspectLoading,
  departments,
  sortedTerms,
  sections,
  sectionInspectFilters,
  setSectionInspectFilters,
  loadSectionInspection,
  groupedSectionInspection,
  navigate,
  handleSectionAssign,
  sectionForm,
  setSectionForm,
  openRollPicker,
  sectionAssigning,
  sectionTerms,
  sectionOptions,
  sectionSummary,
}) => {
  const openInsights = ({ department_id, term_id, section_name }) => {
    const params = new URLSearchParams();
    if (department_id) params.set("department_id", String(department_id));
    if (term_id) params.set("term_id", String(term_id));
    if (section_name) params.set("section_name", String(section_name));
    const queryString = params.toString();
    navigate(queryString ? `/admin/dashboard/insights?${queryString}` : "/admin/dashboard/insights");
  };

  const inspectionRows = groupedSectionInspection.flatMap((sectionGroup) =>
    sectionGroup.terms.map((termGroup) => ({
      department_id: sectionGroup.department_id,
      department_code: sectionGroup.department_code,
      section_name: sectionGroup.section_name,
      term_id: termGroup.term_id,
      term_number: termGroup.term_number,
      student_count: termGroup.students.length,
    }))
  );

  return (
    <>
      {activeMode === "inspection" && activeTab === "section-assign" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inspect Section Assignments</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                className="w-full p-2 border rounded"
                value={sectionInspectFilters.department_id}
                onChange={(event) =>
                  setSectionInspectFilters((previous) => ({
                    ...previous,
                    department_id: event.target.value,
                    term_id: "",
                    section_name: "",
                  }))
                }
              >
                <option value="">All Departments</option>
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
                className="w-full p-2 border rounded"
                value={sectionInspectFilters.term_id}
                onChange={(event) =>
                  setSectionInspectFilters((previous) => ({
                    ...previous,
                    term_id: event.target.value,
                    section_name: "",
                  }))
                }
              >
                <option value="">All Terms</option>
                {sortedTerms
                  .filter(
                    (term) =>
                      !sectionInspectFilters.department_id ||
                      String(term.department_id) === String(sectionInspectFilters.department_id)
                  )
                  .map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.department_code} - Term {term.term_number}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Section</label>
              <select
                className="w-full p-2 border rounded"
                value={sectionInspectFilters.section_name}
                onChange={(event) =>
                  setSectionInspectFilters((previous) => ({
                    ...previous,
                    section_name: event.target.value,
                  }))
                }
              >
                <option value="">All Sections</option>
                {sections
                  .filter(
                    (section) =>
                      (!sectionInspectFilters.term_id ||
                        String(section.term_id) === String(sectionInspectFilters.term_id)) &&
                      (!sectionInspectFilters.department_id ||
                        String(section.department_id) === String(sectionInspectFilters.department_id))
                  )
                  .map((section) => (
                    <option key={`${section.term_id}-${section.name}`} value={section.name}>
                      {section.name}
                    </option>
                  ))}
              </select>
            </div>

            <SearchBar
              placeholder="Search section, student, roll"
              value={sectionInspectFilters.search}
              onChange={(event) =>
                setSectionInspectFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <button
              type="button"
              onClick={loadSectionInspection}
              className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900"
            >
              Apply Filters
            </button>
          </div>

          {inspectLoading ? (
            <p className="text-sm text-gray-500">Loading inspection data...</p>
          ) : inspectionRows.length === 0 ? (
            <p className="text-sm text-gray-500">No section assignments found.</p>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Term</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionRows
                    .sort((left, right) => {
                      if (String(left.department_code) !== String(right.department_code)) {
                        return String(left.department_code).localeCompare(String(right.department_code));
                      }
                      if (Number(left.term_number) !== Number(right.term_number)) {
                        return Number(left.term_number) - Number(right.term_number);
                      }
                      return String(left.section_name).localeCompare(String(right.section_name));
                    })
                    .map((row) => (
                      <tr
                        key={`${row.department_id}-${row.term_id}-${row.section_name}`}
                        className="border-t cursor-pointer hover:bg-gray-50"
                        onClick={() =>
                          openInsights({
                            department_id: row.department_id,
                            term_id: row.term_id,
                            section_name: row.section_name,
                          })
                        }
                      >
                        <td className="px-3 py-2">{row.department_code || "-"}</td>
                        <td className="px-3 py-2">Term {row.term_number}</td>
                        <td className="px-3 py-2 font-medium">{row.section_name}</td>
                        <td className="px-3 py-2">{row.student_count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeMode === "insertion" && activeTab === "section-assign" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Assign Sections By Roll Range</h2>
          <p className="text-sm text-gray-600">
            This maintains one section mapping per student. Enter full rolls (for example, IPE2400214 to IPE2400299)
            or only the suffixes (for example, 214 to 299). Matching is done using the last 3 digits.
          </p>

          <form onSubmit={handleSectionAssign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  required
                  value={sectionForm.department_id}
                  onChange={(event) =>
                    setSectionForm((prev) => ({
                      ...prev,
                      department_id: event.target.value,
                      term_id: "",
                      section_name: "",
                    }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={sectionAssigning}
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
                  onChange={(event) =>
                    setSectionForm((prev) => ({
                      ...prev,
                      term_id: event.target.value,
                      section_name: "",
                    }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={!sectionForm.department_id || sectionAssigning}
                >
                  <option value="">Select Term</option>
                  {sectionTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      Term {term.term_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <select
                  required
                  value={sectionForm.section_name}
                  onChange={(event) =>
                    setSectionForm((prev) => ({ ...prev, section_name: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={!sectionForm.term_id || sectionAssigning}
                >
                  <option value="">Select Section</option>
                  {sectionOptions.map((section) => (
                    <option key={`${section.term_id}-${section.name}`} value={section.name}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Roll Start (full or suffix)</label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g., IPE2400214 or 214"
                    value={sectionForm.roll_start}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, roll_start: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={sectionAssigning}
                  />
                  <button
                    type="button"
                    onClick={() => openRollPicker("section_start")}
                    className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
                    disabled={!sectionForm.department_id || !sectionForm.term_id || sectionAssigning}
                  >
                    Pick
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Roll End (full or suffix)</label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g., IPE2400299 or 299"
                    value={sectionForm.roll_end}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, roll_end: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={sectionAssigning}
                  />
                  <button
                    type="button"
                    onClick={() => openRollPicker("section_end")}
                    className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
                    disabled={!sectionForm.department_id || !sectionForm.term_id || sectionAssigning}
                  >
                    Pick
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={sectionAssigning}
              className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 disabled:bg-slate-400"
            >
              {sectionAssigning ? "Assigning..." : "Assign Sections"}
            </button>
          </form>

          {sectionSummary && (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <h3 className="font-semibold text-slate-900 mb-2">Last Assignment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <p>Matched students: <span className="font-semibold">{sectionSummary.matched_students ?? 0}</span></p>
                <p>Assigned: <span className="font-semibold">{sectionSummary.assigned_count ?? 0}</span></p>
                <p>Unchanged: <span className="font-semibold">{sectionSummary.unchanged_count ?? 0}</span></p>
                <p>Invalid roll format: <span className="font-semibold">{sectionSummary.invalid_roll_format_count ?? 0}</span></p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SectionAssignSection;
