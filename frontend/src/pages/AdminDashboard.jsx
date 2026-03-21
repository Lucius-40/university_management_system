import { useMemo, useState } from "react";
import { useNavigate, NavLink, Routes, Route, useLocation, Link } from "react-router-dom";
import {
  LogOut,
  Building,
  Users,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Clock,
  UserPlus,
  Search,
  Wallet,
} from "lucide-react";
import CreateInfrastructure from "./CreateInfrastructure";
import CreateEntity from "./CreateEntity";
import DepartmentDetails from "./DepartmentDetails";
import ProfilePage from "./ProfilePage";
import SystemStateDashboard from "./SystemStateDashboard";
import DuesManagement from "./DuesManagement";
import TermDetails from "./TermDetails";
import InfrastructureInsights from "./InfrastructureInsights";
import { useAuth } from "../context/AuthContext";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const shouldOpenInfrastructure = useMemo(
    () =>
      location.pathname.includes("/admin/dashboard/departments") ||
      location.pathname.includes("/admin/dashboard/terms") ||
      location.pathname.includes("/admin/dashboard/sections") ||
      location.pathname.includes("/admin/dashboard/courses") ||
      location.pathname.includes("/admin/dashboard/offerings") ||
      location.pathname.includes("/admin/dashboard/teaches") ||
      location.pathname.includes("/admin/dashboard/routines") ||
      location.pathname.includes("/admin/dashboard/insights") ||
      location.pathname === "/admin/dashboard",
    [location.pathname]
  );

  const shouldOpenEntities = useMemo(
    () =>
      location.pathname.includes("/admin/dashboard/entities") ||
      location.pathname.includes("/admin/dashboard/profiles"),
    [location.pathname]
  );

  const isDuesRoute = useMemo(
    () => location.pathname.includes("/admin/dashboard/dues"),
    [location.pathname]
  );

  const [manualInfrastructureOpen, setManualInfrastructureOpen] = useState(null);
  const [manualEntitiesOpen, setManualEntitiesOpen] = useState(null);
  const [manualDuesOpen, setManualDuesOpen] = useState(null);
  
  const isInfrastructureOpen =
    manualInfrastructureOpen === null ? shouldOpenInfrastructure : manualInfrastructureOpen;
  const isEntitiesOpen = manualEntitiesOpen === null ? shouldOpenEntities : manualEntitiesOpen;
  const isDuesOpen = manualDuesOpen === null ? isDuesRoute : manualDuesOpen;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-72 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <Link
            to="/admin/dashboard/dashboard"
            className="text-xl font-bold flex items-center gap-2 text-white hover:text-slate-200 transition"
          >
            <LayoutDashboard size={20} />
            System Portal
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div>
            <button
              type="button"
              onClick={() => setManualInfrastructureOpen((prev) => !(prev ?? shouldOpenInfrastructure))}
              className="flex items-center justify-between w-full p-3 rounded transition text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <Building size={18} />
                Infrastructure
              </span>
              {isInfrastructureOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isInfrastructureOpen && (
              <div className="ml-8 mt-2 space-y-2">
                <NavLink
                  to="/admin/dashboard/departments"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Building size={15} />
                  Departments
                </NavLink>
                <NavLink
                  to="/admin/dashboard/terms"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Clock size={15} />
                  Terms
                </NavLink>
                <NavLink
                  to="/admin/dashboard/courses"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <BookOpen size={15} />
                  Courses
                </NavLink>
                <NavLink
                  to="/admin/dashboard/sections"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Users size={15} />
                  Sections
                </NavLink>
                <NavLink
                  to="/admin/dashboard/offerings"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <BookOpen size={15} />
                  Course Offerings
                </NavLink>
                <NavLink
                  to="/admin/dashboard/teaches"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Users size={15} />
                  Assign Teachings
                </NavLink>
                <NavLink
                  to="/admin/dashboard/insights"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Search size={15} />
                  Insights
                </NavLink>
                <NavLink
                  to="/admin/dashboard/routines"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <BookOpen size={15} />
                  Routines
                </NavLink>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setManualEntitiesOpen((prev) => !(prev ?? shouldOpenEntities))}
              className="flex items-center justify-between w-full p-3 rounded transition text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <Users size={18} />
                Entities
              </span>
              {isEntitiesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isEntitiesOpen && (
              <div className="ml-8 mt-2 space-y-2">
                <NavLink
                  to="/admin/dashboard/entities/students"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <UserPlus size={15} />
                  Students
                </NavLink>
                <NavLink
                  to="/admin/dashboard/entities/teachers"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <UserPlus size={15} />
                  Teachers
                </NavLink>
                <NavLink
                  to="/admin/dashboard/entities/advisors"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Users size={15} />
                  Assign Advisors
                </NavLink>
                <NavLink
                  to="/admin/dashboard/entities/assign-sections"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Users size={15} />
                  Assign Sections
                </NavLink>
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => setManualDuesOpen((prev) => !(prev ?? isDuesRoute))}
              className="flex items-center justify-between w-full p-3 rounded transition text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <Wallet size={18} />
                Dues & Payments
              </span>
              {isDuesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isDuesOpen && (
              <div className="ml-8 mt-2 space-y-2">
                <NavLink
                  to="/admin/dashboard/dues/dues"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Wallet size={15} />
                  Dues
                </NavLink>
                <NavLink
                  to="/admin/dashboard/dues/rules"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <BookOpen size={15} />
                  Rules
                </NavLink>
                <NavLink
                  to="/admin/dashboard/dues/scopes"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Users size={15} />
                  Scopes
                </NavLink>
                <NavLink
                  to="/admin/dashboard/dues/overrides"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Search size={15} />
                  Overrides
                </NavLink>
                <NavLink
                  to="/admin/dashboard/dues/assign-payment"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <UserPlus size={15} />
                  Assign Payment
                </NavLink>
              </div>
            )}
          </div>

          
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full p-2 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Routes>
          <Route path="/dashboard" element={<SystemStateDashboard />} />
          <Route path="/departments" element={<CreateInfrastructure initialTab="department" />} />
          <Route path="/departments/:identifier" element={<DepartmentDetails />} />
          <Route path="/terms" element={<CreateInfrastructure initialTab="term" />} />
          <Route path="/terms/:id" element={<TermDetails />} />
          <Route path="/sections" element={<CreateInfrastructure initialTab="section" />} />
          <Route path="/courses" element={<CreateInfrastructure initialTab="course" />} />
          <Route path="/offerings" element={<CreateInfrastructure initialTab="offering" />} />
          <Route path="/teaches" element={<CreateInfrastructure initialTab="teaches" />} />
          <Route path="/routines" element={<CreateInfrastructure initialTab="routine" />} />
          <Route path="/insights" element={<InfrastructureInsights />} />
          <Route path="/dues/dues" element={<DuesManagement initialTab="dues" />} />
          <Route path="/dues/rules" element={<DuesManagement initialTab="rules" />} />
          <Route path="/dues/scopes" element={<DuesManagement initialTab="scopes" />} />
          <Route path="/dues/overrides" element={<DuesManagement initialTab="overrides" />} />
          <Route path="/dues/assign-payment" element={<DuesManagement initialTab="assign-payment" />} />
          <Route path="/dues" element={<DuesManagement initialTab="dues" />} />
          <Route path="/entities/students" element={<CreateEntity initialTab="student" />} />
          <Route path="/entities/teachers" element={<CreateEntity initialTab="teacher" />} />
          <Route path="/entities/advisors" element={<CreateEntity initialTab="advisor" />} />
          <Route path="/entities/assign-sections" element={<CreateEntity initialTab="section-assign" />} />
          <Route path="/entities/batch-students" element={<CreateEntity initialTab="batch-student" />} />
          <Route path="/entities/batch-teachers" element={<CreateEntity initialTab="batch-teacher" />} />
          <Route path="/entities" element={<CreateEntity initialTab="student" />} />
          <Route path="/profiles/:role/:id" element={<ProfilePage />} />
          <Route path="*" element={<CreateInfrastructure initialTab="department" />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
