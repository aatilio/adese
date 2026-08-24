import { useNavigate } from "react-router-dom";
import {
  Home,
  Library,
  User,
  LogOut,
  Radio,
  Calendar,
  Users,
  History,
  Settings,
  QrCode,
  ChevronLeft,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import "../styles/components/bottom-nav.css";

/**
 * BottomNav — barra de navegación inferior fija para vistas móviles (< 768px).
 *
 * Props:
 *  - viewMode: "dashboard" | "curso" | "perfil" | "usuarios" | "econometrics" | "exam"
 *  - activeTab: tab activo dentro de un curso (string)
 *  - role: "teacher" | "student"
 *  - isAdmin: boolean
 *  - cursoActivoId: number | null
 *  - onLogout: () => void
 *  - onTabChange: (tab: string) => void  — solo para modo curso
 */
export default function BottomNav({
  viewMode = "dashboard",
  activeTab = "",
  role = "student",
  isAdmin = false,
  cursoActivoId = null,
  onLogout,
  onTabChange,
}) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  // ── Dashboard items ──────────────────────────────────────
  if (viewMode !== "curso") {
    const dashItems = [
      {
        id: "home",
        icon: Home,
        label: "Inicio",
        active: viewMode === "dashboard",
        onClick: () => navigate("/home"),
      },
      {
        id: "profile",
        icon: User,
        label: "Perfil",
        active: viewMode === "perfil",
        onClick: () => navigate("/profile"),
      },
      ...(isAdmin
        ? [
            {
              id: "usuarios",
              icon: Users,
              label: "Usuarios",
              active: viewMode === "usuarios",
              onClick: () => navigate("/usuarios"),
            },
          ]
        : []),
      {
        id: "logout",
        icon: LogOut,
        label: "Salir",
        active: false,
        danger: true,
        onClick: onLogout,
      },
    ];

    return (
      <nav className="bottom-nav" aria-label="Navegación principal">
        {dashItems.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav__item${item.active ? " bottom-nav__item--active" : ""}${item.danger ? " bottom-nav__item--danger" : ""}`}
            onClick={item.onClick}
            aria-label={item.label}
          >
            <item.icon size={26} className="bottom-nav__icon" />
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  // ── Inside a course — Teacher ────────────────────────────
  if (role === "teacher") {
    const mainItems = [
      {
        id: "vivo",
        icon: Radio,
        label: "Monitor",
        active: activeTab === "vivo",
        onClick: () => onTabChange("vivo"),
      },
      {
        id: "clases",
        icon: Calendar,
        label: "Prog.",
        active: activeTab === "clases",
        onClick: () => onTabChange("clases"),
      },
      {
        id: "historial",
        icon: History,
        label: "Historial",
        active: activeTab === "historial",
        onClick: () => onTabChange("historial"),
      },
      {
        id: "alumnos",
        icon: Users,
        label: "Alumnos",
        active: activeTab === "alumnos",
        onClick: () => onTabChange("alumnos"),
      },
      {
        id: "more",
        icon: MoreHorizontal,
        label: "Más",
        active: activeTab === "config",
        onClick: () => setShowMore((v) => !v),
      },
    ];

    return (
      <>
        {/* More sheet overlay */}
        {showMore && (
          <div className="bottom-nav__more-overlay" onClick={() => setShowMore(false)}>
            <div className="bottom-nav__more-sheet" onClick={(e) => e.stopPropagation()}>
              <button
                className={`bottom-nav__more-item${activeTab === "config" ? " bottom-nav__more-item--active" : ""}`}
                onClick={() => { onTabChange("config"); setShowMore(false); }}
              >
                <Settings size={20} />
                Ajustes
              </button>
              <button
                className="bottom-nav__more-item bottom-nav__more-item--danger"
                onClick={() => { onLogout(); setShowMore(false); }}
              >
                <LogOut size={20} />
                Salir
              </button>
            </div>
          </div>
        )}
        <nav className="bottom-nav" aria-label="Navegación del curso">
          {mainItems.map((item) => (
            <button
              key={item.id}
              className={`bottom-nav__item${item.active ? " bottom-nav__item--active" : ""}`}
              onClick={item.onClick}
              aria-label={item.label}
            >
              <item.icon size={26} className="bottom-nav__icon" />
              <span className="bottom-nav__label">{item.label}</span>
            </button>
          ))}
        </nav>
      </>
    );
  }

  // ── Inside a course — Student ────────────────────────────
  const studentItems = [
    {
      id: "marcar",
      icon: QrCode,
      label: "Marcar",
      active: activeTab === "marcar",
      onClick: () => onTabChange("marcar"),
    },
    {
      id: "historial",
      icon: History,
      label: "Historial",
      active: activeTab === "historial",
      onClick: () => onTabChange("historial"),
    },
    {
      id: "profile",
      icon: User,
      label: "Perfil",
      active: false,
      onClick: () => navigate("/profile"),
    },
    {
      id: "logout",
      icon: LogOut,
      label: "Salir",
      active: false,
      danger: true,
      onClick: onLogout,
    },
  ];


  return (
    <nav className="bottom-nav" aria-label="Navegación del curso">
      {studentItems.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav__item${item.active ? " bottom-nav__item--active" : ""}${item.danger ? " bottom-nav__item--danger" : ""}`}
          onClick={item.onClick}
          aria-label={item.label}
        >
          <item.icon size={26} className="bottom-nav__icon" />
          <span className="bottom-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
