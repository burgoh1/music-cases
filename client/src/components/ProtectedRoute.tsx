import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // TODO(you): read `accessToken` from useAuth(). If it's missing (no
  // token), this route shouldn't render `children` at all -- instead,
  // return a redirect to "/login".
  //
  // react-router has a component built exactly for this: `Navigate`.
  // Import it from 'react-router', then `return <Navigate to="/login" replace />;`
  // -- `replace` matters here: it swaps the current history entry instead
  // of pushing a new one, so hitting the browser's back button from
  // /login doesn't just bounce the user right back to the page that
  // redirected them here in the first place.
  //
  // If there IS a token, just render `children` as-is.

  // Placeholder so the route tree renders (unprotected) until you add the
  // real check above -- replace this once you've implemented it.
  return children;
}
