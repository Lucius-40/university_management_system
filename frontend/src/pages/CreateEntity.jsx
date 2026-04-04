import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { sortTermsDepartment } from "../utils/termSort";
import {
  firstValidationError,
  sanitizeStudentCreateForm,
  sanitizeTeacherCreateForm,
  validateStudentCreateForm,
  validateTeacherCreateForm,
} from "../utils/validators";
import ModeToggle from "./createEntity/ModeToggle";
import TeacherSection from "./createEntity/TeacherSection";
import StudentSection from "./createEntity/StudentSection";
import AdvisorSection from "./createEntity/AdvisorSection";
import SectionAssignSection from "./createEntity/SectionAssignSection";
import BatchStudentSection from "./createEntity/BatchStudentSection";
import BatchTeacherSection from "./createEntity/BatchTeacherSection";
import StudentRollPickerModal from "../components/StudentRollPickerModal";

const BATCH_CHUNK_SIZE = 40;

const getResolvedEntityTab = (tab) => {
  if (tab === "batch-student") return "student";
  if (tab === "batch-teacher") return "teacher";
  return tab;
};

const getDefaultMode = (tab) => {
  if (tab === "batch-student" || tab === "batch-teacher") return "batch";
  return "insertion";
};

const getTeacherDisplayName = (teacher) => {
  const value =
    teacher?.name ||
    teacher?.full_name ||
    teacher?.user_name ||
    "";

  if (String(value).trim()) return String(value).trim();
  return "Unknown Teacher";
};

const extractRollSuffix = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const suffix = Number(digits.slice(-3));
  if (!Number.isInteger(suffix)) return null;
  return suffix;
};

const CreateEntity = ({ initialTab = "student" }) => {
  const navigate = useNavigate();
  const activeTab = getResolvedEntityTab(initialTab);
  const [activeMode, setActiveMode] = useState(getDefaultMode(initialTab));
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [advisorSummary, setAdvisorSummary] = useState(null);
  const [advisorAssigning, setAdvisorAssigning] = useState(false);
  const [sectionSummary, setSectionSummary] = useState(null);
  const [sectionAssigning, setSectionAssigning] = useState(false);
  const [teacherInspectionRows, setTeacherInspectionRows] = useState([]);
  const [studentInspectionRows, setStudentInspectionRows] = useState([]);
  const [advisorInspectionRows, setAdvisorInspectionRows] = useState([]);
  const [sectionInspectionRows, setSectionInspectionRows] = useState([]);
  const [batchStudentLoading, setBatchStudentLoading] = useState(false);
  const [batchTeacherLoading, setBatchTeacherLoading] = useState(false);
  const [batchStudentResult, setBatchStudentResult] = useState(null);
  const [batchTeacherResult, setBatchTeacherResult] = useState(null);
  const [rollPicker, setRollPicker] = useState({ isOpen: false, target: "" });

  const [teacherInspectFilters, setTeacherInspectFilters] = useState({
    department_id: "",
    appointment: "",
    search: "",
  });

  const [studentInspectFilters, setStudentInspectFilters] = useState({
    department_id: "",
    term_id: "",
    section: "",
    search: "",
  });

  const [advisorInspectFilters, setAdvisorInspectFilters] = useState({
    department_id: "",
    term_id: "",
    teacher_id: "",
    search: "",
  });

  const [sectionInspectFilters, setSectionInspectFilters] = useState({
    department_id: "",
    term_id: "",
    section_name: "",
    search: "",
  });

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    mobile_number: "",
    present_address: "",
    permanent_address: "",
    birth_date: "",
    role: "teacher",
    department_id: "",
    appointment: "Lecturer",
    official_mail: "",
  });

  const [studentForm, setStudentForm] = useState({
    name: "",
    roll_number: "",
    email: "",
    official_mail: "",
    mobile_number: "",
    present_address: "",
    permanent_address: "",
    birth_date: "",
    department_id: "",
    current_term: "",
  });

  const [advisorForm, setAdvisorForm] = useState({
    department_id: "",
    term_id: "",
    teacher_id: "",
    roll_start: "",
    roll_end: "",
    start_date: "",
    change_reason: "",
  });

  const [sectionForm, setSectionForm] = useState({
    department_id: "",
    term_id: "",
    section_name: "",
    roll_start: "",
    roll_end: "",
  });

  const sortedTerms = useMemo(
    () => sortTermsDepartment(terms, departments),
    [terms, departments]
  );

  const studentTerms = sortedTerms.filter(
    (term) => String(term.department_id) === String(studentForm.department_id)
  );

  const advisorTerms = sortedTerms.filter(
    (term) => String(term.department_id) === String(advisorForm.department_id)
  );

  const sectionTerms = sortedTerms.filter(
    (term) => String(term.department_id) === String(sectionForm.department_id)
  );

  const sectionOptions = useMemo(() => {
    if (!sectionForm.term_id) return [];

    return sections
      .filter((section) => String(section.term_id) === String(sectionForm.term_id))
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  }, [sectionForm.term_id, sections]);

  const advisorTeachers = useMemo(() => {
    if (!advisorForm.department_id) return [];

    return teachers
      .filter((teacher) => String(teacher.department_id) === String(advisorForm.department_id))
      .sort((left, right) =>
        getTeacherDisplayName(left).localeCompare(getTeacherDisplayName(right))
      );
  }, [advisorForm.department_id, teachers]);

  const appointmentOptions = useMemo(() => {
    return [...new Set(teacherInspectionRows.map((row) => row.appointment).filter(Boolean))].sort(
      (left, right) => String(left).localeCompare(String(right))
    );
  }, [teacherInspectionRows]);

  const studentInspectTerms = useMemo(() => {
    if (!studentInspectFilters.department_id) return sortedTerms;
    return sortedTerms.filter(
      (term) => String(term.department_id) === String(studentInspectFilters.department_id)
    );
  }, [sortedTerms, studentInspectFilters.department_id]);

  const studentInspectSections = useMemo(() => {
    const names = new Set();

    studentInspectionRows.forEach((row) => {
      const matchesDepartment =
        !studentInspectFilters.department_id ||
        Number(row.department_id) === Number(studentInspectFilters.department_id);
      const matchesTerm =
        !studentInspectFilters.term_id || Number(row.term_id) === Number(studentInspectFilters.term_id);

      if (!matchesDepartment || !matchesTerm) return;

      String(row.section_names || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => names.add(value));
    });

    return [...names].sort((left, right) => left.localeCompare(right));
  }, [studentInspectionRows, studentInspectFilters.department_id, studentInspectFilters.term_id]);

  const filteredTeacherInspectionRows = useMemo(() => {
    const q = String(teacherInspectFilters.search || "").toLowerCase().trim();

    return teacherInspectionRows
      .filter((row) => {
        const matchesDepartment =
          !teacherInspectFilters.department_id ||
          Number(row.department_id) === Number(teacherInspectFilters.department_id);
        const matchesAppointment =
          !teacherInspectFilters.appointment ||
          String(row.appointment || "") === String(teacherInspectFilters.appointment);

        if (!matchesDepartment || !matchesAppointment) return false;
        if (!q) return true;

        return (
          String(row.full_name || "").toLowerCase().includes(q) ||
          String(row.official_mail || "").toLowerCase().includes(q) ||
          String(row.department_code || "").toLowerCase().includes(q) ||
          String(row.appointment || "").toLowerCase().includes(q)
        );
      })
      .sort((left, right) =>
        String(left.full_name || "").localeCompare(String(right.full_name || ""))
      );
  }, [teacherInspectionRows, teacherInspectFilters]);

  const filteredStudentInspectionRows = useMemo(() => {
    const q = String(studentInspectFilters.search || "").toLowerCase().trim();

    return studentInspectionRows
      .filter((row) => {
        const matchesDepartment =
          !studentInspectFilters.department_id ||
          Number(row.department_id) === Number(studentInspectFilters.department_id);
        const matchesTerm =
          !studentInspectFilters.term_id || Number(row.term_id) === Number(studentInspectFilters.term_id);

        const sectionNames = String(row.section_names || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        const matchesSection = !studentInspectFilters.section || sectionNames.includes(studentInspectFilters.section);

        if (!matchesDepartment || !matchesTerm || !matchesSection) return false;
        if (!q) return true;

        return (
          String(row.full_name || "").toLowerCase().includes(q) ||
          String(row.roll_number || "").toLowerCase().includes(q) ||
          String(row.department_code || "").toLowerCase().includes(q) ||
          sectionNames.some((value) => value.toLowerCase().includes(q))
        );
      })
      .sort((left, right) => {
        const leftTerm = Number(left.term_number || 0);
        const rightTerm = Number(right.term_number || 0);
        if (leftTerm !== rightTerm) return leftTerm - rightTerm;
        return String(left.roll_number || "").localeCompare(String(right.roll_number || ""));
      });
  }, [studentInspectionRows, studentInspectFilters]);

  const filteredAdvisorInspectionRows = useMemo(() => {
    const q = String(advisorInspectFilters.search || "").toLowerCase().trim();
    return advisorInspectionRows.filter((row) => {
      if (!q) return true;
      return (
        String(row.advisor_name || "").toLowerCase().includes(q) ||
        String(row.student_name || "").toLowerCase().includes(q) ||
        String(row.roll_number || "").toLowerCase().includes(q) ||
        String(row.department_code || "").toLowerCase().includes(q)
      );
    });
  }, [advisorInspectionRows, advisorInspectFilters.search]);

  const groupedAdvisorInspection = useMemo(() => {
    const advisorMap = new Map();

    filteredAdvisorInspectionRows.forEach((row) => {
      const advisorKey = String(row.teacher_id);
      if (!advisorMap.has(advisorKey)) {
        advisorMap.set(advisorKey, {
          teacher_id: row.teacher_id,
          advisor_name: row.advisor_name,
          advisor_appointment: row.advisor_appointment,
          department_id: row.department_id,
          department_code: row.department_code,
          terms: new Map(),
        });
      }

      const advisorEntry = advisorMap.get(advisorKey);
      const termKey = String(row.term_id);
      if (!advisorEntry.terms.has(termKey)) {
        advisorEntry.terms.set(termKey, {
          term_id: row.term_id,
          term_number: row.term_number,
          students: [],
        });
      }

      advisorEntry.terms.get(termKey).students.push({
        student_id: row.student_id,
        student_name: row.student_name,
        roll_number: row.roll_number,
      });
    });

    return [...advisorMap.values()]
      .map((advisorEntry) => ({
        ...advisorEntry,
        terms: [...advisorEntry.terms.values()].sort(
          (left, right) => Number(left.term_number) - Number(right.term_number)
        ),
      }))
      .sort((left, right) => String(left.advisor_name || "").localeCompare(String(right.advisor_name || "")));
  }, [filteredAdvisorInspectionRows]);

  const filteredSectionInspectionRows = useMemo(() => {
    const q = String(sectionInspectFilters.search || "").toLowerCase().trim();
    return sectionInspectionRows.filter((row) => {
      if (!q) return true;
      return (
        String(row.section_name || "").toLowerCase().includes(q) ||
        String(row.student_name || "").toLowerCase().includes(q) ||
        String(row.roll_number || "").toLowerCase().includes(q) ||
        String(row.department_code || "").toLowerCase().includes(q)
      );
    });
  }, [sectionInspectionRows, sectionInspectFilters.search]);

  const groupedSectionInspection = useMemo(() => {
    const sectionMap = new Map();

    filteredSectionInspectionRows.forEach((row) => {
      const sectionKey = `${row.department_id}-${row.section_name}`;
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          department_id: row.department_id,
          section_name: row.section_name,
          department_code: row.department_code,
          terms: new Map(),
        });
      }

      const sectionEntry = sectionMap.get(sectionKey);
      const termKey = String(row.term_id);
      if (!sectionEntry.terms.has(termKey)) {
        sectionEntry.terms.set(termKey, {
          term_id: row.term_id,
          term_number: row.term_number,
          students: [],
        });
      }

      sectionEntry.terms.get(termKey).students.push({
        student_id: row.student_id,
        student_name: row.student_name,
        roll_number: row.roll_number,
      });
    });

    return [...sectionMap.values()]
      .map((entry) => ({
        ...entry,
        terms: [...entry.terms.values()].sort(
          (left, right) => Number(left.term_number) - Number(right.term_number)
        ),
      }))
      .sort((left, right) => String(left.section_name || "").localeCompare(String(right.section_name || "")));
  }, [filteredSectionInspectionRows]);

  useEffect(() => {
    Promise.all([
      api.get("/departments"),
      api.get("/terms"),
      api.get("/teachers"),
      api.get("/sections"),
      api.get("/users/inspect", { params: { identity: "teacher" } }),
    ])
      .then(([
        departmentResponse,
        termResponse,
        teacherResponse,
        sectionResponse,
        teacherInspectResponse,
      ]) => {
        setDepartments(departmentResponse.data || []);
        setTerms(termResponse.data || []);
        setSections(sectionResponse.data || []);

        const teacherRows = teacherResponse.data || [];
        const teacherInspectRows = teacherInspectResponse.data || [];

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

        setTeachers([...teacherMap.values()]);
      })
      .catch(() => {
        console.error("Failed to fetch departments/terms/teachers/sections");
      });
  }, []);

  useEffect(() => {
    setActiveMode(getDefaultMode(initialTab));
  }, [initialTab]);

  const supportsModeToggle = true;
  const supportsBatchMode = activeTab === "student" || activeTab === "teacher";

  const loadTeacherInspection = async () => {
    setInspectLoading(true);
    try {
      const response = await api.get("/users/inspect", { params: { identity: "teacher" } });
      setTeacherInspectionRows(response.data || []);
    } catch (error) {
      setTeacherInspectionRows([]);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load teacher inspection data.",
      });
    } finally {
      setInspectLoading(false);
    }
  };

  const loadStudentInspection = async () => {
    setInspectLoading(true);
    try {
      const response = await api.get("/users/inspect", { params: { identity: "student" } });
      setStudentInspectionRows(response.data || []);
    } catch (error) {
      setStudentInspectionRows([]);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load student inspection data.",
      });
    } finally {
      setInspectLoading(false);
    }
  };

  const loadAdvisorInspection = async () => {
    setInspectLoading(true);
    try {
      const response = await api.get("/students/advisors/inspect", {
        params: {
          department_id: advisorInspectFilters.department_id || undefined,
          term_id: advisorInspectFilters.term_id || undefined,
          teacher_id: advisorInspectFilters.teacher_id || undefined,
        },
      });
      setAdvisorInspectionRows(response.data?.assignments || []);
    } catch (error) {
      setAdvisorInspectionRows([]);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load advisor inspection data.",
      });
    } finally {
      setInspectLoading(false);
    }
  };

  const loadSectionInspection = async () => {
    setInspectLoading(true);
    try {
      const response = await api.get("/sections/assignments/inspect", {
        params: {
          department_id: sectionInspectFilters.department_id || undefined,
          term_id: sectionInspectFilters.term_id || undefined,
          section_name: sectionInspectFilters.section_name || undefined,
        },
      });
      setSectionInspectionRows(response.data?.assignments || []);
    } catch (error) {
      setSectionInspectionRows([]);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load section assignment inspection data.",
      });
    } finally {
      setInspectLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode !== "inspection") return;

    if (activeTab === "teacher") {
      loadTeacherInspection();
    }
    if (activeTab === "student") {
      loadStudentInspection();
    }
    if (activeTab === "advisor") {
      loadAdvisorInspection();
    }
    if (activeTab === "section-assign") {
      loadSectionInspection();
    }
  }, [activeMode, activeTab]);

  const openRollPicker = (target) => {
    setRollPicker({ isOpen: true, target });
  };

  const closeRollPicker = () => {
    setRollPicker({ isOpen: false, target: "" });
  };

  const handleRollSelected = (rollNumber) => {
    if (rollPicker.target === "advisor_start") {
      setAdvisorForm((previous) => ({ ...previous, roll_start: rollNumber }));
    }

    if (rollPicker.target === "advisor_end") {
      setAdvisorForm((previous) => ({ ...previous, roll_end: rollNumber }));
    }

    if (rollPicker.target === "section_start") {
      setSectionForm((previous) => ({ ...previous, roll_start: rollNumber }));
    }

    if (rollPicker.target === "section_end") {
      setSectionForm((previous) => ({ ...previous, roll_end: rollNumber }));
    }

    closeRollPicker();
  };

  const pickerDepartmentId =
    rollPicker.target === "advisor_start" || rollPicker.target === "advisor_end"
      ? advisorForm.department_id
      : sectionForm.department_id;

  const pickerTermId =
    rollPicker.target === "advisor_start" || rollPicker.target === "advisor_end"
      ? advisorForm.term_id
      : sectionForm.term_id;

  const pickerTitle =
    rollPicker.target === "advisor_start"
      ? "Select Start Roll For Advisor Assignment"
      : rollPicker.target === "advisor_end"
      ? "Select End Roll For Advisor Assignment"
      : rollPicker.target === "section_start"
      ? "Select Start Roll For Section Assignment"
      : "Select End Roll For Section Assignment";

  const handleSectionAssign = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    setSectionSummary(null);

    const rawRollStart = String(sectionForm.roll_start || "").trim();
    const rawRollEnd = String(sectionForm.roll_end || "").trim();
    const rollStartNumber = extractRollSuffix(rawRollStart);
    const rollEndNumber = extractRollSuffix(rawRollEnd);

    if (!sectionForm.department_id || !sectionForm.term_id || !sectionForm.section_name) {
      setMessage({ type: "error", text: "Department, term, and section are required." });
      return;
    }

    if (!Number.isInteger(rollStartNumber) || !Number.isInteger(rollEndNumber)) {
      setMessage({
        type: "error",
        text: "Roll start and roll end must contain digits (for example CSE2305160 or 160).",
      });
      return;
    }

    if (rollStartNumber > rollEndNumber) {
      setMessage({ type: "error", text: "Roll start must be less than or equal to roll end." });
      return;
    }

    const confirmed = window.confirm(
      `Assign section ${sectionForm.section_name} to roll range ${rawRollStart} to ${rawRollEnd}? (Matched by last 3 digits: ${rollStartNumber}-${rollEndNumber}) Existing section mappings for matched students may be overwritten.`
    );

    if (!confirmed) return;

    try {
      setSectionAssigning(true);

      const payload = {
        department_id: Number(sectionForm.department_id),
        term_id: Number(sectionForm.term_id),
        section_name: sectionForm.section_name,
        roll_start: rawRollStart,
        roll_end: rawRollEnd,
      };

      const response = await api.post("/sections/assign-range", payload);
      setSectionSummary(response.data || null);
      setMessage({ type: "success", text: "Section assignment completed successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to assign sections by range.",
      });
    } finally {
      setSectionAssigning(false);
    }
  };

  const handleAdvisorAssign = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    setAdvisorSummary(null);

    const rawRollStart = String(advisorForm.roll_start || "").trim();
    const rawRollEnd = String(advisorForm.roll_end || "").trim();
    const rollStartNumber = extractRollSuffix(rawRollStart);
    const rollEndNumber = extractRollSuffix(rawRollEnd);

    if (!advisorForm.department_id || !advisorForm.term_id || !advisorForm.teacher_id) {
      setMessage({ type: "error", text: "Department, term, and advisor teacher are required." });
      return;
    }

    if (!Number.isInteger(rollStartNumber) || !Number.isInteger(rollEndNumber)) {
      setMessage({
        type: "error",
        text: "Roll start and roll end must contain digits (for example CSE2305160 or 160).",
      });
      return;
    }

    if (rollStartNumber > rollEndNumber) {
      setMessage({ type: "error", text: "Roll start must be less than or equal to roll end." });
      return;
    }

    const confirmed = window.confirm(
      `Assign advisor to roll range ${rawRollStart} to ${rawRollEnd}? (Matched by last 3 digits: ${rollStartNumber}-${rollEndNumber}) This will close old active advisor rows and keep history.`
    );

    if (!confirmed) return;

    try {
      setAdvisorAssigning(true);

      const payload = {
        department_id: Number(advisorForm.department_id),
        term_id: Number(advisorForm.term_id),
        teacher_id: Number(advisorForm.teacher_id),
        roll_start: rawRollStart,
        roll_end: rawRollEnd,
      };

      if (advisorForm.start_date) {
        payload.start_date = advisorForm.start_date;
      }

      if (advisorForm.change_reason.trim()) {
        payload.change_reason = advisorForm.change_reason.trim();
      }

      const response = await api.post("/students/advisors/assign-range", payload);
      setAdvisorSummary(response.data || null);
      setMessage({ type: "success", text: "Advisor assignment completed successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to assign advisors by range.",
      });
    } finally {
      setAdvisorAssigning(false);
    }
  };

  const handleTeacherSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    const normalizedForm = sanitizeTeacherCreateForm(teacherForm);
    const validationErrors = validateTeacherCreateForm(normalizedForm);
    if (Object.keys(validationErrors).length > 0) {
      setMessage({
        type: "error",
        text: firstValidationError(validationErrors) || "Please fix invalid teacher fields.",
      });
      return;
    }

    try {
      const defaultPassword = `${normalizedForm.email.split("@")[0]}@Univ2026`;

      const userResponse = await api.post("/users/register", {
        name: normalizedForm.name,
        email: normalizedForm.email,
        mobile_number: normalizedForm.mobile_number,
        present_address: normalizedForm.present_address,
        permanent_address: normalizedForm.permanent_address,
        birth_date: normalizedForm.birth_date,
        password: defaultPassword,
        role: "teacher",
      });

      const userId = userResponse.data.user?.id || userResponse.data.id;

      await api.post("/teachers", {
        user_id: userId,
        appointment: normalizedForm.appointment,
        official_mail: normalizedForm.official_mail,
        department_id: normalizedForm.department_id,
      });

      setMessage({
        type: "success",
        text: `Teacher created successfully. Default password: ${defaultPassword}`,
      });

      setTeacherForm((prev) => ({
        ...prev,
        name: "",
        email: "",
        mobile_number: "",
        present_address: "",
        permanent_address: "",
        official_mail: "",
      }));
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      const backendErrorMessage = backendErrors ? firstValidationError(backendErrors) : "";
      setMessage({
        type: "error",
        text:
          backendErrorMessage ||
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to create teacher",
      });
    }
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    const normalizedForm = sanitizeStudentCreateForm(studentForm);
    const validationErrors = validateStudentCreateForm(normalizedForm);
    if (Object.keys(validationErrors).length > 0) {
      setMessage({
        type: "error",
        text: firstValidationError(validationErrors) || "Please fix invalid student fields.",
      });
      return;
    }

    try {
      const defaultPassword = `${normalizedForm.roll_number}@Univ2026`;

      const userResponse = await api.post("/users/register", {
        name: normalizedForm.name,
        email: normalizedForm.email,
        mobile_number: normalizedForm.mobile_number,
        present_address: normalizedForm.present_address,
        permanent_address: normalizedForm.permanent_address,
        birth_date: normalizedForm.birth_date,
        password: defaultPassword,
        role: "student",
      });

      const userId = userResponse.data.user?.id || userResponse.data.id;

      await api.post("/students", {
        user_id: userId,
        roll_number: normalizedForm.roll_number,
        official_mail: normalizedForm.official_mail,
        current_term: normalizedForm.current_term,
      });

      setMessage({
        type: "success",
        text: `Student created successfully. Default password: ${defaultPassword}`,
      });

      setStudentForm({
        name: "",
        roll_number: "",
        email: "",
        official_mail: "",
        mobile_number: "",
        present_address: "",
        permanent_address: "",
        birth_date: "",
        department_id: "",
        current_term: "",
      });
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      const backendErrorMessage = backendErrors ? firstValidationError(backendErrors) : "";
      setMessage({
        type: "error",
        text:
          backendErrorMessage ||
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to create student",
      });
    }
  };

  const handleBatchStudentSubmit = async (rows) => {
    setMessage({ type: "", text: "" });
    setBatchStudentResult(null);

    try {
      setBatchStudentLoading(true);
      const chunkCount = Math.ceil(rows.length / BATCH_CHUNK_SIZE);
      let inserted = 0;
      const results = [];

      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
        const start = chunkIndex * BATCH_CHUNK_SIZE;
        const end = start + BATCH_CHUNK_SIZE;
        const chunkRows = rows.slice(start, end);
        const response = await api.post("/students/batch", { rows: chunkRows });
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

      setBatchStudentResult(mergedResult);
      setMessage({
        type: "success",
        text: `Student batch import completed in ${chunkCount} request(s). Inserted ${mergedResult.inserted} of ${mergedResult.total}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to import students in batch.",
      });
    } finally {
      setBatchStudentLoading(false);
    }
  };

  const handleBatchTeacherSubmit = async (rows) => {
    setMessage({ type: "", text: "" });
    setBatchTeacherResult(null);

    try {
      setBatchTeacherLoading(true);
      const chunkCount = Math.ceil(rows.length / BATCH_CHUNK_SIZE);
      let inserted = 0;
      const results = [];

      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
        const start = chunkIndex * BATCH_CHUNK_SIZE;
        const end = start + BATCH_CHUNK_SIZE;
        const chunkRows = rows.slice(start, end);
        const response = await api.post("/teachers/batch", { rows: chunkRows });
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

      setBatchTeacherResult(mergedResult);
      setMessage({
        type: "success",
        text: `Teacher batch import completed in ${chunkCount} request(s). Inserted ${mergedResult.inserted} of ${mergedResult.total}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to import teachers in batch.",
      });
    } finally {
      setBatchTeacherLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Entity Provisioning</h1>

      {message.text && (
        <div
          className={`p-4 mb-6 rounded ${
            message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {supportsModeToggle && (
          <ModeToggle
            activeMode={activeMode}
            setActiveMode={setActiveMode}
            includeBatch={supportsBatchMode}
          />
        )}

        <TeacherSection
          activeMode={activeMode}
          activeTab={activeTab}
          inspectLoading={inspectLoading}
          departments={departments}
          teacherInspectFilters={teacherInspectFilters}
          setTeacherInspectFilters={setTeacherInspectFilters}
          appointmentOptions={appointmentOptions}
          filteredTeacherInspectionRows={filteredTeacherInspectionRows}
          navigate={navigate}
          handleTeacherSubmit={handleTeacherSubmit}
          teacherForm={teacherForm}
          setTeacherForm={setTeacherForm}
        />

        <StudentSection
          activeMode={activeMode}
          activeTab={activeTab}
          inspectLoading={inspectLoading}
          departments={departments}
          studentInspectFilters={studentInspectFilters}
          setStudentInspectFilters={setStudentInspectFilters}
          studentInspectTerms={studentInspectTerms}
          studentInspectSections={studentInspectSections}
          filteredStudentInspectionRows={filteredStudentInspectionRows}
          navigate={navigate}
          handleStudentSubmit={handleStudentSubmit}
          studentForm={studentForm}
          setStudentForm={setStudentForm}
          studentTerms={studentTerms}
        />

        <AdvisorSection
          activeMode={activeMode}
          activeTab={activeTab}
          inspectLoading={inspectLoading}
          departments={departments}
          sortedTerms={sortedTerms}
          teachers={teachers}
          getTeacherDisplayName={getTeacherDisplayName}
          advisorInspectFilters={advisorInspectFilters}
          setAdvisorInspectFilters={setAdvisorInspectFilters}
          loadAdvisorInspection={loadAdvisorInspection}
          groupedAdvisorInspection={groupedAdvisorInspection}
          navigate={navigate}
          handleAdvisorAssign={handleAdvisorAssign}
          advisorForm={advisorForm}
          setAdvisorForm={setAdvisorForm}
          openRollPicker={openRollPicker}
          advisorAssigning={advisorAssigning}
          advisorTerms={advisorTerms}
          advisorTeachers={advisorTeachers}
          advisorSummary={advisorSummary}
        />

        <SectionAssignSection
          activeMode={activeMode}
          activeTab={activeTab}
          inspectLoading={inspectLoading}
          departments={departments}
          sortedTerms={sortedTerms}
          sections={sections}
          sectionInspectFilters={sectionInspectFilters}
          setSectionInspectFilters={setSectionInspectFilters}
          loadSectionInspection={loadSectionInspection}
          groupedSectionInspection={groupedSectionInspection}
          navigate={navigate}
          handleSectionAssign={handleSectionAssign}
          sectionForm={sectionForm}
          setSectionForm={setSectionForm}
          openRollPicker={openRollPicker}
          sectionAssigning={sectionAssigning}
          sectionTerms={sectionTerms}
          sectionOptions={sectionOptions}
          sectionSummary={sectionSummary}
        />

        <StudentRollPickerModal
          isOpen={rollPicker.isOpen}
          onClose={closeRollPicker}
          onSelect={handleRollSelected}
          departmentId={pickerDepartmentId}
          termId={pickerTermId}
          title={pickerTitle}
        />

        <BatchStudentSection
          activeTab={activeTab}
          activeMode={activeMode}
          loading={batchStudentLoading}
          result={batchStudentResult}
          onSubmit={handleBatchStudentSubmit}
        />

        <BatchTeacherSection
          activeTab={activeTab}
          activeMode={activeMode}
          loading={batchTeacherLoading}
          result={batchTeacherResult}
          onSubmit={handleBatchTeacherSubmit}
        />
      </div>
    </div>
  );
};

export default CreateEntity;