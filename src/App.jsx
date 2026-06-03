import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import TeacherPage from './pages/TeacherPage';
import { ToastContainer } from './components/Toast';
import { normalizeSessionUser } from './constants/roles';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);

  // Persist session across page refreshes
  useEffect(() => {
    const saved = localStorage.getItem('sai_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const u = normalizeSessionUser(parsed);
        if (u) setUser(u);
        else localStorage.removeItem('sai_user');
      }
      catch { localStorage.removeItem('sai_user'); }
    }
  }, []);

  const handleLogin = (u) => {
    const session = normalizeSessionUser(u);
    if (!session) return;
    localStorage.setItem('sai_user', JSON.stringify(session));
    setUser(session);
  };
  const handleLogout = () => {
    localStorage.removeItem('sai_user');
    setUser(null);
  };

  return (
    <>
      <ToastContainer />
      {!user && <LoginPage onLogin={handleLogin} />}
      {(user?.role === 'admin' || user?.role === 'profesor') && <TeacherPage user={user} isAdmin={user?.role === 'admin'} onLogout={handleLogout} onUpdateUser={handleLogin} />}
      {user?.role === 'alumno' && <StudentPage user={user} onLogout={handleLogout} onUpdateUser={handleLogin} />}
    </>
  );
}
