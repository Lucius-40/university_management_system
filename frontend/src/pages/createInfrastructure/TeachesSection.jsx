import { useEffect, useMemo, useState } from "react";
import SearchBar from "../../components/SearchBar";
import TeacherSearchModal from "../../components/TeacherSearchModal";

const TeachesSection = ({
  activeTab,
  showInsertion,
  showInspection,
  handleTeachesSubmit,
  teachForm,
  setTeachForm,
  setOfferings,
  departments,
  teachTerms,
  loadTeachOfferings,
  offerings,
  teachSections,
  toggleTeachSection,
  teachBatchResult,
  teachInspection,
  setTeachInspection,
  sortedTerms,
  loadTeachingAssignments,
  filteredTeachingAssignments,
  openInsights,
}) => {
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => {
    if (!teachForm.teacher_id) {
      setSelectedTeacher(null);
    }
  }, [teachForm.teacher_id]);

  const selectedTeacherText = useMemo(() => {
    if (selectedTeacher?.name) {
      const appointment = selectedTeacher.appointment ? ` (${selectedTeacher.appointment})` : "";
      const dept = selectedTeacher.department_code ? ` [${selectedTeacher.department_code}]` : "";
      return `${selectedTeacher.name}${appointment}${dept}`;
    }

    if (teachForm.teacher_id) {
      return `Teacher ID: ${teachForm.teacher_id}`;
    }

    return "Search and select teacher";
  }, [selectedTeacher, teachForm.teacher_id]);

  if (activeTab !== "teaches") return null;

  return (
    <>
      {showInsertion && (
        <form onSubmit={handleTeachesSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Assign Teacher To Section</h2>
          <p className="text-sm text-gray-600">
            Assign one teacher to one or more sections for the selected offering.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department (Filter)</label>
              <select
                value={teachForm.department_id}
                onChange={async (event) => {
                  const departmentId = event.target.value;
                  const nextTermId = "";
                  setTeachForm((prev) => ({
                    ...prev,
                    department_id: departmentId,
                    term_id: nextTermId,
                    course_offering_id: "",
                    section_names: [],
                  }));
                  setOfferings([]);
                }}
                className="w-full p-2 border rounded"
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
                required
                value={teachForm.term_id}
                onChange={async (event) => {
                  const termId = event.target.value;
                  setTeachForm((prev) => ({
                    ...prev,
                    term_id: termId,
                    course_offering_id: "",
                    section_names: [],
                  }));
                  await loadTeachOfferings(termId, teachForm.department_id);
                }}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Term</option>
                {teachTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    Term {term.term_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Course Offering</label>
              <select
                required
                value={teachForm.course_offering_id}
                onChange={(event) =>
                  setTeachForm((prev) => ({ ...prev, course_offering_id: event.target.value }))
                }
                className="w-full p-2 border rounded"
                disabled={!teachForm.term_id}
              >
                <option value="">Select Offering</option>
                {offerings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    #{offering.id} - {offering.course_code} - {offering.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sections</label>
              <div className="border rounded p-2 min-h-11 max-h-36 overflow-auto">
                {!teachForm.term_id ? (
                  <p className="text-sm text-gray-500">Select a term first.</p>
                ) : teachSections.length === 0 ? (
                  <p className="text-sm text-gray-500">No sections found for this term.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teachSections.map((section) => {
                      const checked = (teachForm.section_names || []).includes(section.name);
                      return (
                        <label
                          key={`${section.term_id}-${section.name}`}
                          className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                            checked ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTeachSection(section.name)}
                          />
                          {section.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Teacher</label>
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(true)}
                className="w-full rounded border border-slate-300 bg-white p-2 text-left text-sm hover:bg-slate-50"
              >
                {selectedTeacherText}
              </button>
              <p className="mt-1 text-xs text-slate-500">
                Teachers are loaded on demand with server-side search.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(teachForm.replace_existing)}
                  onChange={(event) =>
                    setTeachForm((prev) => ({ ...prev, replace_existing: event.target.checked }))
                  }
                />
                Replace existing assignment for the same offering + section
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Assign Teacher
          </button>

          {teachBatchResult && (
            <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>Inserted: <span className="font-semibold">{teachBatchResult.inserted}</span></p>
              <p>Updated: <span className="font-semibold">{teachBatchResult.updated}</span></p>
              <p>Unchanged: <span className="font-semibold">{teachBatchResult.unchanged}</span></p>
              <p>Failed: <span className="font-semibold">{teachBatchResult.failures.length}</span></p>
              {teachBatchResult.failures.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-red-600">
                  {teachBatchResult.failures.map((failure) => (
                    <p key={failure.section_name}>{failure.section_name}: {failure.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {showInspection && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Teaching Assignment Inspection</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={teachInspection.department_id}
              onChange={(event) =>
                setTeachInspection((prev) => ({
                  ...prev,
                  department_id: event.target.value,
                  term_id: "",
                }))
              }
              className="w-full p-2 border rounded"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </select>

            <select
              value={teachInspection.term_id}
              onChange={(event) =>
                setTeachInspection((prev) => ({ ...prev, term_id: event.target.value }))
              }
              className="w-full p-2 border rounded"
            >
              <option value="">All Terms</option>
              {sortedTerms
                .filter((term) =>
                  teachInspection.department_id
                    ? Number(term.department_id) === Number(teachInspection.department_id)
                    : true
                )
                .map((term) => (
                  <option key={term.id} value={term.id}>
                    Term {term.term_number}
                  </option>
                ))}
            </select>

            <input
              type="number"
              min="1"
              value={teachInspection.teacher_id}
              onChange={(event) =>
                setTeachInspection((prev) => ({ ...prev, teacher_id: event.target.value }))
              }
              placeholder="Teacher ID (optional)"
              className="w-full p-2 border rounded"
            />

            <button
              type="button"
              onClick={() => loadTeachingAssignments(teachInspection)}
              className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800"
            >
              Load Assignments
            </button>
          </div>

          <SearchBar
            value={teachInspection.search}
            onChange={(event) =>
              setTeachInspection((prev) => ({ ...prev, search: event.target.value }))
            }
            placeholder="Search by teacher, course, department, appointment, or section"
          />

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-left">Term</th>
                  <th className="p-3 text-left">Course</th>
                  <th className="p-3 text-left">Section</th>
                  <th className="p-3 text-left">Teacher</th>
                  <th className="p-3 text-left">Appointment</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachingAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-3 text-center text-gray-500">
                      No assignments found.
                    </td>
                  </tr>
                ) : (
                  filteredTeachingAssignments.map((assignment) => (
                    <tr
                      key={`${assignment.course_offering_id}-${assignment.section_name}`}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        openInsights({
                          department_id: assignment.department_id,
                          term_id: assignment.term_id,
                          course_id: assignment.course_id,
                          section_name: assignment.section_name,
                        })
                      }
                    >
                      <td className="p-3">{assignment.department_code}</td>
                      <td className="p-3">{assignment.term_number}</td>
                      <td className="p-3">{assignment.course_code} - {assignment.course_name}</td>
                      <td className="p-3">{assignment.section_name}</td>
                      <td className="p-3">{assignment.teacher_name}</td>
                      <td className="p-3">{assignment.teacher_appointment || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TeacherSearchModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        departments={departments}
        offeringId={teachForm.course_offering_id}
        onSelect={(teacher) => {
          setTeachForm((prev) => ({
            ...prev,
            teacher_id: String(teacher.user_id),
          }));
          setSelectedTeacher(teacher);
          setIsTeacherModalOpen(false);
        }}
      />
    </>
  );
};

export default TeachesSection;
