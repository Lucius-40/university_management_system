import { Edit, Trash2 } from "lucide-react";
import SearchBar from "../../components/SearchBar";

const DepartmentSection = ({
  activeTab,
  showInsertion,
  showInspection,
  isEditing,
  handleDeptSubmit,
  handleResetForm,
  deptForm,
  setDeptForm,
  search,
  setSearch,
  filteredDepartments,
  openInsights,
  navigate,
  handleEdit,
  handleDelete,
}) => {
  if (activeTab !== "department") return null;

  return (
    <>
      {showInsertion && (
        <form onSubmit={handleDeptSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {isEditing ? "Edit Department" : "Create New Department"}
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
              <label className="block text-sm font-medium mb-1">Code (e.g., CSE)</label>
              <input
                required
                type="text"
                value={deptForm.code}
                onChange={(event) => setDeptForm({ ...deptForm, code: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                required
                type="text"
                value={deptForm.name}
                onChange={(event) => setDeptForm({ ...deptForm, name: event.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            {isEditing ? "Update Department" : "Create Department"}
          </button>
        </form>
      )}

      {showInspection && (
        <div className="mt-8 space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800">Department Inspection</h3>
          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by department code or name"
          />
          <table className="w-full text-left bg-white rounded-lg shadow overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-3 text-center text-gray-500">
                    No departments found
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((department) => (
                  <tr
                    key={department.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => openInsights({ department_id: department.id })}
                  >
                    <td className="p-3 font-medium text-blue-700">{department.code}</td>
                    <td className="p-3">{department.name}</td>
                    <td className="p-3 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/admin/dashboard/departments/${encodeURIComponent(department.code || department.name)}`);
                        }}
                        className="text-slate-600 hover:text-slate-800 text-sm"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleEdit(department, event)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDelete(department.id, event)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default DepartmentSection;
