import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { sortTermsDepartment } from "../utils/termSort";

const getTeacherDisplayName = (teacher) => {
  const value =
    teacher?.name ||
    teacher?.full_name ||
    teacher?.user_name ||
    "";

  if (String(value).trim()) return String(value).trim();
  return "Unknown Teacher";
};

const CreateEntity = ({ initialTab = "student" }) => {
  const activeTab = initialTab;
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [advisorSummary, setAdvisorSummary] = useState(null);
  const [advisorAssigning, setAdvisorAssigning] = useState(false);
  const [sectionSummary, setSectionSummary] = useState(null);
  const [sectionAssigning, setSectionAssigning] = useState(false);

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

        // console.log(teacherInspectResponse);
        

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

  const handleSectionAssign = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    setSectionSummary(null);

    const rollStartNumber = Number(sectionForm.roll_start);
    const rollEndNumber = Number(sectionForm.roll_end);

    if (!sectionForm.department_id || !sectionForm.term_id || !sectionForm.section_name) {
      setMessage({ type: "error", text: "Department, term, and section are required." });
      return;
    }

    if (!Number.isInteger(rollStartNumber) || !Number.isInteger(rollEndNumber)) {
      setMessage({ type: "error", text: "Roll start and roll end must be whole numbers." });
      return;
    }

    if (rollStartNumber > rollEndNumber) {
      setMessage({ type: "error", text: "Roll start must be less than or equal to roll end." });
      return;
    }

    const confirmed = window.confirm(
      `Assign section ${sectionForm.section_name} to roll range ${rollStartNumber} to ${rollEndNumber}? Existing section mappings for matched students may be overwritten.`
    );

    if (!confirmed) return;

    try {
      setSectionAssigning(true);

      const payload = {
        department_id: Number(sectionForm.department_id),
        term_id: Number(sectionForm.term_id),
        section_name: sectionForm.section_name,
        roll_start: rollStartNumber,
        roll_end: rollEndNumber,
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

    const rollStartNumber = Number(advisorForm.roll_start);
    const rollEndNumber = Number(advisorForm.roll_end);

    if (!advisorForm.department_id || !advisorForm.term_id || !advisorForm.teacher_id) {
      setMessage({ type: "error", text: "Department, term, and advisor teacher are required." });
      return;
    }

    if (!Number.isInteger(rollStartNumber) || !Number.isInteger(rollEndNumber)) {
      setMessage({ type: "error", text: "Roll start and roll end must be whole numbers." });
      return;
    }

    if (rollStartNumber > rollEndNumber) {
      setMessage({ type: "error", text: "Roll start must be less than or equal to roll end." });
      return;
    }

    const confirmed = window.confirm(
      `Assign advisor to roll range ${rollStartNumber} to ${rollEndNumber}? This will close old active advisor rows and keep history.`
    );

    if (!confirmed) return;

    try {
      setAdvisorAssigning(true);

      const payload = {
        department_id: Number(advisorForm.department_id),
        term_id: Number(advisorForm.term_id),
        teacher_id: Number(advisorForm.teacher_id),
        roll_start: rollStartNumber,
        roll_end: rollEndNumber,
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

    try {
      const defaultPassword = `${teacherForm.email.split("@")[0]}@Univ2026`;

      const userResponse = await api.post("/users/register", {
        name: teacherForm.name,
        email: teacherForm.email,
        mobile_number: teacherForm.mobile_number,
        present_address: teacherForm.present_address,
        permanent_address: teacherForm.permanent_address,
        birth_date: teacherForm.birth_date,
        password: defaultPassword,
        role: "teacher",
      });

      const userId = userResponse.data.user?.id || userResponse.data.id;

      await api.post("/teachers", {
        user_id: userId,
        appointment: teacherForm.appointment,
        official_mail: teacherForm.official_mail,
        department_id: Number(teacherForm.department_id),
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
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to create teacher",
      });
    }
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      const defaultPassword = `${studentForm.roll_number}@Univ2026`;

      const userResponse = await api.post("/users/register", {
        name: studentForm.name,
        email: studentForm.email,
        mobile_number: studentForm.mobile_number,
        present_address: studentForm.present_address,
        permanent_address: studentForm.permanent_address,
        birth_date: studentForm.birth_date,
        password: defaultPassword,
        role: "student",
      });

      const userId = userResponse.data.user?.id || userResponse.data.id;

      await api.post("/students", {
        user_id: userId,
        roll_number: studentForm.roll_number,
        official_mail: studentForm.official_mail,
        current_term: studentForm.current_term ? Number(studentForm.current_term) : null,
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
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to create student",
      });
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
        {activeTab === "teacher" && (
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

        {activeTab === "student" && (
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

        {activeTab === "advisor" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Assign Advisors By Roll Range</h2>
            <p className="text-sm text-gray-600">
              This updates advisor history in bulk. Existing active advisors are closed and new advisor rows are opened.
            </p>

            <form onSubmit={handleAdvisorAssign} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    required
                    value={advisorForm.department_id}
                    onChange={(event) =>
                      setAdvisorForm((prev) => ({
                        ...prev,
                        department_id: event.target.value,
                        term_id: "",
                        teacher_id: "",
                      }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={advisorAssigning}
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
                    value={advisorForm.term_id}
                    onChange={(event) =>
                      setAdvisorForm((prev) => ({ ...prev, term_id: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={!advisorForm.department_id || advisorAssigning}
                  >
                    <option value="">Select Term</option>
                    {advisorTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        Term {term.term_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Advisor Teacher</label>
                  <select
                    required
                    value={advisorForm.teacher_id}
                    onChange={(event) =>
                      setAdvisorForm((prev) => ({ ...prev, teacher_id: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={!advisorForm.department_id || advisorAssigning}
                  >
                    <option value="">Select Teacher</option>
                    {advisorTeachers.map((teacher) => (
                      <option key={teacher.user_id} value={teacher.user_id}>
                        {getTeacherDisplayName(teacher)} ({teacher.appointment || "Teacher"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={advisorForm.start_date}
                    onChange={(event) =>
                      setAdvisorForm((prev) => ({ ...prev, start_date: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={advisorAssigning}
                  />
                  <p className="mt-1 text-xs text-gray-500">If empty, selected term start date will be used.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Roll Start</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={advisorForm.roll_start}
                    onChange={(event) =>
                      setAdvisorForm((prev) => ({ ...prev, roll_start: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={advisorAssigning}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Roll End</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={advisorForm.roll_end}
                    onChange={(event) =>
                      setAdvisorForm((prev) => ({ ...prev, roll_end: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={advisorAssigning}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                  <input
                    type="text"
                    value={advisorForm.change_reason}
                    onChange={(event) =>
                      setAdvisorForm((prev) => ({ ...prev, change_reason: event.target.value }))
                    }
                    placeholder="Example: Initial advisor allocation"
                    className="w-full p-2 border rounded"
                    disabled={advisorAssigning}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={advisorAssigning}
                className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 disabled:bg-slate-400"
              >
                {advisorAssigning ? "Assigning..." : "Assign Advisors"}
              </button>
            </form>

            {advisorSummary && (
              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <h3 className="font-semibold text-slate-900 mb-2">Last Assignment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p>Matched students: <span className="font-semibold">{advisorSummary.matched_students ?? 0}</span></p>
                  <p>Assigned: <span className="font-semibold">{advisorSummary.assigned_count ?? 0}</span></p>
                  <p>Skipped (same advisor): <span className="font-semibold">{advisorSummary.skipped_same_advisor_count ?? 0}</span></p>
                  <p>Invalid roll format: <span className="font-semibold">{advisorSummary.invalid_roll_format_count ?? 0}</span></p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "section-assign" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Assign Sections By Roll Range</h2>
            <p className="text-sm text-gray-600">
              This maintains one section mapping per student. No section history is kept.
            </p>

            <form onSubmit={handleSectionAssign} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    required
                    value={sectionForm.department_id}
                    onChange={(event) =>
                      setSectionForm((prev) => ({
                        ...prev,
                        department_id: event.target.value,
                        term_id: "",
                        section_name: "",
                      }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={sectionAssigning}
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
                    onChange={(event) =>
                      setSectionForm((prev) => ({
                        ...prev,
                        term_id: event.target.value,
                        section_name: "",
                      }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={!sectionForm.department_id || sectionAssigning}
                  >
                    <option value="">Select Term</option>
                    {sectionTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        Term {term.term_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <select
                    required
                    value={sectionForm.section_name}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, section_name: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={!sectionForm.term_id || sectionAssigning}
                  >
                    <option value="">Select Section</option>
                    {sectionOptions.map((section) => (
                      <option key={`${section.term_id}-${section.name}`} value={section.name}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Roll Start</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={sectionForm.roll_start}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, roll_start: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={sectionAssigning}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Roll End</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={sectionForm.roll_end}
                    onChange={(event) =>
                      setSectionForm((prev) => ({ ...prev, roll_end: event.target.value }))
                    }
                    className="w-full p-2 border rounded"
                    disabled={sectionAssigning}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sectionAssigning}
                className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 disabled:bg-slate-400"
              >
                {sectionAssigning ? "Assigning..." : "Assign Sections"}
              </button>
            </form>

            {sectionSummary && (
              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <h3 className="font-semibold text-slate-900 mb-2">Last Assignment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p>Matched students: <span className="font-semibold">{sectionSummary.matched_students ?? 0}</span></p>
                  <p>Assigned: <span className="font-semibold">{sectionSummary.assigned_count ?? 0}</span></p>
                  <p>Unchanged: <span className="font-semibold">{sectionSummary.unchanged_count ?? 0}</span></p>
                  <p>Invalid roll format: <span className="font-semibold">{sectionSummary.invalid_roll_format_count ?? 0}</span></p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEntity;