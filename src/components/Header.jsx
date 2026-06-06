import React from 'react';
import appLogo from "../assets/ac-d.svg";
import UserMenu from "./UserMenu";
import "../styles/components/header.css";

export default function Header({ user, roleLabel, onLogout, onOpenProfile, extraOptions = [] }) {
  return (
    <div className="page-header app-header">
      {/* Left Side: Logo & App Name */}
      <div className="app-header__brand">
        <img src={appLogo} alt="Logo" className="app-header__logo" />
        <div>
          <div className="app-header__logo-pad">
            <h1 className="app-header__title">Adese</h1>
          </div>
        </div>
      </div>

      {/* Right Side: User Menu Dropdown */}
      <div className="app-header__actions">
        <UserMenu 
          user={user} 
          roleLabel={roleLabel} 
          onLogout={onLogout}
          onOpenProfile={onOpenProfile}
          extraOptions={extraOptions}
        />
      </div>
    </div>
  );
}
