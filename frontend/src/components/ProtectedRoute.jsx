import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();
    const normalizedUserRole = String(user?.role || '').toLowerCase();
    const normalizedAllowedRoles = Array.isArray(allowedRoles)
      ? allowedRoles.map((role) => String(role).toLowerCase())
      : null;

    if (!isAuthenticated || !user) {
      return <Navigate to="/login" replace />;
    }

    if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(normalizedUserRole)) {
      return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;