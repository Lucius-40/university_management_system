import { useEffect, useMemo, useState } from "react";

const MAX_VISIBLE_RESULTS = 50;

const TeacherSearchDropdown = ({
  teachers,
  value,
  onChange,
  placeholder = "Select or search teacher",
  departmentCode = null,
  required = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  // Filter teachers by department if specified
  const filteredByDept = useMemo(() => {
    if (!departmentCode) return teachers;
    return teachers.filter((teacher) => teacher.department_code === departmentCode);
  }, [teachers, departmentCode]);

  // Filter by search term
  const filteredTeachers = useMemo(() => {
    if (!debouncedSearch.trim()) return filteredByDept.slice(0, MAX_VISIBLE_RESULTS);

    const lowerSearch = debouncedSearch.toLowerCase();
    return filteredByDept
      .filter(
      (teacher) =>
        (teacher.display_name?.toLowerCase() || "").includes(lowerSearch) ||
        (teacher.user_id?.toLowerCase() || "").includes(lowerSearch) ||
        (teacher.appointment?.toLowerCase() || "").includes(lowerSearch) ||
        (teacher.department_code?.toLowerCase() || "").includes(lowerSearch)
    )
      .slice(0, MAX_VISIBLE_RESULTS);
  }, [filteredByDept, debouncedSearch]);

  const selectedTeacher = teachers.find((t) => t.user_id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border rounded text-left bg-white hover:bg-gray-50 flex justify-between items-center"
      >
        <span className="text-sm">
          {selectedTeacher ? (
            <>
              {selectedTeacher.display_name} ({selectedTeacher.appointment || "Teacher"})
              <span className="text-gray-500 ml-1">[{selectedTeacher.department_code}]</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 border rounded bg-white shadow-lg">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              type="text"
              placeholder="Search by name, ID, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredTeachers.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {searchTerm ? "No teachers found matching your search" : "No teachers available"}
              </div>
            ) : (
              filteredTeachers.map((teacher) => (
                <button
                  key={teacher.user_id}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: teacher.user_id } });
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full text-left p-3 hover:bg-blue-50 border-b text-sm transition ${
                    value === teacher.user_id ? "bg-blue-100 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div className="font-medium">{teacher.display_name}</div>
                  <div className="text-xs text-gray-600">
                    {teacher.appointment || "Teacher"} • {teacher.department_code} • ID: {teacher.user_id}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <input
        type="hidden"
        value={value}
        required={required}
        onChange={() => {}} // Dummy to satisfy React
      />
    </div>
  );
};

export default TeacherSearchDropdown;
