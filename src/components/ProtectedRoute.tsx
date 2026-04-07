import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'operador' | 'solo_lectura')[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/" replace />; // Or a "Not Authorized" page
  }

  return <Outlet />;
};
