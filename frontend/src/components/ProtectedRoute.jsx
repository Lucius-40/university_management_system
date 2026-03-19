import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      return <Navigate to="/login" replace />;
    }

    let user;
    try {
      user = JSON.parse(userStr);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;