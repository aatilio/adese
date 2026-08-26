import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentPage from './pages/StudentPage';
import TeacherPage from './pages/TeacherPage';
import { ToastContainer } from './components/Toast';
import { normalizeSessionUser } from './constants/roles';
import './index.css';

// ── Sesión en localStorage ─────────────────────────────────────
const SESSION_VERSION = 2;
const STORAGE_KEY = `sai_user_v${SESSION_VERSION}`;

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeSessionUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function purgeOldSessions() {
  for (let v = 1; v < SESSION_VERSION; v++) {
    localStorage.removeItem(`sai_user_v${v}`);
  }
  localStorage.removeItem('sai_user');
}

export default function App() {
  const [user, setUser] = useState(() => {
    purgeOldSessions();
    return readSession();
  });

  const handleLogin = (rawUser) => {
    const session = normalizeSessionUser(rawUser);
    if (!session) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const renderUserApp = () => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin' || user.role === 'profesor') {
      return (
        <TeacherPage
          user={user}
          isAdmin={user.role === 'admin'}
          onLogout={handleLogout}
          onUpdateUser={handleLogin}
        />
      );
    }
    return (
      <StudentPage
        user={user}
        onLogout={handleLogout}
        onUpdateUser={handleLogin}
      />
    );
  };

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/home" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/home" replace /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/home" replace /> : <RegisterPage onLogin={handleLogin} />}
        />
        <Route
          path="/registro"
          element={user ? <Navigate to="/home" replace /> : <RegisterPage onLogin={handleLogin} />}
        />
        <Route path="/home" element={renderUserApp()} />
        <Route path="/courses" element={renderUserApp()} />
        <Route path="/courses/:id" element={renderUserApp()} />
        <Route path="/profile" element={renderUserApp()} />
        <Route path="/usuarios" element={renderUserApp()} />
        <Route path="/econometrics" element={renderUserApp()} />
        <Route path="/exam" element={renderUserApp()} />
        <Route
          path="*"
          element={<Navigate to={user ? "/home" : "/"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
