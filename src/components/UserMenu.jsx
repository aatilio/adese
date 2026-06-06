import { useState, useRef, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import "../styles/components/user-menu.css";

export default function UserMenu({ user, roleLabel, onLogout, extraOptions = [], onOpenProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menú de usuario"
        aria-expanded={isOpen}
      >
        <User size={18} />
      </button>

      {isOpen && (
        <div className="user-menu__dropdown">
          {/* User info header */}
          <div
            className="user-menu__header"
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              setIsOpen(false);
            }}
          >
            <div className="user-menu__username">
              {user?.nombre_completo || "Usuario"}
            </div>
            <div className="user-menu__role">{roleLabel}</div>
          </div>

          {/* Options list */}
          <div className="user-menu__body">
            {extraOptions.map((opt, idx) => (
              <button
                key={idx}
                className={`user-menu__item${opt.active ? " user-menu__item--active" : ""}`}
                onClick={() => {
                  opt.onClick();
                  setIsOpen(false);
                }}
              >
                {opt.icon && <opt.icon size={16} />}
                {opt.label}
              </button>
            ))}

            {extraOptions.length > 0 && <div className="user-menu__divider" />}

            {/* Logout */}
            <button
              className="user-menu__item user-menu__item--danger"
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
