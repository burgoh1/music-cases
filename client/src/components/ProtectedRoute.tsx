import type { ReactNode } from 'react';
import { useAuth } from '../context/useAuth.js';
import { Navigate } from 'react-router';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { accessToken } = useAuth();

  // if accessToken is not found, navigate user to login page
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
