import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import api from "../services/api";
import Loader from "../components/Loader";
import { sortTermsDepartment } from "../utils/termSort";
import ModeToggle from "./createInfrastructure/ModeToggle";
import DepartmentSection from "./createInfrastructure/DepartmentSection";
import TermSection from "./createInfrastructure/TermSection";
import CourseSection from "./createInfrastructure/CourseSection";
import SectionSection from "./createInfrastructure/SectionSection";
import OfferingSection from "./createInfrastructure/OfferingSection";
import TeachesSection from "./createInfrastructure/TeachesSection";
import BatchCourseSection from "./createInfrastructure/BatchCourseSection";

const COURSE_BATCH_CHUNK_SIZE = 60;

const cacheKeyForTab = (tab) => `infra-${tab}-list`;

const clearDepartmentDetailsCache = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("dept-details-")) {
      localStorage.removeItem(key);
    }
  });
};

const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });
  return query.toString();
};

const CreateInfrastructure = ({ initialTab = "department" }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeMode, setActiveMode] = useState("insertion");
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teachingAssignments, setTeachingAssignments] = useState([]);

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [prereqSearch, setPrereqSearch] = useState("");
  const [offeringCourseSearch, setOfferingCourseSearch] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  const initialDeptForm = { code: "", name: "" };
  const initialTermForm = {
    department_id: "",
    term_number: "",
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
    section_names: [],
    teacher_id: "",
    replace_existing: false,
  };

  const initialTeachInspection = {
    department_id: "",
    term_id: "",
    teacher_id: "",
    search: "",
  };

  const [deptForm, setDeptForm] = useState(initialDeptForm);
  const [termForm, setTermForm] = useState(initialTermForm);
  const [sectionForm, setSectionForm] = useState(initialSectionForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);
  const [offeringFilter, setOfferingFilter] = useState(initialOfferingFilter);
  const [teachForm, setTeachForm] = useState(initialTeachForm);
  const [teachInspection, setTeachInspection] = useState(initialTeachInspection);
  const [teachBatchResult, setTeachBatchResult] = useState(null);
  const [batchCourseLoading, setBatchCourseLoading] = useState(false);
  const [batchCourseResult, setBatchCourseResult] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setActiveMode("insertion");
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

  const loadTeachingAssignments = useCallback(
    async (filters = teachInspection) => {
      try {
        const response = await api.get("/teacher-sections/assignments", {
          params: {
            department_id: filters.department_id || undefined,
            term_id: filters.term_id || undefined,
            teacher_id: filters.teacher_id || undefined,
          },
        });
        setTeachingAssignments(response.data?.assignments || []);
      } catch (error) {
        setTeachingAssignments([]);
        setMessage({
          type: "error",
          text: error.response?.data?.error || "Failed to load teaching assignments.",
        });
      }
    },
    [teachInspection]
  );

  const openInsights = (params = {}) => {
    const queryString = buildQueryString(params);
    navigate(queryString ? `/admin/dashboard/insights?${queryString}` : "/admin/dashboard/insights");
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "teaches" && activeMode === "inspection") {
      loadTeachingAssignments();
    }
  }, [activeTab, activeMode, loadTeachingAssignments]);

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
    setTeachBatchResult(null);
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

    if (!termForm.department_id || !termForm.term_number || !termForm.max_credit) {
      setMessage({ type: "error", text: "Department, term number, and maximum credit are required." });
      return;
    }

    const target = terms.find(
      (term) =>
        Number(term.department_id) === Number(termForm.department_id) &&
        Number(term.term_number) === Number(termForm.term_number)
    );

    if (!target) {
      setMessage({
        type: "error",
        text: "No matching term found for the selected department and term number.",
      });
      return;
    }

    const payload = {
      department_id: Number(termForm.department_id),
      term_number: Number(termForm.term_number),
      max_credit: Number(termForm.max_credit),
    };

    try {
      await api.put(`/terms/${target.id}`, payload);
      setMessage({ type: "success", text: "Term credits updated successfully." });
      clearInfrastructureCaches();
      handleResetForm();
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update term credits.",
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
    setTeachBatchResult(null);

    if (!teachForm.term_id || !teachForm.course_offering_id || !teachForm.teacher_id) {
      setMessage({
        type: "error",
        text: "Term, course offering, and teacher are required.",
      });
      return;
    }

    if ((teachForm.section_names || []).length === 0) {
      setMessage({ type: "error", text: "Select at least one section." });
      return;
    }

    try {
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;
      const failures = [];

      for (const sectionName of teachForm.section_names || []) {
        try {
          const payload = {
            course_offering_id: Number(teachForm.course_offering_id),
            section_name: sectionName,
            teacher_id: Number(teachForm.teacher_id),
            replace_existing: Boolean(teachForm.replace_existing),
          };

          const response = await api.post("/teacher-sections/assign", payload);
          const action = response?.data?.action;
          if (action === "inserted") inserted += 1;
          if (action === "updated") updated += 1;
          if (action === "unchanged") unchanged += 1;
        } catch (error) {
          failures.push({
            section_name: sectionName,
            message: error.response?.data?.error || "Assignment failed",
          });
        }
      }

      setTeachBatchResult({ inserted, updated, unchanged, failures });
      const failed = failures.length;
      setMessage({
        type: failed > 0 ? "error" : "success",
        text: `Assignments complete. Inserted: ${inserted}, Updated: ${updated}, Unchanged: ${unchanged}, Failed: ${failed}.`,
      });
      await loadTeachingAssignments();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to assign teacher to section.",
      });
    }
  };

  const handleBatchCourseSubmit = async (rows) => {
    setMessage({ type: "", text: "" });
    setBatchCourseResult(null);

    try {
      setBatchCourseLoading(true);
      const chunkCount = Math.ceil(rows.length / COURSE_BATCH_CHUNK_SIZE);
      let inserted = 0;
      const results = [];

      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
        const start = chunkIndex * COURSE_BATCH_CHUNK_SIZE;
        const end = start + COURSE_BATCH_CHUNK_SIZE;
        const chunkRows = rows.slice(start, end);
        const response = await api.post("/courses/batch", { rows: chunkRows });
        const chunkData = response.data || {};

        inserted += Number(chunkData.inserted || 0);

        const chunkResults = Array.isArray(chunkData.results) ? chunkData.results : [];
        for (const item of chunkResults) {
          results.push({
            ...item,
            row: Number(item.row || 0) + start,
          });
        }
      }

      const mergedResult = {
        total: rows.length,
        inserted,
        failed: rows.length - inserted,
        results,
      };

      setBatchCourseResult(mergedResult);
      setMessage({
        type: "success",
        text: `Course batch import completed in ${chunkCount} request(s). Inserted ${mergedResult.inserted} of ${mergedResult.total}.`,
      });
      clearInfrastructureCaches();
      await fetchData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to import courses in batch.",
      });
    } finally {
      setBatchCourseLoading(false);
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

  const toggleTeachSection = (sectionName) => {
    const selected = new Set(teachForm.section_names || []);
    if (selected.has(sectionName)) {
      selected.delete(sectionName);
    } else {
      selected.add(sectionName);
    }

    setTeachForm((prev) => ({
      ...prev,
      section_names: [...selected].sort((left, right) => left.localeCompare(right)),
    }));
  };

  const filteredTeachingAssignments = useMemo(() => {
    const q = String(teachInspection.search || "").toLowerCase().trim();

    return teachingAssignments.filter((assignment) => {
      const matchesDepartment =
        !teachInspection.department_id ||
        Number(assignment.department_id) === Number(teachInspection.department_id);
      const matchesTerm = !teachInspection.term_id || Number(assignment.term_id) === Number(teachInspection.term_id);
      const matchesTeacher =
        !teachInspection.teacher_id || Number(assignment.teacher_id) === Number(teachInspection.teacher_id);

      if (!matchesDepartment || !matchesTerm || !matchesTeacher) {
        return false;
      }

      if (!q) return true;

      return (
        String(assignment.teacher_name || "").toLowerCase().includes(q) ||
        String(assignment.teacher_appointment || "").toLowerCase().includes(q) ||
        String(assignment.course_code || "").toLowerCase().includes(q) ||
        String(assignment.course_name || "").toLowerCase().includes(q) ||
        String(assignment.department_code || "").toLowerCase().includes(q) ||
        String(assignment.section_name || "").toLowerCase().includes(q)
      );
    });
  }, [teachingAssignments, teachInspection]);

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

  const supportsModeToggle = activeTab !== "department";
  const supportsBatchMode = activeTab === "course";
  const showInsertion = activeTab === "department" || activeMode === "insertion";
  const showInspection = activeTab === "department" || activeMode === "inspection";

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

        <ModeToggle
          supportsModeToggle={supportsModeToggle}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          includeBatch={supportsBatchMode}
        />

        <DepartmentSection
          activeTab={activeTab}
          showInsertion={showInsertion}
          showInspection={showInspection}
          isEditing={isEditing}
          handleDeptSubmit={handleDeptSubmit}
          handleResetForm={handleResetForm}
          deptForm={deptForm}
          setDeptForm={setDeptForm}
          search={search}
          setSearch={setSearch}
          filteredDepartments={filteredDepartments}
          openInsights={openInsights}
          navigate={navigate}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />

        <TermSection
          activeTab={activeTab}
          showInsertion={showInsertion}
          showInspection={showInspection}
          handleTermSubmit={handleTermSubmit}
          termForm={termForm}
          setTermForm={setTermForm}
          departments={departments}
          sortedTerms={sortedTerms}
          search={search}
          setSearch={setSearch}
          filteredTerms={filteredTerms}
          openInsights={openInsights}
          navigate={navigate}
        />

        <CourseSection
          activeTab={activeTab}
          showInsertion={showInsertion}
          showInspection={showInspection}
          isEditing={isEditing}
          handleCourseSubmit={handleCourseSubmit}
          handleResetForm={handleResetForm}
          courseForm={courseForm}
          setCourseForm={setCourseForm}
          departments={departments}
          prereqSearch={prereqSearch}
          setPrereqSearch={setPrereqSearch}
          availablePrereqCourses={availablePrereqCourses}
          togglePrerequisite={togglePrerequisite}
          selectedPrereqList={selectedPrereqList}
          search={search}
          setSearch={setSearch}
          filteredCourses={filteredCourses}
          courses={courses}
          openInsights={openInsights}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />

        <BatchCourseSection
          activeTab={activeTab}
          activeMode={activeMode}
          loading={batchCourseLoading}
          result={batchCourseResult}
          onSubmit={handleBatchCourseSubmit}
        />

        <SectionSection
          activeTab={activeTab}
          showInsertion={showInsertion}
          showInspection={showInspection}
          isEditing={isEditing}
          handleSectionSubmit={handleSectionSubmit}
          handleResetForm={handleResetForm}
          sectionForm={sectionForm}
          setSectionForm={setSectionForm}
          departments={departments}
          sortedTerms={sortedTerms}
          search={search}
          setSearch={setSearch}
          filteredSections={filteredSections}
          terms={terms}
          openInsights={openInsights}
        />

        <OfferingSection
          activeTab={activeTab}
          showInsertion={showInsertion}
          showInspection={showInspection}
          isEditing={isEditing}
          handleOfferingSubmit={handleOfferingSubmit}
          handleResetForm={handleResetForm}
          offeringForm={offeringForm}
          setOfferingForm={setOfferingForm}
          departments={departments}
          sortedTerms={sortedTerms}
          offeringCourseSearch={offeringCourseSearch}
          setOfferingCourseSearch={setOfferingCourseSearch}
          filteredOfferingCourses={filteredOfferingCourses}
          toggleOfferingCourseSelection={toggleOfferingCourseSelection}
          loadOfferingsByFilter={loadOfferingsByFilter}
          offeringFilter={offeringFilter}
          setOfferingFilter={setOfferingFilter}
          filteredOfferings={filteredOfferings}
          courses={courses}
          terms={terms}
          openInsights={openInsights}
          handleOfferingEdit={handleOfferingEdit}
          handleOfferingDelete={handleOfferingDelete}
        />

        <TeachesSection
          activeTab={activeTab}
          showInsertion={showInsertion}
          showInspection={showInspection}
          handleTeachesSubmit={handleTeachesSubmit}
          teachForm={teachForm}
          setTeachForm={setTeachForm}
          setOfferings={setOfferings}
          departments={departments}
          teachTerms={teachTerms}
          loadTeachOfferings={loadTeachOfferings}
          offerings={offerings}
          teachSections={teachSections}
          toggleTeachSection={toggleTeachSection}
          teacherWithIdentity={teacherWithIdentity}
          teachBatchResult={teachBatchResult}
          teachInspection={teachInspection}
          setTeachInspection={setTeachInspection}
          sortedTerms={sortedTerms}
          loadTeachingAssignments={loadTeachingAssignments}
          filteredTeachingAssignments={filteredTeachingAssignments}
          openInsights={openInsights}
        />
      </div>

    </div>
  );
};

export default CreateInfrastructure;
