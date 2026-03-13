import { useEffect, useState } from "react";
import api from "../services/api";

const CreateEntity = ({ initialTab = "student" }) => {
  const activeTab = initialTab;
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

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

  const studentTerms = terms.filter(
    (term) => String(term.department_id) === String(studentForm.department_id)
  );

  useEffect(() => {
    Promise.all([api.get("/departments"), api.get("/terms")])
      .then(([departmentResponse, termResponse]) => {
        setDepartments(departmentResponse.data || []);
        setTerms(termResponse.data || []);
      })
      .catch(() => {
        console.error("Failed to fetch departments/terms");
      });
  }, []);

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
                  <option value="Department Head">Department Head</option>
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
                <label className="block text-sm font-medium mb-1">Current Term (Optional)</label>
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
      </div>
    </div>
  );
};

export default CreateEntity;