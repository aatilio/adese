import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import TeacherPage from './pages/TeacherPage';
import { ToastContainer } from './components/Toast';
import { normalizeSessionUser } from './constants/roles';
import './index.css';

// ── Sesión en localStorage ─────────────────────────────────────
// SESSION_VERSION: incrementar este número invalida TODAS las sesiones
// activas en todos los navegadores (útil si cambian IDs o estructura).
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
  localStorage.removeItem('sai_user'); // clave sin versión (legado)
}

// ── App ────────────────────────────────────────────────────────
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

  return (
    <>
      <ToastContainer />
      {!user && <LoginPage onLogin={handleLogin} />}
      {(user?.role === 'admin' || user?.role === 'profesor') && (
        <TeacherPage
          user={user}
          isAdmin={user.role === 'admin'}
          onLogout={handleLogout}
          onUpdateUser={handleLogin}
        />
      )}
      {user?.role === 'alumno' && (
        <StudentPage user={user} onLogout={handleLogout} onUpdateUser={handleLogin} />
      )}
    </>
  );
}
