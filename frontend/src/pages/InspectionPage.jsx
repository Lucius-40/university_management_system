import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";

const TABS = [
  "departments",
  "terms",
  "courses",
  "sections",
  "students",
  "teachers",
  "initial-credential-check",
];

const INITIAL_FILTERS = {
  departments: { search: "" },
  terms: { search: "", department_id: "" },
  courses: { search: "", department_id: "", type: "" },
  sections: { search: "", department_id: "", term_id: "" },
  students: { search: "", department_code: "", batch: "", term_id: "", section: "" },
  teachers: { search: "", department_code: "", appointment: "" },
  initialCredentialCheck: { search: "", status: "" },
};

const InspectionPage = ({ initialTab = "departments" }) => {
  const navigate = useNavigate();
  const safeInitialTab = TABS.includes(initialTab) ? initialTab : "departments";
  const [activeTab, setActiveTab] = useState(safeInitialTab);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [initialCredentials, setInitialCredentials] = useState([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [
        departmentResponse,
        termResponse,
        courseResponse,
        sectionResponse,
        studentResponse,
        teacherResponse,
        credentialsResponse,
      ] =
        await Promise.all([
          api.get("/departments"),
          api.get("/terms"),
          api.get("/courses"),
          api.get("/sections"),
          api.get("/users/inspect", { params: { identity: "student" } }),
          api.get("/users/inspect", { params: { identity: "teacher" } }),
          api.get("/credentials"),
        ]);

      setDepartments(departmentResponse.data || []);
      setTerms(termResponse.data || []);
      setCourses(courseResponse.data || []);
      setSections(sectionResponse.data || []);
      setStudents(studentResponse.data || []);
      setTeachers(teacherResponse.data || []);
      setInitialCredentials(credentialsResponse.data || []);
    } catch (requestError) {
      console.error("Failed to load inspection data:", requestError);
      setError(requestError.response?.data?.message || "Failed to load inspection data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (TABS.includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const setTabFilter = (tab, key, value) => {
    setFilters((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [key]: value,
      },
    }));
  };

  const filteredDepartments = useMemo(() => {
    const q = filters.departments.search.toLowerCase();
    return departments.filter(
      (department) =>
        String(department.code || "").toLowerCase().includes(q) ||
        String(department.name || "").toLowerCase().includes(q)
    );
  }, [departments, filters.departments.search]);

  const filteredTerms = useMemo(() => {
    const q = filters.terms.search.toLowerCase();
    return terms.filter((term) => {
      const department = departments.find((dept) => Number(dept.id) === Number(term.department_id));
      const matchesDepartment =
        !filters.terms.department_id || Number(term.department_id) === Number(filters.terms.department_id);

      const matchesSearch =
        String(term.term_number || "").toLowerCase().includes(q) ||
        String(department?.code || "").toLowerCase().includes(q) ||
        String(department?.name || "").toLowerCase().includes(q);

      return matchesDepartment && matchesSearch;
    });
  }, [terms, departments, filters.terms.search, filters.terms.department_id]);

  const filteredCourses = useMemo(() => {
    const q = filters.courses.search.toLowerCase();
    return courses.filter((course) => {
      const department = departments.find((dept) => Number(dept.id) === Number(course.department_id));
      const matchesDepartment =
        !filters.courses.department_id || Number(course.department_id) === Number(filters.courses.department_id);

      const matchesType =
        !filters.courses.type || String(course.type || "").toLowerCase() === filters.courses.type.toLowerCase();

      const matchesSearch =
        String(course.course_code || "").toLowerCase().includes(q) ||
        String(course.name || "").toLowerCase().includes(q) ||
        String(department?.code || "").toLowerCase().includes(q) ||
        String(department?.name || "").toLowerCase().includes(q);

      return matchesDepartment && matchesType && matchesSearch;
    });
  }, [courses, departments, filters.courses]);

  const filteredSections = useMemo(() => {
    const q = filters.sections.search.toLowerCase();
    return sections.filter((section) => {
      const term = terms.find((row) => Number(row.id) === Number(section.term_id));
      const department = departments.find((row) => Number(row.id) === Number(term?.department_id));

      const matchesDepartment =
        !filters.sections.department_id || Number(term?.department_id) === Number(filters.sections.department_id);

      const matchesTerm = !filters.sections.term_id || Number(section.term_id) === Number(filters.sections.term_id);

      const matchesSearch =
        String(section.name || "").toLowerCase().includes(q) ||
        String(term?.term_number || "").toLowerCase().includes(q) ||
        String(department?.code || "").toLowerCase().includes(q) ||
        String(department?.name || "").toLowerCase().includes(q);

      return matchesDepartment && matchesTerm && matchesSearch;
    });
  }, [sections, terms, departments, filters.sections]);

  const filteredStudents = useMemo(() => {
    const q = filters.students.search.toLowerCase();
    return students.filter((student) => {
      const matchesDepartment =
        !filters.students.department_code ||
        String(student.department_code || "").toLowerCase() === filters.students.department_code.toLowerCase();

      const matchesBatch = !filters.students.batch || String(student.batch || "") === String(filters.students.batch);
      const matchesTerm = !filters.students.term_id || Number(student.term_id) === Number(filters.students.term_id);

      const sectionNames = String(student.section_names || "")
        .split(",")
        .map((value) => value.trim());
      const matchesSection = !filters.students.section || sectionNames.includes(filters.students.section);

      const matchesSearch =
        String(student.full_name || "").toLowerCase().includes(q) ||
        String(student.roll_number || "").toLowerCase().includes(q) ||
        String(student.personal_email || "").toLowerCase().includes(q) ||
        String(student.official_mail || "").toLowerCase().includes(q);

      return matchesDepartment && matchesBatch && matchesTerm && matchesSection && matchesSearch;
    });
  }, [students, filters.students]);

  const filteredTeachers = useMemo(() => {
    const q = filters.teachers.search.toLowerCase();
    return teachers.filter((teacher) => {
      const matchesDepartment =
        !filters.teachers.department_code ||
        String(teacher.department_code || "").toLowerCase() === filters.teachers.department_code.toLowerCase();

      const matchesAppointment =
        !filters.teachers.appointment ||
        String(teacher.appointment || "").toLowerCase() === filters.teachers.appointment.toLowerCase();

      const matchesSearch =
        String(teacher.full_name || "").toLowerCase().includes(q) ||
        String(teacher.personal_email || "").toLowerCase().includes(q) ||
        String(teacher.official_mail || "").toLowerCase().includes(q);

      return matchesDepartment && matchesAppointment && matchesSearch;
    });
  }, [teachers, filters.teachers]);

  const studentBatchOptions = useMemo(() => {
    return [...new Set(students.map((row) => String(row.batch || "")).filter(Boolean))].sort();
  }, [students]);

  const studentSectionOptions = useMemo(() => {
    const values = new Set();
    students.forEach((row) => {
      String(row.section_names || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => values.add(value));
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [students]);

  const teacherAppointments = useMemo(() => {
    return [...new Set(teachers.map((row) => String(row.appointment || "")).filter(Boolean))].sort();
  }, [teachers]);

  const filteredInitialCredentialChecks = useMemo(() => {
    const q = String(filters.initialCredentialCheck.search || "").toLowerCase();
    const status = String(filters.initialCredentialCheck.status || "").toLowerCase();

    return initialCredentials.filter((row) => {
      const hasChanged = Boolean(row.has_changed);
      const matchesStatus =
        !status ||
        (status === "updated" && hasChanged) ||
        (status === "not_updated" && !hasChanged);

      const matchesSearch =
        String(row.user_name || "").toLowerCase().includes(q) ||
        String(row.email || "").toLowerCase().includes(q) ||
        String(row.role || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [initialCredentials, filters.initialCredentialCheck]);

//   const renderTabs = () => (
//     <div className="flex flex-wrap gap-2 mb-4">
//       {TABS.map((tab) => (
//         <button
//           key={tab}
//           type="button"
//           onClick={() => {
//             setActiveTab(tab);
//             navigate(`/admin/dashboard/inspection/${tab}`);
//           }}
//           className={`px-3 py-2 rounded text-sm font-medium border ${
//             activeTab === tab
//               ? "bg-slate-800 text-white border-slate-800"
//               : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
//           }`}
//         >
//           {tab.charAt(0).toUpperCase() + tab.slice(1)}
//         </button>
//       ))}
//     </div>
//   );

  const renderDepartments = () => (
    <>
      <SearchBar
        value={filters.departments.search}
        onChange={(event) => setTabFilter("departments", "search", event.target.value)}
        placeholder="Search departments"
        className="mb-4 max-w-xl"
      />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.map((row) => (
              <tr
                key={row.id}
                className="border-t cursor-pointer hover:bg-slate-50"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/dashboard/departments/${encodeURIComponent(row.code || row.id)}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/admin/dashboard/departments/${encodeURIComponent(row.code || row.id)}`);
                  }
                }}
              >
                <td className="p-3">{row.code}</td>
                <td className="p-3">{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderTerms = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <SearchBar
          value={filters.terms.search}
          onChange={(event) => setTabFilter("terms", "search", event.target.value)}
          placeholder="Search terms"
        />
        <select
          value={filters.terms.department_id}
          onChange={(event) => setTabFilter("terms", "department_id", event.target.value)}
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
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Term</th>
              <th className="p-3 text-left">Start Date</th>
              <th className="p-3 text-left">End Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTerms.map((row) => {
              const department = departments.find((departmentRow) => Number(departmentRow.id) === Number(row.department_id));
              return (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{department ? department.code : row.department_id}</td>
                  <td className="p-3">{row.term_number}</td>
                  <td className="p-3">{row.start_date ? String(row.start_date).slice(0, 10) : "-"}</td>
                  <td className="p-3">{row.end_date ? String(row.end_date).slice(0, 10) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderCourses = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <SearchBar
          value={filters.courses.search}
          onChange={(event) => setTabFilter("courses", "search", event.target.value)}
          placeholder="Search courses"
        />
        <select
          value={filters.courses.department_id}
          onChange={(event) => setTabFilter("courses", "department_id", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.code}
            </option>
          ))}
        </select>
        <select
          value={filters.courses.type}
          onChange={(event) => setTabFilter("courses", "type", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Types</option>
          <option value="Theory">Theory</option>
          <option value="Lab">Lab</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Credits</th>
              <th className="p-3 text-left">Prerequisites</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((row) => {
              const department = departments.find((departmentRow) => Number(departmentRow.id) === Number(row.department_id));
              const prereqCodes = (row.prereq_ids || [])
                .map((id) => courses.find((course) => Number(course.id) === Number(id))?.course_code)
                .filter(Boolean);

              return (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{row.course_code}</td>
                  <td className="p-3">{row.name}</td>
                  <td className="p-3">{department ? department.code : row.department_id}</td>
                  <td className="p-3">{row.type}</td>
                  <td className="p-3">{row.credit_hours}</td>
                  <td className="p-3">{prereqCodes.length > 0 ? prereqCodes.join(", ") : "elementary"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderSections = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <SearchBar
          value={filters.sections.search}
          onChange={(event) => setTabFilter("sections", "search", event.target.value)}
          placeholder="Search sections"
        />
        <select
          value={filters.sections.department_id}
          onChange={(event) => {
            setTabFilter("sections", "department_id", event.target.value);
            setTabFilter("sections", "term_id", "");
          }}
          className="w-full p-2 border rounded"
        >
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.code}
            </option>
          ))}
        </select>
        <select
          value={filters.sections.term_id}
          onChange={(event) => setTabFilter("sections", "term_id", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Terms</option>
          {terms
            .filter((term) =>
              filters.sections.department_id
                ? Number(term.department_id) === Number(filters.sections.department_id)
                : true
            )
            .map((term) => (
              <option key={term.id} value={term.id}>
                Term {term.term_number}
              </option>
            ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Term</th>
              <th className="p-3 text-left">Section Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.map((row) => {
              const term = terms.find((termRow) => Number(termRow.id) === Number(row.term_id));
              const department = departments.find((departmentRow) => Number(departmentRow.id) === Number(term?.department_id));
              return (
                <tr key={`${row.term_id}-${row.name}`} className="border-t">
                  <td className="p-3">{department ? department.code : "-"}</td>
                  <td className="p-3">{term ? term.term_number : row.term_id}</td>
                  <td className="p-3">{row.name}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderStudents = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <SearchBar
          value={filters.students.search}
          onChange={(event) => setTabFilter("students", "search", event.target.value)}
          placeholder="Search students"
        />
        <select
          value={filters.students.department_code}
          onChange={(event) => setTabFilter("students", "department_code", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.code}>
              {department.code}
            </option>
          ))}
        </select>
        <select
          value={filters.students.batch}
          onChange={(event) => setTabFilter("students", "batch", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Batches</option>
          {studentBatchOptions.map((batch) => (
            <option key={batch} value={batch}>
              {batch}
            </option>
          ))}
        </select>
        <select
          value={filters.students.term_id}
          onChange={(event) => setTabFilter("students", "term_id", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Terms</option>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              Term {term.term_number}
            </option>
          ))}
        </select>
        <select
          value={filters.students.section}
          onChange={(event) => setTabFilter("students", "section", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Sections</option>
          {studentSectionOptions.map((section) => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Roll</th>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Batch</th>
              <th className="p-3 text-left">Term</th>
              <th className="p-3 text-left">Section</th>
              <th className="p-3 text-left">Email</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((row) => (
              <tr key={`student-${row.user_id}`} className="border-t">
                <td className="p-3">{row.full_name}</td>
                <td className="p-3">{row.roll_number}</td>
                <td className="p-3">{row.department_code || "-"}</td>
                <td className="p-3">{row.batch || "-"}</td>
                <td className="p-3">{row.term_number ? `Term ${row.term_number}` : "-"}</td>
                <td className="p-3">{row.section_names || "-"}</td>
                <td className="p-3">{row.official_mail || row.personal_email || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderTeachers = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <SearchBar
          value={filters.teachers.search}
          onChange={(event) => setTabFilter("teachers", "search", event.target.value)}
          placeholder="Search teachers"
        />
        <select
          value={filters.teachers.department_code}
          onChange={(event) => setTabFilter("teachers", "department_code", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.code}>
              {department.code}
            </option>
          ))}
        </select>
        <select
          value={filters.teachers.appointment}
          onChange={(event) => setTabFilter("teachers", "appointment", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Appointments</option>
          {teacherAppointments.map((appointment) => (
            <option key={appointment} value={appointment}>
              {appointment}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Appointment</th>
              <th className="p-3 text-left">Official Email</th>
              <th className="p-3 text-left">Personal Email</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((row) => (
              <tr key={`teacher-${row.user_id}`} className="border-t">
                <td className="p-3">{row.full_name}</td>
                <td className="p-3">{row.department_code || "-"}</td>
                <td className="p-3">{row.appointment || "-"}</td>
                <td className="p-3">{row.official_mail || "-"}</td>
                <td className="p-3">{row.personal_email || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderInitialCredentialCheck = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <SearchBar
          value={filters.initialCredentialCheck.search}
          onChange={(event) => setTabFilter("initialCredentialCheck", "search", event.target.value)}
          placeholder="Search by username, email, or role"
        />
        <select
          value={filters.initialCredentialCheck.status}
          onChange={(event) => setTabFilter("initialCredentialCheck", "status", event.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Status</option>
          <option value="updated">Updated Credentials</option>
          <option value="not_updated">Not Updated Yet</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Credential Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInitialCredentialChecks.map((row) => (
              <tr key={`credential-${row.id}`} className="border-t">
                <td className="p-3">{row.user_name || "-"}</td>
                <td className="p-3">{row.email || "-"}</td>
                <td className="p-3 capitalize">{row.role || "-"}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      row.has_changed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {row.has_changed ? "Updated" : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderCurrentTab = () => {
    if (isLoading) return <Loader />;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    if (activeTab === "departments") return renderDepartments();
    if (activeTab === "terms") return renderTerms();
    if (activeTab === "courses") return renderCourses();
    if (activeTab === "sections") return renderSections();
    if (activeTab === "students") return renderStudents();
    if (activeTab === "teachers") return renderTeachers();
    return renderInitialCredentialCheck();
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Inspection</h1>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* <div className="bg-white border rounded-lg p-5 mb-6">{renderTabs()}</div> */}

      <div className="bg-white border rounded-lg p-6">{renderCurrentTab()}</div>
    </div>
  );
};

export default InspectionPage;
