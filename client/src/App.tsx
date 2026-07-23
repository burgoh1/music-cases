import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthPage } from './pages/AuthPage.js';
import { Home } from './pages/Home.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}
