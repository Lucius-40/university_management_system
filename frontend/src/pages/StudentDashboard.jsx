import { useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleUser,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  UserCog,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UpdateProfileSection from './studentDashboard/UpdateProfileSection';
import UpdatePersonalInfoSection from './studentDashboard/UpdatePersonalInfoSection';
import MyAdvisorSection from './studentDashboard/MyAdvisorSection';
import RegistrationSection from './studentDashboard/RegistrationSection';
import InitialExamRoutineSection from './studentDashboard/InitialExamRoutineSection';
import ViewGradesSection from './studentDashboard/ViewGradesSection';
import DuesStatusSection from './studentDashboard/DuesStatusSection';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const shouldOpenProfile = useMemo(
    () =>
      location.pathname.includes('/student/dashboard/profile') ||
      location.pathname === '/student/dashboard',
    [location.pathname]
  );

  const shouldOpenAcademic = useMemo(
    () => location.pathname.includes('/student/dashboard/academic'),
    [location.pathname]
  );

  const shouldOpenDues = useMemo(
    () => location.pathname.includes('/student/dashboard/dues'),
    [location.pathname]
  );

  const [manualProfileOpen, setManualProfileOpen] = useState(null);
  const [manualAcademicOpen, setManualAcademicOpen] = useState(null);
  const [manualDuesOpen, setManualDuesOpen] = useState(null);

  const isProfileOpen = manualProfileOpen === null ? shouldOpenProfile : manualProfileOpen;
  const isAcademicOpen = manualAcademicOpen === null ? shouldOpenAcademic : manualAcademicOpen;
  const isDuesOpen = manualDuesOpen === null ? shouldOpenDues : manualDuesOpen;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-72 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <Link
            to="/student/dashboard/profile/update-profile"
            className="text-xl font-bold flex items-center gap-2 text-white hover:text-slate-200 transition"
          >
            <LayoutDashboard size={20} />
            Student Portal
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div>
            <button
              type="button"
              onClick={() => setManualProfileOpen((prev) => !(prev ?? shouldOpenProfile))}
              className="flex items-center justify-between w-full p-3 rounded transition text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <CircleUser size={18} />
                Profile
              </span>
              {isProfileOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isProfileOpen && (
              <div className="ml-8 mt-2 space-y-2">
                <NavLink
                  to="/student/dashboard/profile/update-profile"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <UserCog size={15} />
                  Update Profile
                </NavLink>
                <NavLink
                  to="/student/dashboard/profile/update-personal-info"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <UserRound size={15} />
                  Update Personal Information
                </NavLink>
                <NavLink
                  to="/student/dashboard/profile/my-advisor"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <CircleUser size={15} />
                  My Advisor
                </NavLink>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setManualAcademicOpen((prev) => !(prev ?? shouldOpenAcademic))}
              className="flex items-center justify-between w-full p-3 rounded transition text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <BookOpen size={18} />
                Academic
              </span>
              {isAcademicOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isAcademicOpen && (
              <div className="ml-8 mt-2 space-y-2">
                <NavLink
                  to="/student/dashboard/academic/registration"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <BookOpen size={15} />
                  Registration
                </NavLink>
                <NavLink
                  to="/student/dashboard/academic/initial-exam-routine"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <BookOpen size={15} />
                  Initial Exam Routine
                </NavLink>
                <NavLink
                  to="/student/dashboard/academic/view-grades"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <BookOpen size={15} />
                  View Grades
                </NavLink>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setManualDuesOpen((prev) => !(prev ?? shouldOpenDues))}
              className="flex items-center justify-between w-full p-3 rounded transition text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <ReceiptText size={18} />
                Dues Status
              </span>
              {isDuesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {isDuesOpen && (
              <div className="ml-8 mt-2 space-y-2">
                <NavLink
                  to="/student/dashboard/dues/status"
                  className={({ isActive }) =>
                    `flex items-center gap-2 w-full p-2 rounded text-sm transition ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <ReceiptText size={15} />
                  Dues Status
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
          <Route
            path="/"
            element={<Navigate to="/student/dashboard/profile/update-profile" replace />}
          />
          <Route
            path="/profile"
            element={<Navigate to="/student/dashboard/profile/update-profile" replace />}
          />
          <Route path="/profile/update-profile" element={<UpdateProfileSection />} />
          <Route
            path="/profile/update-personal-info"
            element={<UpdatePersonalInfoSection />}
          />
          <Route path="/profile/my-advisor" element={<MyAdvisorSection />} />
          <Route path="/academic/registration" element={<RegistrationSection />} />
          <Route
            path="/academic/initial-exam-routine"
            element={<InitialExamRoutineSection />}
          />
          <Route path="/academic/view-grades" element={<ViewGradesSection />} />
          <Route path="/dues/status" element={<DuesStatusSection />} />
          <Route path="*" element={<Navigate to="/student/dashboard/profile/update-profile" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;