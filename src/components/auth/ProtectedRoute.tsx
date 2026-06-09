import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, checkTokenExpiry } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated || checkTokenExpiry()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
