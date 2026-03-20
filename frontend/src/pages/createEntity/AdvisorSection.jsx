import SearchBar from "../../components/SearchBar";

const AdvisorSection = ({
  activeMode,
  activeTab,
  inspectLoading,
  departments,
  sortedTerms,
  teachers,
  getTeacherDisplayName,
  advisorInspectFilters,
  setAdvisorInspectFilters,
  loadAdvisorInspection,
  groupedAdvisorInspection,
  navigate,
  handleAdvisorAssign,
  advisorForm,
  setAdvisorForm,
  advisorAssigning,
  advisorTerms,
  advisorTeachers,
  advisorSummary,
}) => {
  const openInsights = ({ department_id, term_id, search }) => {
    const params = new URLSearchParams();
    if (department_id) params.set("department_id", String(department_id));
    if (term_id) params.set("term_id", String(term_id));
    if (search) params.set("search", String(search));
    const queryString = params.toString();
    navigate(queryString ? `/admin/dashboard/insights?${queryString}` : "/admin/dashboard/insights");
  };

  const inspectionRows = groupedAdvisorInspection.flatMap((advisorGroup) =>
    advisorGroup.terms.map((termGroup) => ({
      teacher_id: advisorGroup.teacher_id,
      advisor_name: advisorGroup.advisor_name,
      advisor_appointment: advisorGroup.advisor_appointment,
      department_id: advisorGroup.department_id,
      department_code: advisorGroup.department_code,
      term_id: termGroup.term_id,
      term_number: termGroup.term_number,
      student_count: termGroup.students.length,
    }))
  );

  return (
    <>
      {activeMode === "inspection" && activeTab === "advisor" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inspect Advisor Assignments</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                className="w-full p-2 border rounded"
                value={advisorInspectFilters.department_id}
                onChange={(event) =>
                  setAdvisorInspectFilters((previous) => ({
                    ...previous,
                    department_id: event.target.value,
                    term_id: "",
                    teacher_id: "",
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
                value={advisorInspectFilters.term_id}
                onChange={(event) =>
                  setAdvisorInspectFilters((previous) => ({
                    ...previous,
                    term_id: event.target.value,
                  }))
                }
              >
                <option value="">All Terms</option>
                {sortedTerms
                  .filter(
                    (term) =>
                      !advisorInspectFilters.department_id ||
                      String(term.department_id) === String(advisorInspectFilters.department_id)
                  )
                  .map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.department_code} - Term {term.term_number}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Advisor</label>
              <select
                className="w-full p-2 border rounded"
                value={advisorInspectFilters.teacher_id}
                onChange={(event) =>
                  setAdvisorInspectFilters((previous) => ({
                    ...previous,
                    teacher_id: event.target.value,
                  }))
                }
              >
                <option value="">All Advisors</option>
                {teachers
                  .filter(
                    (teacher) =>
                      !advisorInspectFilters.department_id ||
                      String(teacher.department_id) === String(advisorInspectFilters.department_id)
                  )
                  .map((teacher) => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {getTeacherDisplayName(teacher)}
                    </option>
                  ))}
              </select>
            </div>

            <SearchBar
              placeholder="Search advisor, student, roll"
              value={advisorInspectFilters.search}
              onChange={(event) =>
                setAdvisorInspectFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <button
              type="button"
              onClick={loadAdvisorInspection}
              className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900"
            >
              Apply Filters
            </button>
          </div>

          {inspectLoading ? (
            <p className="text-sm text-gray-500">Loading inspection data...</p>
          ) : inspectionRows.length === 0 ? (
            <p className="text-sm text-gray-500">No advisor assignments found.</p>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Advisor</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Term</th>
                    <th className="px-3 py-2">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionRows
                    .sort((left, right) => {
                      if (String(left.advisor_name) !== String(right.advisor_name)) {
                        return String(left.advisor_name).localeCompare(String(right.advisor_name));
                      }
                      return Number(left.term_number) - Number(right.term_number);
                    })
                    .map((row) => (
                      <tr
                        key={`${row.teacher_id}-${row.term_id}`}
                        className="border-t cursor-pointer hover:bg-gray-50"
                        onClick={() =>
                          openInsights({
                            department_id: row.department_id,
                            term_id: row.term_id,
                            search: row.advisor_name,
                          })
                        }
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{row.advisor_name}</div>
                          <div className="text-xs text-gray-600">{row.advisor_appointment || "Teacher"}</div>
                        </td>
                        <td className="px-3 py-2">{row.department_code || "-"}</td>
                        <td className="px-3 py-2">Term {row.term_number}</td>
                        <td className="px-3 py-2">{row.student_count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeMode === "insertion" && activeTab === "advisor" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Assign Advisors By Roll Range</h2>
          <p className="text-sm text-gray-600">
            This updates advisor history in bulk. Existing active advisors are closed and new advisor rows are opened.
          </p>

          <form onSubmit={handleAdvisorAssign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  required
                  value={advisorForm.department_id}
                  onChange={(event) =>
                    setAdvisorForm((prev) => ({
                      ...prev,
                      department_id: event.target.value,
                      term_id: "",
                      teacher_id: "",
                    }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={advisorAssigning}
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
                  value={advisorForm.term_id}
                  onChange={(event) =>
                    setAdvisorForm((prev) => ({ ...prev, term_id: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={!advisorForm.department_id || advisorAssigning}
                >
                  <option value="">Select Term</option>
                  {advisorTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      Term {term.term_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Advisor Teacher</label>
                <select
                  required
                  value={advisorForm.teacher_id}
                  onChange={(event) =>
                    setAdvisorForm((prev) => ({ ...prev, teacher_id: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={!advisorForm.department_id || advisorAssigning}
                >
                  <option value="">Select Teacher</option>
                  {advisorTeachers.map((teacher) => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {getTeacherDisplayName(teacher)} ({teacher.appointment || "Teacher"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                <input
                  type="date"
                  value={advisorForm.start_date}
                  onChange={(event) =>
                    setAdvisorForm((prev) => ({ ...prev, start_date: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={advisorAssigning}
                />
                <p className="mt-1 text-xs text-gray-500">If empty, selected term start date will be used.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Roll Start</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={advisorForm.roll_start}
                  onChange={(event) =>
                    setAdvisorForm((prev) => ({ ...prev, roll_start: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={advisorAssigning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Roll End</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={advisorForm.roll_end}
                  onChange={(event) =>
                    setAdvisorForm((prev) => ({ ...prev, roll_end: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={advisorAssigning}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={advisorForm.change_reason}
                  onChange={(event) =>
                    setAdvisorForm((prev) => ({ ...prev, change_reason: event.target.value }))
                  }
                  placeholder="Example: Initial advisor allocation"
                  className="w-full p-2 border rounded"
                  disabled={advisorAssigning}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={advisorAssigning}
              className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 disabled:bg-slate-400"
            >
              {advisorAssigning ? "Assigning..." : "Assign Advisors"}
            </button>
          </form>

          {advisorSummary && (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <h3 className="font-semibold text-slate-900 mb-2">Last Assignment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <p>Matched students: <span className="font-semibold">{advisorSummary.matched_students ?? 0}</span></p>
                <p>Assigned: <span className="font-semibold">{advisorSummary.assigned_count ?? 0}</span></p>
                <p>Skipped (same advisor): <span className="font-semibold">{advisorSummary.skipped_same_advisor_count ?? 0}</span></p>
                <p>Invalid roll format: <span className="font-semibold">{advisorSummary.invalid_roll_format_count ?? 0}</span></p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AdvisorSection;
