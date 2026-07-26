import type { ReactNode } from 'react';
import { useAuth } from '../context/useAuth.js';
import { Navigate } from 'react-router';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { accessToken, isLoading } = useAuth();

  // TODO(you): while isLoading is true, the bootstrap check hasn't
  // resolved yet -- we genuinely don't know if this user is logged in or
  // not. Don't redirect yet in that case (that's the bug this lesson
  // fixes -- redirecting here would flash to /login on every reload even
  // for a valid session). Render something harmless instead, like
  // `return null;`, and let the component re-render once isLoading flips
  // to false.
  //
  // Only once isLoading is false does the existing check below mean
  // anything -- at that point, accessToken being null really does mean
  // "checked, and there's no valid session."

  // if accessToken is not found, navigate user to login page
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
