import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogOut,
  FileSpreadsheet,
  PenSquare,
  UserCog,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TeacherResourceOverviewSection from './teacherDashboard/TeacherResourceOverviewSection';
import PendingRegistrationsSection from './teacherDashboard/PendingRegistrationsSection';
import MarkEntrySection from './teacherDashboard/MarkEntrySection';
import MarkUploadSection from './teacherDashboard/MarkUploadSection';
import UpdateProfileSection from './studentDashboard/UpdateProfileSection';
import UpdatePersonalInfoSection from './studentDashboard/UpdatePersonalInfoSection';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-72 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <Link
            to="/teacher/dashboard/overview"
            className="text-xl font-bold flex items-center gap-2 text-white hover:text-slate-200 transition"
          >
            <LayoutDashboard size={20} />
            Teacher Portal
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLink
            to="/teacher/dashboard/overview"
            className={({ isActive }) =>
              `flex items-center gap-3 w-full p-3 rounded transition ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Home size={18} />
            Overview
          </NavLink>

          <NavLink
            to="/teacher/dashboard/pending-registrations"
            className={({ isActive }) =>
              `flex items-center gap-3 w-full p-3 rounded transition ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <ClipboardCheck size={18} />
            Pending Registrations
          </NavLink>

          <NavLink
            to="/teacher/dashboard/profile/update-profile"
            className={({ isActive }) =>
              `flex items-center gap-3 w-full p-3 rounded transition ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <UserCog size={18} />
            Update Profile
          </NavLink>

          <NavLink
            to="/teacher/dashboard/profile/personal"
            className={({ isActive }) =>
              `flex items-center gap-3 w-full p-3 rounded transition ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <UserRound size={18} />
            Reset Password
          </NavLink>

          <NavLink
            to="/teacher/dashboard/mark-entry"
            className={({ isActive }) =>
              `flex items-center gap-3 w-full p-3 rounded transition ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <PenSquare size={18} />
            Mark Entry
          </NavLink>

          <NavLink
            to="/teacher/dashboard/mark-upload"
            className={({ isActive }) =>
              `flex items-center gap-3 w-full p-3 rounded transition ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <FileSpreadsheet size={18} />
            Mark Upload (CSV)
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            type="button"
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
            element={<Navigate to="/teacher/dashboard/overview" replace />}
          />
          <Route path="/overview" element={<TeacherResourceOverviewSection />} />
          <Route path="/pending-registrations" element={<PendingRegistrationsSection />} />
          <Route path="/profile/update-profile" element={<UpdateProfileSection />} />
          <Route path="/profile/personal" element={<UpdatePersonalInfoSection />} />
          <Route path="/mark-entry" element={<MarkEntrySection />} />
          <Route path="/mark-upload" element={<MarkUploadSection />} />
          <Route
            path="*"
            element={<Navigate to="/teacher/dashboard/overview" replace />}
          />
        </Routes>
      </main>
    </div>
  );
};

export default TeacherDashboard;
