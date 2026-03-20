import { Edit, Trash2 } from "lucide-react";
import SearchBar from "../../components/SearchBar";

const OfferingSection = ({
  activeTab,
  showInsertion,
  showInspection,
  isEditing,
  handleOfferingSubmit,
  handleResetForm,
  offeringForm,
  setOfferingForm,
  departments,
  sortedTerms,
  offeringCourseSearch,
  setOfferingCourseSearch,
  filteredOfferingCourses,
  toggleOfferingCourseSelection,
  loadOfferingsByFilter,
  offeringFilter,
  setOfferingFilter,
  filteredOfferings,
  courses,
  terms,
  openInsights,
  handleOfferingEdit,
  handleOfferingDelete,
}) => {
  if (activeTab !== "offering") return null;

  return (
    <div className="space-y-8">
      {showInsertion && (
        <form onSubmit={handleOfferingSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {isEditing ? "Edit Course Offering" : "Create Course Offerings"}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                required
                value={offeringForm.department_id}
                onChange={(event) =>
                  setOfferingForm((prev) => ({
                    ...prev,
                    department_id: event.target.value,
                    term_id: "",
                    selected_course_ids: [],
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
              <label className="block text-sm font-medium mb-1">Term</label>
              <select
                required
                value={offeringForm.term_id}
                onChange={(event) =>
                  setOfferingForm((prev) => ({ ...prev, term_id: event.target.value }))
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Select Term</option>
                {sortedTerms
                  .filter((term) =>
                    offeringForm.department_id
                      ? Number(term.department_id) === Number(offeringForm.department_id)
                      : true
                  )
                  .map((term) => (
                    <option key={term.id} value={term.id}>
                      Term {term.term_number}
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Course {isEditing ? "(single for edit)" : "(select one)"}
              </label>
              <SearchBar
                value={offeringCourseSearch}
                onChange={(event) => setOfferingCourseSearch(event.target.value)}
                placeholder="Find by id, code, name, or department"
                className="mb-2"
              />
              <div className="border rounded p-2 max-h-52 overflow-auto space-y-2">
                {filteredOfferingCourses.length === 0 ? (
                  <p className="text-sm text-gray-500 px-1">No courses available.</p>
                ) : (
                  filteredOfferingCourses.map((course) => {
                    const checked = (offeringForm.selected_course_ids || []).includes(String(course.id));
                    const courseDepartment = departments.find(
                      (department) => Number(department.id) === Number(course.department_id)
                    );
                    return (
                      <label
                        key={course.id}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 rounded px-1 py-1"
                      >
                        <input
                          type="radio"
                          name="offering-course-selection"
                          checked={checked}
                          onChange={() => toggleOfferingCourseSelection(course.id)}
                        />
                        <span>
                          {course.course_code} - {course.name}
                          {courseDepartment ? ` (${courseDepartment.code})` : ""}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected: {(offeringForm.selected_course_ids || []).length}/1.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Capacity</label>
              <input
                type="number"
                min="0"
                value={offeringForm.max_capacity}
                onChange={(event) =>
                  setOfferingForm((prev) => ({ ...prev, max_capacity: event.target.value }))
                }
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="offering-is-optional"
                type="checkbox"
                checked={Boolean(offeringForm.is_optional)}
                onChange={(event) =>
                  setOfferingForm((prev) => ({ ...prev, is_optional: event.target.checked }))
                }
              />
              <label htmlFor="offering-is-optional" className="text-sm font-medium text-gray-700">
                Optional Course
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="offering-is-active"
                type="checkbox"
                checked={Boolean(offeringForm.is_active)}
                onChange={(event) =>
                  setOfferingForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
              <label htmlFor="offering-is-active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            {isEditing ? "Update Offering" : "Create Offerings"}
          </button>
        </form>
      )}

      {showInspection && (
        <div className="border-t pt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Offering Inspection</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={offeringFilter.department_id}
              onChange={(event) =>
                setOfferingFilter((prev) => ({
                  ...prev,
                  department_id: event.target.value,
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
              value={offeringFilter.term_id}
              onChange={(event) =>
                setOfferingFilter((prev) => ({
                  ...prev,
                  term_id: event.target.value,
                }))
              }
              className="w-full p-2 border rounded"
            >
              <option value="">Select Term</option>
              {sortedTerms
                .filter((term) =>
                  offeringFilter.department_id
                    ? Number(term.department_id) === Number(offeringFilter.department_id)
                    : true
                )
                .map((term) => (
                  <option key={term.id} value={term.id}>
                    Term {term.term_number}
                  </option>
                ))}
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(offeringFilter.include_inactive)}
                onChange={(event) =>
                  setOfferingFilter((prev) => ({
                    ...prev,
                    include_inactive: event.target.checked,
                  }))
                }
              />
              Include Inactive
            </label>

            <button
              type="button"
              onClick={() => loadOfferingsByFilter(offeringFilter)}
              className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800"
            >
              Load Offerings
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Course</th>
                  <th className="p-3 text-left">Optional</th>
                  <th className="p-3 text-left">Max Capacity</th>
                  <th className="p-3 text-left">Active</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOfferings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-3 text-center text-gray-500">
                      No offerings found. Select term and load.
                    </td>
                  </tr>
                ) : (
                  filteredOfferings.map((offering) => {
                    const course = courses.find((item) => Number(item.id) === Number(offering.course_id));
                    const term = terms.find((item) => Number(item.id) === Number(offering.term_id));
                    return (
                      <tr
                        key={offering.id}
                        className="border-t hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          openInsights({
                            department_id: term?.department_id,
                            term_id: offering.term_id,
                            course_id: offering.course_id,
                          })
                        }
                      >
                        <td className="p-3">{offering.id}</td>
                        <td className="p-3">
                          {course ? `${course.course_code} - ${course.name}` : `Course #${offering.course_id}`}
                        </td>
                        <td className="p-3">{offering.is_optional ? "Yes" : "No"}</td>
                        <td className="p-3">{offering.max_capacity ?? "-"}</td>
                        <td className="p-3">{offering.is_active ? "Yes" : "No"}</td>
                        <td className="p-3 flex gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOfferingEdit(offering);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOfferingDelete(offering.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferingSection;
