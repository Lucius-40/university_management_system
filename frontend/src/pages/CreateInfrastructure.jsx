import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, RefreshCw, Trash2 } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";

const cacheKeyForTab = (tab) => `infra-${tab}-list`;

const clearDepartmentDetailsCache = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("dept-details-")) {
      localStorage.removeItem(key);
    }
  });
};

const CreateInfrastructure = ({ initialTab = "department" }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [prereqSearch, setPrereqSearch] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  const initialDeptForm = { code: "", name: "" };
  const initialTermForm = { term_number: "", start_date: "", end_date: "", department_id: "" };
  const initialSectionForm = { department_id: "", term_id: "", name: "" };
  const initialCourseForm = {
    course_code: "",
    name: "",
    credit_hours: "",
    type: "Theory",
    department_id: "",
    prereq_ids: [],
  };

  const [deptForm, setDeptForm] = useState(initialDeptForm);
  const [termForm, setTermForm] = useState(initialTermForm);
  const [sectionForm, setSectionForm] = useState(initialSectionForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);

  useEffect(() => {
    setActiveTab(initialTab);
    setSearch("");
    setMessage({ type: "", text: "" });
  }, [initialTab]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      try {
        const cacheKey = cacheKeyForTab(activeTab);
        if (!forceRefresh) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            setDepartments(parsed.departments || []);
            setTerms(parsed.terms || []);
            setCourses(parsed.courses || []);
            setSections(parsed.sections || []);
            setIsLoading(false);
            return;
          }
        }

        if (activeTab === "department") {
          const res = await api.get("/departments");
          setDepartments(res.data);
          localStorage.setItem(cacheKey, JSON.stringify({ departments: res.data }));
        }

        if (activeTab === "term") {
          const [termRes, deptRes] = await Promise.all([api.get("/terms"), api.get("/departments")]);
          setTerms(termRes.data);
          setDepartments(deptRes.data);
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ terms: termRes.data, departments: deptRes.data })
          );
        }

        if (activeTab === "course") {
          const [courseRes, deptRes] = await Promise.all([
            api.get("/courses"),
            api.get("/departments"),
          ]);
          setCourses(courseRes.data);
          setDepartments(deptRes.data);
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ courses: courseRes.data, departments: deptRes.data })
          );
        }

        if (activeTab === "section") {
          const [sectionRes, termRes, deptRes] = await Promise.all([
            api.get("/sections"),
            api.get("/terms"),
            api.get("/departments"),
          ]);
          setSections(sectionRes.data);
          setTerms(termRes.data);
          setDepartments(deptRes.data);
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              sections: sectionRes.data,
              terms: termRes.data,
              departments: deptRes.data,
            })
          );
        }
      } catch (error) {
        console.error("Failed to fetch infrastructure data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearInfrastructureCaches = () => {
    ["department", "term", "section", "course"].forEach((tab) => {
      localStorage.removeItem(cacheKeyForTab(tab));
    });
    clearDepartmentDetailsCache();
  };

  const handleResetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setPrereqSearch("");
    setDeptForm(initialDeptForm);
    setTermForm(initialTermForm);
    setSectionForm(initialSectionForm);
    setCourseForm(initialCourseForm);
  };

  const handleDeptSubmit = async (event) => {
    event.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/departments/${editId}`, deptForm);
        setMessage({ type: "success", text: "Department updated successfully." });
      } else {
        await api.post("/departments", deptForm);
        setMessage({ type: "success", text: "Department created successfully." });
      }
      clearInfrastructureCaches();
      handleResetForm();
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} department.`,
      });
    }
  };

  const handleTermSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...termForm,
      start_date: termForm.start_date
        ? new Date(termForm.start_date).toISOString().split("T")[0]
        : "",
      end_date: termForm.end_date ? new Date(termForm.end_date).toISOString().split("T")[0] : "",
    };

    try {
      if (isEditing) {
        await api.put(`/terms/${editId}`, payload);
        setMessage({ type: "success", text: "Term updated successfully." });
      } else {
        await api.post("/terms", payload);
        setMessage({ type: "success", text: "Term created successfully." });
      }
      clearInfrastructureCaches();
      handleResetForm();
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || `Failed to ${isEditing ? "update" : "create"} term.`,
      });
    }
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...courseForm,
      prereq_ids: (courseForm.prereq_ids || []).map((id) => Number(id)),
    };

    try {
      if (isEditing) {
        await api.put(`/courses/${editId}`, payload);
        setMessage({ type: "success", text: "Course updated successfully." });
      } else {
        await api.post("/courses", payload);
        setMessage({ type: "success", text: "Course created successfully." });
      }
      clearInfrastructureCaches();
      handleResetForm();
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} course.`,
      });
    }
  };

  const handleSectionSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      term_id: Number(sectionForm.term_id),
      name: sectionForm.name.trim(),
    };

    try {
      if (isEditing) {
        await api.put("/sections", {
          original_term_id: Number(editId?.term_id),
          original_name: editId?.name,
          ...payload,
        });
        setMessage({ type: "success", text: "Section updated successfully." });
      } else {
        await api.post("/sections", payload);
        setMessage({ type: "success", text: "Section created successfully." });
      }

      clearInfrastructureCaches();
      handleResetForm();
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} section.`,
      });
    }
  };

  const handleEdit = (item, event) => {
    event.stopPropagation();
    setIsEditing(true);
    setEditId(item.id);
    setMessage({ type: "", text: "" });

    if (activeTab === "department") {
      setDeptForm({ code: item.code || "", name: item.name || "" });
    }

    if (activeTab === "term") {
      setTermForm({
        term_number: item.term_number,
        start_date: item.start_date ? new Date(item.start_date).toISOString().split("T")[0] : "",
        end_date: item.end_date ? new Date(item.end_date).toISOString().split("T")[0] : "",
        department_id: item.department_id,
      });
    }

    if (activeTab === "section") {
      const selectedTerm = terms.find((term) => Number(term.id) === Number(item.term_id));
      setEditId({ term_id: item.term_id, name: item.name });
      setSectionForm({
        department_id: selectedTerm ? String(selectedTerm.department_id) : "",
        term_id: String(item.term_id),
        name: item.name || "",
      });
    }

    if (activeTab === "course") {
      setCourseForm({
        course_code: item.course_code,
        name: item.name,
        credit_hours: item.credit_hours,
        type: String(item.type || "Theory"),
        department_id: item.department_id,
        prereq_ids: (item.prereq_ids || []).map((id) => String(id)),
      });
    }
  };

  const availablePrereqCourses = useMemo(() => {
    const q = prereqSearch.toLowerCase();
    const currentId = Number(editId);

    return courses.filter((course) => {
      if (isEditing && Number(course.id) === currentId) return false;

      if (!q) return true;

      return (
        String(course.id).includes(q) ||
        String(course.course_code || "").toLowerCase().includes(q) ||
        String(course.name || "").toLowerCase().includes(q)
      );
    });
  }, [courses, editId, isEditing, prereqSearch]);

  const selectedPrereqList = useMemo(() => {
    const selected = new Set((courseForm.prereq_ids || []).map((id) => Number(id)));
    return courses.filter((course) => selected.has(Number(course.id)));
  }, [courseForm.prereq_ids, courses]);

  const togglePrerequisite = (courseId) => {
    const courseIdText = String(courseId);
    const selected = new Set(courseForm.prereq_ids || []);

    if (selected.has(courseIdText)) {
      selected.delete(courseIdText);
    } else {
      selected.add(courseIdText);
    }

    setCourseForm({
      ...courseForm,
      prereq_ids: Array.from(selected),
    });
  };

  const handleDelete = async (id, event) => {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      if (activeTab === "department") await api.delete(`/departments/${id}`);
      if (activeTab === "term") await api.delete(`/terms/${id}`);
      if (activeTab === "course") await api.delete(`/courses/${id}`);
      if (activeTab === "section") {
        await api.delete("/sections", {
          data: { term_id: Number(id.term_id), name: id.name },
        });
      }
      setMessage({ type: "success", text: "Deleted successfully." });
      clearInfrastructureCaches();
      if (
        isEditing &&
        ((activeTab !== "section" && editId === id) ||
          (activeTab === "section" && editId?.term_id === id?.term_id && editId?.name === id?.name))
      ) {
        handleResetForm();
      }
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to delete item.",
      });
    }
  };

  const filteredDepartments = useMemo(
    () =>
      departments.filter(
        (department) =>
          department.code?.toLowerCase().includes(search.toLowerCase()) ||
          department.name?.toLowerCase().includes(search.toLowerCase())
      ),
    [departments, search]
  );

  const filteredTerms = useMemo(() => {
    const q = search.toLowerCase();
    return terms.filter((term) => {
      const department = departments.find((dept) => dept.id === term.department_id);
      return (
        String(term.term_number).includes(q) ||
        department?.code?.toLowerCase().includes(q) ||
        department?.name?.toLowerCase().includes(q)
      );
    });
  }, [terms, departments, search]);

  const filteredCourses = useMemo(() => {
    const q = search.toLowerCase();
    return courses.filter((course) => {
      const department = departments.find((dept) => dept.id === course.department_id);
      return (
        course.course_code?.toLowerCase().includes(q) ||
        course.name?.toLowerCase().includes(q) ||
        String(course.type || "").toLowerCase().includes(q) ||
        department?.code?.toLowerCase().includes(q) ||
        department?.name?.toLowerCase().includes(q)
      );
    });
  }, [courses, departments, search]);

  const filteredSections = useMemo(() => {
    const q = search.toLowerCase();
    return sections.filter((section) => {
      const term = terms.find((t) => Number(t.id) === Number(section.term_id));
      const department = departments.find((d) => Number(d.id) === Number(term?.department_id));
      return (
        String(section.name || "").toLowerCase().includes(q) ||
        String(term?.term_number || "").toLowerCase().includes(q) ||
        String(department?.code || "").toLowerCase().includes(q) ||
        String(department?.name || "").toLowerCase().includes(q)
      );
    });
  }, [sections, terms, departments, search]);

  const renderTable = () => {
    if (isLoading) return <Loader />;

    if (activeTab === "department") {
      return (
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
                  onClick={() =>
                    navigate(`/admin/dashboard/departments/${encodeURIComponent(department.code || department.name)}`)
                  }
                >
                  <td className="p-3 font-medium text-blue-700">{department.code}</td>
                  <td className="p-3">{department.name}</td>
                  <td className="p-3 flex justify-center gap-3">
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
      );
    }

    if (activeTab === "term") {
      return (
        <table className="w-full text-left bg-white rounded-lg shadow overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">Department</th>
              <th className="p-3">Term</th>
              <th className="p-3">Start Date</th>
              <th className="p-3">End Date</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTerms.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-3 text-center text-gray-500">
                  No terms found
                </td>
              </tr>
            ) : (
              filteredTerms.map((term) => {
                const department = departments.find((dept) => dept.id === term.department_id);
                return (
                  <tr key={term.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{department ? department.code : term.department_id}</td>
                    <td className="p-3">{term.term_number}</td>
                    <td className="p-3">
                      {term.start_date ? new Date(term.start_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-3">
                      {term.end_date ? new Date(term.end_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-3 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={(event) => handleEdit(term, event)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDelete(term.id, event)}
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
      );
    }

    if (activeTab === "section") {
      return (
        <table className="w-full text-left bg-white rounded-lg shadow overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">Department</th>
              <th className="p-3">Term</th>
              <th className="p-3">Section Name</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-3 text-center text-gray-500">
                  No sections found
                </td>
              </tr>
            ) : (
              filteredSections.map((section) => {
                const term = terms.find((t) => Number(t.id) === Number(section.term_id));
                const department = departments.find((d) => Number(d.id) === Number(term?.department_id));
                return (
                  <tr key={`${section.term_id}-${section.name}`} className="border-t hover:bg-gray-50">
                    <td className="p-3">{department ? department.code : "-"}</td>
                    <td className="p-3">{term ? term.term_number : section.term_id}</td>
                    <td className="p-3 font-medium">{section.name}</td>
                    <td className="p-3 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={(event) => handleEdit(section, event)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) =>
                          handleDelete({ term_id: section.term_id, name: section.name }, event)
                        }
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
      );
    }

    return (
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
                <tr key={course.id} className="border-t hover:bg-gray-50">
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
    );
  };

  // Listing UI moved to Inspection page; keep helper for now to avoid breaking existing edit/delete logic.
  void renderTable;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Infrastructure Management</h1>
        <button
          type="button"
          onClick={() => fetchData(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {message.text && (
        <div
          className={`p-4 mb-6 rounded border ${
            message.type === "success"
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-red-100 text-red-700 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
            <Loader />
          </div>
        )}

        {activeTab === "department" && (
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

        {activeTab === "term" && (
          <form onSubmit={handleTermSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Term" : "Create New Term"}</h2>
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
                  value={termForm.department_id}
                  onChange={(event) =>
                    setTermForm({ ...termForm, department_id: event.target.value })
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
                <input
                  required
                  type="number"
                  value={termForm.term_number}
                  onChange={(event) =>
                    setTermForm({ ...termForm, term_number: event.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={termForm.start_date}
                  onChange={(event) => setTermForm({ ...termForm, start_date: event.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={termForm.end_date}
                  onChange={(event) => setTermForm({ ...termForm, end_date: event.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
            >
              {isEditing ? "Update Term" : "Create Term"}
            </button>
          </form>
        )}

        {activeTab === "course" && (
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

        {activeTab === "section" && (
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
                  {terms
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
      </div>

    </div>
  );
};

export default CreateInfrastructure;
