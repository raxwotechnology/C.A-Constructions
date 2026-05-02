import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    if (roles && roles.includes('customer') && roles.length === 1) {
      return <Navigate to="/customer/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.userType)) {
    // Redirect based on role
    if (user.userType === 'customer') return <Navigate to="/customer/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
