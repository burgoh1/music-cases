import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthPage } from './pages/AuthPage.js';
import { Home } from './pages/Home.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}
