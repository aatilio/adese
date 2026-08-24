import { useNavigate } from "react-router-dom";
import appLogo from "../assets/adese.svg";
import UserMenu from "./UserMenu";
import "../styles/components/header.css";

export default function Header({ user, roleLabel, onLogout, onOpenProfile, onGoHome, extraOptions = [] }) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      navigate('/home');
    }
  };

  const handleOpenProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="page-header app-header">
      {/* Left Side: Logo */}
      <div 
        className="app-header__brand"
        onClick={handleGoHome}
        style={{ cursor: "pointer" }}
        title="Ir al inicio"
      >
        <img src={appLogo} alt="Logo" className="app-header__logo" />
      </div>

      {/* Right Side: User Menu Dropdown — hidden on mobile, handled by BottomNav */}
      <div className="app-header__actions">
        <UserMenu 
          user={user} 
          roleLabel={roleLabel} 
          onLogout={onLogout}
          onOpenProfile={handleOpenProfile}
          extraOptions={extraOptions}
        />
      </div>
    </div>
  );
}
