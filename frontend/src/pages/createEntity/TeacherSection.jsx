import SearchBar from "../../components/SearchBar";

const TeacherSection = ({
  activeMode,
  activeTab,
  inspectLoading,
  departments,
  teacherInspectFilters,
  setTeacherInspectFilters,
  appointmentOptions,
  filteredTeacherInspectionRows,
  navigate,
  handleTeacherSubmit,
  teacherForm,
  setTeacherForm,
}) => {
  return (
    <>
      {activeMode === "inspection" && activeTab === "teacher" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inspect Teachers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                className="w-full p-2 border rounded"
                value={teacherInspectFilters.department_id}
                onChange={(event) =>
                  setTeacherInspectFilters((previous) => ({
                    ...previous,
                    department_id: event.target.value,
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
              <label className="block text-sm font-medium mb-1">Appointment</label>
              <select
                className="w-full p-2 border rounded"
                value={teacherInspectFilters.appointment}
                onChange={(event) =>
                  setTeacherInspectFilters((previous) => ({
                    ...previous,
                    appointment: event.target.value,
                  }))
                }
              >
                <option value="">All Appointments</option>
                {appointmentOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <SearchBar
              placeholder="Search name, email, department"
              value={teacherInspectFilters.search}
              onChange={(event) =>
                setTeacherInspectFilters((previous) => ({
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
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2">Official Email</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Appointment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeacherInspectionRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                        No teachers found.
                      </td>
                    </tr>
                  ) : (
                    filteredTeacherInspectionRows.map((row) => {
                      const teacherId = row.teacher_id || row.user_id || row.id;
                      return (
                        <tr
                          key={teacherId || row.official_mail || row.full_name}
                          className={`border-t ${teacherId ? "hover:bg-gray-50 cursor-pointer" : ""}`}
                          onClick={() => {
                            if (!teacherId) return;
                            navigate(`/admin/dashboard/profiles/teacher/${teacherId}`);
                          }}
                        >
                          <td className="px-3 py-2">{row.full_name}</td>
                          <td className="px-3 py-2">{row.official_mail || "-"}</td>
                          <td className="px-3 py-2">{row.department_code || "-"}</td>
                          <td className="px-3 py-2">{row.appointment || "-"}</td>
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

      {activeMode === "insertion" && activeTab === "teacher" && (
        <form onSubmit={handleTeacherSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Register Teacher</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                required
                type="text"
                value={teacherForm.name}
                onChange={(event) => setTeacherForm({ ...teacherForm, name: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Personal Email</label>
              <input
                required
                type="email"
                value={teacherForm.email}
                onChange={(event) => setTeacherForm({ ...teacherForm, email: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Official Email</label>
              <input
                type="email"
                value={teacherForm.official_mail}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, official_mail: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile Number</label>
              <input
                required
                type="text"
                value={teacherForm.mobile_number}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, mobile_number: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Present Address</label>
              <input
                required
                type="text"
                value={teacherForm.present_address}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, present_address: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Permanent Address</label>
              <input
                required
                type="text"
                value={teacherForm.permanent_address}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, permanent_address: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Birth Date</label>
              <input
                required
                type="date"
                value={teacherForm.birth_date}
                onChange={(event) => setTeacherForm({ ...teacherForm, birth_date: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                required
                value={teacherForm.department_id}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, department_id: event.target.value })
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
              <label className="block text-sm font-medium mb-1">Appointment Type</label>
              <select
                required
                value={teacherForm.appointment}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, appointment: event.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="Professor">Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Adjunct Faculty">Adjunct Faculty</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
          >
            Register Teacher
          </button>
        </form>
      )}
    </>
  );
};

export default TeacherSection;
