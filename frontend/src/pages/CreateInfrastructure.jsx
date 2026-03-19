import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, RefreshCw, Trash2 } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";
import { sortTermsDepartment } from "../utils/termSort";

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
  const [offerings, setOfferings] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [prereqSearch, setPrereqSearch] = useState("");
  const [offeringCourseSearch, setOfferingCourseSearch] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  const initialDeptForm = { code: "", name: "" };
  const initialTermForm = {
    max_credit: "23",
  };
  const initialSectionForm = { department_id: "", term_id: "", name: "" };
  const initialCourseForm = {
    course_code: "",
    name: "",
    credit_hours: "",
    type: "Theory",
    department_id: "",
    prereq_ids: [],
  };
  const initialOfferingForm = {
    term_id: "",
    department_id: "",
    selected_course_ids: [],
    max_capacity: "",
    is_optional: false,
    is_active: true,
  };
  const initialOfferingFilter = {
    term_id: "",
    department_id: "",
    include_inactive: false,
  };
  const initialTeachForm = {
    department_id: "",
    term_id: "",
    course_offering_id: "",
    section_name: "",
    teacher_id: "",
    replace_existing: false,
  };

  const [deptForm, setDeptForm] = useState(initialDeptForm);
  const [termForm, setTermForm] = useState(initialTermForm);
  const [sectionForm, setSectionForm] = useState(initialSectionForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);
  const [offeringFilter, setOfferingFilter] = useState(initialOfferingFilter);
  const [teachForm, setTeachForm] = useState(initialTeachForm);

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
        if (!forceRefresh && activeTab !== "teaches") {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            setDepartments(parsed.departments || []);
            setTerms(parsed.terms || []);
            setCourses(parsed.courses || []);
            setSections(parsed.sections || []);
            setTeachers(parsed.teachers || []);
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

        if (activeTab === "offering") {
          const [termRes, deptRes, courseRes] = await Promise.all([
            api.get("/terms"),
            api.get("/departments"),
            api.get("/courses"),
          ]);
          setTerms(termRes.data);
          setDepartments(deptRes.data);
          setCourses(courseRes.data);
          setOfferings([]);
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              terms: termRes.data,
              departments: deptRes.data,
              courses: courseRes.data,
            })
          );
        }

        if (activeTab === "teaches") {
          const [termRes, deptRes, sectionRes, teacherRes, teacherInspectRes] = await Promise.all([
            api.get("/terms"),
            api.get("/departments"),
            api.get("/sections"),
            api.get("/teachers"),
            api.get("/users/inspect", { params: { identity: "teacher" } }),
          ]);

          const teacherRows = teacherRes.data || [];
          const teacherInspectRows = teacherInspectRes.data || [];
          const teacherMap = new Map();

          teacherRows.forEach((teacher) => {
            teacherMap.set(Number(teacher.user_id), { ...teacher });
          });

          teacherInspectRows.forEach((teacher) => {
            const teacherId = Number(teacher.user_id);
            const existing = teacherMap.get(teacherId) || {};
            const mergedName =
              teacher.full_name ||
              teacher.name ||
              existing.full_name ||
              existing.name ||
              "";

            teacherMap.set(teacherId, {
              ...existing,
              ...teacher,
              user_id: teacherId,
              name: mergedName,
              full_name: mergedName,
              official_mail: teacher.official_mail || existing.official_mail,
              appointment: teacher.appointment || existing.appointment,
              department_id: teacher.department_id ?? existing.department_id,
            });
          });

          const mergedTeachers = [...teacherMap.values()];

          setTerms(termRes.data || []);
          setDepartments(deptRes.data || []);
          setSections(sectionRes.data || []);
          setTeachers(mergedTeachers);
          setOfferings([]);

          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              terms: termRes.data || [],
              departments: deptRes.data || [],
              sections: sectionRes.data || [],
              teachers: mergedTeachers,
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
    ["department", "term", "section", "course", "offering", "teaches"].forEach((tab) => {
      localStorage.removeItem(cacheKeyForTab(tab));
    });
    clearDepartmentDetailsCache();
  };

  const handleResetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setPrereqSearch("");
    setOfferingCourseSearch("");
    setDeptForm(initialDeptForm);
    setTermForm(initialTermForm);
    setSectionForm(initialSectionForm);
    setCourseForm(initialCourseForm);
    setOfferingForm(initialOfferingForm);
    setTeachForm(initialTeachForm);
  };

  const loadTeachOfferings = async (termId, departmentId = "") => {
    const numericTermId = Number(termId);
    if (!Number.isFinite(numericTermId) || numericTermId <= 0) {
      setOfferings([]);
      return;
    }

    try {
      const response = await api.get(`/courses/offerings/term/${numericTermId}`, {
        params: {
          department_id: departmentId ? Number(departmentId) : undefined,
          include_inactive: "true",
        },
      });
      setOfferings(response.data?.offerings || []);
    } catch (error) {
      setOfferings([]);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load offerings for teacher assignment.",
      });
    }
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

    if (!isEditing || !editId) {
      setMessage({ type: "error", text: "Select an existing term first." });
      return;
    }

    const payload = {
      max_credit: Number(termForm.max_credit),
    };

    try {
      await api.put(`/terms/${editId}`, payload);
      setMessage({ type: "success", text: "Term max credits updated successfully." });
      clearInfrastructureCaches();
      handleResetForm();
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update term max credits.",
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

  const loadOfferingsByFilter = async (nextFilter = offeringFilter) => {
    if (!nextFilter.term_id) {
      setOfferings([]);
      return;
    }

    try {
      const response = await api.get(`/courses/offerings/term/${nextFilter.term_id}`, {
        params: {
          department_id: nextFilter.department_id || undefined,
          include_inactive: nextFilter.include_inactive ? "true" : undefined,
        },
      });
      setOfferings(response.data?.offerings || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load offerings for selected term.",
      });
    }
  };

  const handleOfferingSubmit = async (event) => {
    event.preventDefault();

    if (!offeringForm.term_id || !offeringForm.department_id) {
      setMessage({ type: "error", text: "Department and term are required." });
      return;
    }

    if ((offeringForm.selected_course_ids || []).length !== 1) {
      setMessage({ type: "error", text: "Select exactly one course." });
      return;
    }

    const commonPayload = {
      term_id: Number(offeringForm.term_id),
      max_capacity: offeringForm.max_capacity === "" ? null : Number(offeringForm.max_capacity),
      is_optional: Boolean(offeringForm.is_optional),
      is_active: Boolean(offeringForm.is_active),
    };

    try {
      if (isEditing) {
        await api.put(`/courses/offerings/${editId}`, {
          ...commonPayload,
          course_id: Number(offeringForm.selected_course_ids[0]),
        });
        setMessage({ type: "success", text: "Course offering updated successfully." });
      } else {
        const selectedCourseId = Number(offeringForm.selected_course_ids[0]);
        await api.post("/courses/offerings", {
          ...commonPayload,
          course_id: selectedCourseId,
        });
        setMessage({
          type: "success",
          text: "Course offering created successfully.",
        });
      }

      const nextFilter = {
        ...offeringFilter,
        term_id: String(commonPayload.term_id),
        department_id: String(offeringForm.department_id),
      };
      setOfferingFilter(nextFilter);
      clearInfrastructureCaches();
      handleResetForm();
      await loadOfferingsByFilter(nextFilter);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          error.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} course offerings.`,
      });
    }
  };

  const handleTeachesSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    if (!teachForm.term_id || !teachForm.course_offering_id || !teachForm.section_name || !teachForm.teacher_id) {
      setMessage({
        type: "error",
        text: "Term, course offering, section, and teacher are required.",
      });
      return;
    }

    try {
      const payload = {
        course_offering_id: Number(teachForm.course_offering_id),
        section_name: teachForm.section_name,
        teacher_id: Number(teachForm.teacher_id),
        replace_existing: Boolean(teachForm.replace_existing),
      };

      const response = await api.post("/teacher-sections/assign", payload);
      const action = response?.data?.action || "saved";
      setMessage({
        type: "success",
        text: `Teaching assignment ${action} successfully.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to assign teacher to section.",
      });
    }
  };

  const handleOfferingEdit = (offering) => {
    setIsEditing(true);
    setEditId(offering.id);
    const term = terms.find((item) => Number(item.id) === Number(offering.term_id));
    setOfferingForm({
      term_id: String(offering.term_id || ""),
      department_id: term?.department_id ? String(term.department_id) : "",
      selected_course_ids: [String(offering.course_id)],
      max_capacity: offering.max_capacity == null ? "" : String(offering.max_capacity),
      is_optional: Boolean(offering.is_optional),
      is_active: offering.is_active !== false,
    });
  };

  const handleOfferingDelete = async (offeringId) => {
    if (!window.confirm("Delete this offering?")) return;

    try {
      await api.delete(`/courses/offerings/${offeringId}`);
      setMessage({ type: "success", text: "Course offering deleted successfully." });
      if (isEditing && Number(editId) === Number(offeringId)) {
        handleResetForm();
      }
      await loadOfferingsByFilter(offeringFilter);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to delete offering.",
      });
    }
  };

  const toggleOfferingCourseSelection = (courseId) => {
    const courseIdText = String(courseId);
    const isAlreadySelected = (offeringForm.selected_course_ids || []).includes(courseIdText);

    setOfferingForm((prev) => ({
      ...prev,
      selected_course_ids: isAlreadySelected ? [] : [courseIdText],
    }));
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
        max_credit: String(item.max_credit ?? "23"),
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

    if (activeTab === "offering") {
      handleOfferingEdit(item);
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
    const matchingTerms = terms.filter((term) => {
      const department = departments.find((dept) => dept.id === term.department_id);
      return (
        String(term.term_number).includes(q) ||
        department?.code?.toLowerCase().includes(q) ||
        department?.name?.toLowerCase().includes(q)
      );
    });

    return sortTermsDepartment(matchingTerms, departments);
  }, [terms, departments, search]);

  const sortedTerms = useMemo(
    () => sortTermsDepartment(terms, departments),
    [terms, departments]
  );

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

  const offeringCourses = useMemo(() => {
    return [...courses].sort((left, right) =>
      String(left.course_code || "").localeCompare(String(right.course_code || ""))
    );
  }, [courses]);

  const filteredOfferingCourses = useMemo(() => {
    const q = String(offeringCourseSearch || "").toLowerCase().trim();

    const scoped = offeringCourses.filter((course) => {
      if (!offeringForm.department_id) return true;
      return Number(course.department_id) === Number(offeringForm.department_id);
    });

    if (!q) return scoped;

    return scoped.filter((course) => {
      const department = departments.find((item) => Number(item.id) === Number(course.department_id));
      return (
        String(course.id || "").toLowerCase().includes(q) ||
        String(course.course_code || "").toLowerCase().includes(q) ||
        String(course.name || "").toLowerCase().includes(q) ||
        String(department?.code || "").toLowerCase().includes(q)
      );
    });
  }, [offeringCourseSearch, offeringCourses, offeringForm.department_id, departments]);

  const filteredOfferings = useMemo(() => {
    const q = String(search || "").toLowerCase();
    if (!q) return offerings;

    return offerings.filter((offering) => {
      const course = courses.find((item) => Number(item.id) === Number(offering.course_id));
      const department = departments.find((item) => Number(item.id) === Number(course?.department_id));
      return (
        String(offering.id || "").includes(q) ||
        String(offering.is_optional ? "optional" : "mandatory").includes(q) ||
        String(course?.course_code || "").toLowerCase().includes(q) ||
        String(course?.name || "").toLowerCase().includes(q) ||
        String(department?.code || "").toLowerCase().includes(q)
      );
    });
  }, [offerings, courses, departments, search]);

  const teachTerms = useMemo(
    () =>
      sortedTerms.filter((term) =>
        teachForm.department_id ? Number(term.department_id) === Number(teachForm.department_id) : true
      ),
    [sortedTerms, teachForm.department_id]
  );

  const teachSections = useMemo(
    () =>
      sections
        .filter((section) => Number(section.term_id) === Number(teachForm.term_id))
        .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""))),
    [sections, teachForm.term_id]
  );

  const teacherWithIdentity = useMemo(() => {
    return [...teachers]
      .map((teacher) => {
        const teacherId = Number(teacher.user_id);
        const userName = teacher.name || teacher.full_name || String(teacherId);
        const dept = departments.find((department) => Number(department.id) === Number(teacher.department_id));
        return {
          ...teacher,
          display_name: userName,
          department_code: dept?.code || "-",
        };
      })
      .sort((left, right) => String(left.display_name).localeCompare(String(right.display_name)));
  }, [teachers, departments]);

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

    // if (activeTab === "term") {
    //   return (
    //     <table className="w-full text-left bg-white rounded-lg shadow overflow-hidden">
    //       <thead className="bg-gray-100 text-gray-700">
    //         <tr>
    //           <th className="p-3">Department</th>
    //           <th className="p-3">Term</th>
    //           <th className="p-3">Start Date</th>
    //           <th className="p-3">End Date</th>
    //           <th className="p-3 text-center">Actions</th>
    //         </tr>
    //       </thead>
    //       <tbody>
    //         {filteredTerms.length === 0 ? (
    //           <tr>
    //             <td colSpan="5" className="p-3 text-center text-gray-500">
    //               No terms found
    //             </td>
    //           </tr>
    //         ) : (
    //           filteredTerms.map((term) => {
    //             const department = departments.find((dept) => dept.id === term.department_id);
    //             return (
    //               <tr key={term.id} className="border-t hover:bg-gray-50">
    //                 <td className="p-3">{department ? department.code : term.department_id}</td>
    //                 <td className="p-3">{term.term_number}</td>
    //                 <td className="p-3">
    //                   {term.start_date ? new Date(term.start_date).toLocaleDateString() : "-"}
    //                 </td>
    //                 <td className="p-3">
    //                   {term.end_date ? new Date(term.end_date).toLocaleDateString() : "-"}
    //                 </td>
    //                 <td className="p-3 flex justify-center gap-3">
    //                   <button
    //                     type="button"
    //                     onClick={(event) => handleEdit(term, event)}
    //                     className="text-blue-500 hover:text-blue-700"
    //                   >
    //                     <Edit size={18} />
    //                   </button>
    //                   <button
    //                     type="button"
    //                     onClick={(event) => handleDelete(term.id, event)}
    //                     className="text-red-500 hover:text-red-700"
    //                   >
    //                     <Trash2 size={18} />
    //                   </button>
    //                 </td>
    //               </tr>
    //             );
    //           })
    //         )}
    //       </tbody>
    //     </table>
    //   );
    // }

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
              <h2 className="text-xl font-semibold">Edit Term Max Credits</h2>
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

            <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              Terms are created from System State initialization. Choose an existing term and update only
              max credits from here.
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Select Existing Term</label>
                <select
                  required
                  value={typeof editId === "number" || typeof editId === "string" ? editId : ""}
                  onChange={(event) => {
                    const selectedId = Number(event.target.value);
                    const selectedTerm = terms.find((term) => Number(term.id) === selectedId);

                    if (!selectedTerm) {
                      setIsEditing(false);
                      setEditId(null);
                      setTermForm(initialTermForm);
                      return;
                    }

                    setIsEditing(true);
                    setEditId(selectedTerm.id);
                    setTermForm({
                      max_credit: String(selectedTerm.max_credit ?? "23"),
                    });
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Department + Term</option>
                  {sortedTerms.map((term) => {
                    const department = departments.find(
                      (departmentItem) => Number(departmentItem.id) === Number(term.department_id)
                    );
                    return (
                      <option key={term.id} value={term.id}>
                        {department ? department.code : `Department ${term.department_id}`} - Term {term.term_number}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Credits</label>
                <input
                  required
                  min="0.5"
                  step="0.5"
                  type="number"
                  value={termForm.max_credit}
                  onChange={(event) => setTermForm({ ...termForm, max_credit: event.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
            >
              Update Max Credits
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

        {activeTab === "offering" && (
          <div className="space-y-8">
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
                        return (
                          <tr key={offering.id} className="border-t hover:bg-gray-50">
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
                                onClick={() => handleOfferingEdit(offering)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOfferingDelete(offering.id)}
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
          </div>
        )}

        {activeTab === "teaches" && (
          <form onSubmit={handleTeachesSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Assign Teacher To Section</h2>
            <p className="text-sm text-gray-600">
              Create one teaching assignment at a time. Each offering + section can only have one teacher.
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
                      section_name: "",
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
                      section_name: "",
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
                <label className="block text-sm font-medium mb-1">Section</label>
                <select
                  required
                  value={teachForm.section_name}
                  onChange={(event) =>
                    setTeachForm((prev) => ({ ...prev, section_name: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                  disabled={!teachForm.term_id}
                >
                  <option value="">Select Section</option>
                  {teachSections.map((section) => (
                    <option key={`${section.term_id}-${section.name}`} value={section.name}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Teacher</label>
                <select
                  required
                  value={teachForm.teacher_id}
                  onChange={(event) =>
                    setTeachForm((prev) => ({ ...prev, teacher_id: event.target.value }))
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Teacher</option>
                  {teacherWithIdentity.map((teacher) => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {teacher.display_name} ({teacher.appointment || "Teacher"}) [{teacher.department_code}]
                    </option>
                  ))}
                </select>
                {/* <p className="mt-1 text-xs text-gray-500">
                  Cross-department teaching is allowed.
                </p> */}
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
          </form>
        )}
      </div>

    </div>
  );
};

export default CreateInfrastructure;
