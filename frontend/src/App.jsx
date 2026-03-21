import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

const NETWORK_LOADING_EVENT = 'app:network-loading';

const DashboardRedirect = () => {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').toLowerCase();

  if (normalizedRole === 'system') {
    return <Navigate to="/admin/dashboard/dashboard" replace />;
  }

  if (normalizedRole === 'student') {
    return <Navigate to="/student/dashboard/profile/update-profile" replace />;
  }

  if (normalizedRole === 'teacher') {
    return <Navigate to="/teacher/dashboard/pending-registrations" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);

  useEffect(() => {
    const handleNetworkLoading = (event) => {
      setIsNetworkLoading(Boolean(event?.detail?.isLoading));
    };

    window.addEventListener(NETWORK_LOADING_EVENT, handleNetworkLoading);
    return () => window.removeEventListener(NETWORK_LOADING_EVENT, handleNetworkLoading);
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/admin/dashboard/*" 
            element={
              <ProtectedRoute allowedRoles={['system']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/student/dashboard/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/dashboard/*"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['system', 'student', 'teacher']}>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>

      {isNetworkLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Loading...</span>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
