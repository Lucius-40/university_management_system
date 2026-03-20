import SearchBar from "../../components/SearchBar";

const StudentSection = ({
  activeMode,
  activeTab,
  inspectLoading,
  departments,
  studentInspectFilters,
  setStudentInspectFilters,
  studentInspectTerms,
  studentInspectSections,
  filteredStudentInspectionRows,
  navigate,
  handleStudentSubmit,
  studentForm,
  setStudentForm,
  studentTerms,
}) => {
  return (
    <>
      {activeMode === "inspection" && activeTab === "student" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inspect Students</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                className="w-full p-2 border rounded"
                value={studentInspectFilters.department_id}
                onChange={(event) =>
                  setStudentInspectFilters((previous) => ({
                    ...previous,
                    department_id: event.target.value,
                    term_id: "",
                    section: "",
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
                value={studentInspectFilters.term_id}
                onChange={(event) =>
                  setStudentInspectFilters((previous) => ({
                    ...previous,
                    term_id: event.target.value,
                    section: "",
                  }))
                }
              >
                <option value="">All Terms</option>
                {studentInspectTerms.map((term) => (
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
                value={studentInspectFilters.section}
                onChange={(event) =>
                  setStudentInspectFilters((previous) => ({
                    ...previous,
                    section: event.target.value,
                  }))
                }
              >
                <option value="">All Sections</option>
                {studentInspectSections.map((sectionName) => (
                  <option key={sectionName} value={sectionName}>
                    {sectionName}
                  </option>
                ))}
              </select>
            </div>

            <SearchBar
              placeholder="Search student, roll, section"
              value={studentInspectFilters.search}
              onChange={(event) =>
                setStudentInspectFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
            />
          </div>

          {inspectLoading ? (
            <p className="text-sm text-gray-500">Loading inspection data...</p>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Roll</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Term</th>
                    <th className="px-3 py-2">Sections</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentInspectionRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentInspectionRows.map((row) => {
                      const studentId = row.student_id || row.user_id || row.id;
                      return (
                        <tr
                          key={studentId || row.roll_number || row.full_name}
                          className={`border-t ${studentId ? "hover:bg-gray-50 cursor-pointer" : ""}`}
                          onClick={() => {
                            if (!studentId) return;
                            navigate(`/admin/dashboard/profiles/student/${studentId}`);
                          }}
                        >
                          <td className="px-3 py-2">{row.full_name}</td>
                          <td className="px-3 py-2">{row.roll_number}</td>
                          <td className="px-3 py-2">{row.department_code || "-"}</td>
                          <td className="px-3 py-2">Term {row.term_number}</td>
                          <td className="px-3 py-2">{row.section_names || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeMode === "insertion" && activeTab === "student" && (
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Register Student</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                required
                type="text"
                value={studentForm.name}
                onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Roll Number</label>
              <input
                required
                type="text"
                placeholder="CSE2024003"
                value={studentForm.roll_number}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, roll_number: event.target.value.toUpperCase() })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Personal Mail (Email)</label>
              <input
                required
                type="email"
                value={studentForm.email}
                onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Official Mail</label>
              <input
                required
                type="email"
                value={studentForm.official_mail}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, official_mail: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile Number</label>
              <input
                required
                type="text"
                value={studentForm.mobile_number}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, mobile_number: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Birth Date</label>
              <input
                required
                type="date"
                value={studentForm.birth_date}
                onChange={(event) => setStudentForm({ ...studentForm, birth_date: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Present Address</label>
              <input
                required
                type="text"
                value={studentForm.present_address}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, present_address: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Permanent Address</label>
              <input
                required
                type="text"
                value={studentForm.permanent_address}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, permanent_address: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department Code</label>
              <select
                required
                value={studentForm.department_id}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    department_id: event.target.value,
                    current_term: "",
                  })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Term </label>
              <select
                required
                value={studentForm.current_term}
                onChange={(event) => setStudentForm({ ...studentForm, current_term: event.target.value })}
                className="w-full p-2 border rounded"
                disabled={!studentForm.department_id}
              >
                <option value="">Select Term</option>
                {studentTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    Term {term.term_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
          >
            Register Student
          </button>
        </form>
      )}
    </>
  );
};

export default StudentSection;
