import { Edit, Trash2 } from "lucide-react";
import SearchBar from "../../components/SearchBar";

const CourseSection = ({
  activeTab,
  showInsertion,
  showInspection,
  isEditing,
  handleCourseSubmit,
  handleResetForm,
  courseForm,
  setCourseForm,
  departments,
  prereqSearch,
  setPrereqSearch,
  availablePrereqCourses,
  togglePrerequisite,
  selectedPrereqList,
  search,
  setSearch,
  filteredCourses,
  courses,
  openInsights,
  handleEdit,
  handleDelete,
}) => {
  if (activeTab !== "course") return null;

  return (
    <>
      {showInsertion && (
        <form onSubmit={handleCourseSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {isEditing ? "Edit Course" : "Create New Course"}
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
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                required
                value={courseForm.department_id}
                onChange={(event) =>
                  setCourseForm({ ...courseForm, department_id: event.target.value })
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
              <label className="block text-sm font-medium mb-1">Course Code</label>
              <input
                required
                type="text"
                value={courseForm.course_code}
                onChange={(event) =>
                  setCourseForm({ ...courseForm, course_code: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Course Name</label>
              <input
                required
                type="text"
                value={courseForm.name}
                onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credit Hours</label>
              <input
                required
                type="number"
                step="0.5"
                value={courseForm.credit_hours}
                onChange={(event) =>
                  setCourseForm({ ...courseForm, credit_hours: event.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                required
                value={courseForm.type}
                onChange={(event) => setCourseForm({ ...courseForm, type: event.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="Theory">Theory</option>
                <option value="Lab">Lab</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Course Prerequisites (Optional)</label>
              <SearchBar
                value={prereqSearch}
                onChange={(event) => setPrereqSearch(event.target.value)}
                placeholder="Search by course ID, code, or name"
                className="mb-2"
              />
              <div className="border rounded p-2 max-h-44 overflow-auto space-y-2">
                {availablePrereqCourses.length === 0 ? (
                  <p className="text-sm text-gray-500 px-1">No matching courses found.</p>
                ) : (
                  availablePrereqCourses.map((course) => {
                    const checked = (courseForm.prereq_ids || []).includes(String(course.id));
                    return (
                      <label
                        key={course.id}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 rounded px-1 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePrerequisite(course.id)}
                        />
                        <span>
                          #{course.id} - {course.course_code} - {course.name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedPrereqList.length > 0 ? (
                <p className="text-xs text-gray-600 mt-2">
                  Selected Courses: {selectedPrereqList.map((course) => course.course_code).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-2">No prerequisites selected (elementary course).</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            {isEditing ? "Update Course" : "Create Course"}
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
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Type</th>
                <th className="p-3">Credits</th>
                <th className="p-3">Prerequisite Courses</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-3 text-center text-gray-500">
                    No courses found
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const department = departments.find((dept) => dept.id === course.department_id);
                  const prereqIds = Array.isArray(course.prereq_ids)
                    ? course.prereq_ids.filter((id) => id !== null && id !== undefined)
                    : [];
                  const prereqCodes = prereqIds
                    .map((id) => {
                      const prereqCourse = courses.find((courseItem) => Number(courseItem.id) === Number(id));
                      return prereqCourse?.course_code || null;
                    })
                    .filter(Boolean);
                  return (
                    <tr
                      key={course.id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() => openInsights({ department_id: course.department_id, course_id: course.id })}
                    >
                      <td className="p-3">{course.course_code}</td>
                      <td className="p-3">{course.name}</td>
                      <td className="p-3">{department ? department.code : course.department_id}</td>
                      <td className="p-3 capitalize">{course.type}</td>
                      <td className="p-3">{course.credit_hours}</td>
                      <td className="p-3">{prereqCodes.length > 0 ? prereqCodes.join(", ") : "elementary"}</td>
                      <td className="p-3 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={(event) => handleEdit(course, event)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(course.id, event)}
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
      )}
    </>
  );
};

export default CourseSection;
