import LoginPage from './pages/LoginPage';
import StudentPage from './pages/StudentPage';
import TeacherPage from './pages/TeacherPage';
import { ToastContainer } from './components/Toast';
import { useSession } from './hooks/useSession';
import './index.css';

export default function App() {
  const { user, login, logout } = useSession();

  return (
    <>
      <ToastContainer />
      {!user && <LoginPage onLogin={login} />}
      {(user?.role === 'admin' || user?.role === 'profesor') && (
        <TeacherPage
          user={user}
          isAdmin={user.role === 'admin'}
          onLogout={logout}
          onUpdateUser={login}
        />
      )}
      {user?.role === 'alumno' && (
        <StudentPage user={user} onLogout={logout} onUpdateUser={login} />
      )}
    </>
  );
}
