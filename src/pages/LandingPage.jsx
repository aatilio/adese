import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  QrCode,
  Clock,
  Smartphone,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  Download,
  Menu,
  X,
  Share,
  PlusSquare,
  LogIn,
} from "lucide-react";
import appLogo from "../assets/adese.svg";
import macMockup from "../assets/moc/mac.png";
import sanMockup from "../assets/moc/san.png";
import sansungQrMockup from "../assets/moc/sansungqr.png";
import dellMockup from "../assets/moc/dell.png";
import "../styles/landing.css";

const PWA_INSTALLED_KEY = "adese_pwa_installed";

function checkIsPwaInstalled() {
  if (typeof window === "undefined") return false;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  const isLocalStorageInstalled =
    localStorage.getItem(PWA_INSTALLED_KEY) === "true";
  return isStandalone || isLocalStorageInstalled;
}

export default function LandingPage() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(checkIsPwaInstalled);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [activeHeroTab, setActiveHeroTab] = useState("teacher"); // 'teacher' | 'student'
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Listen for standard browser beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowInstallGuide(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    } else {
      // Show iOS / Android browser guide modal if automatic prompt is unavailable
      setShowInstallGuide(true);
    }
  };

  return (
    <div className="landing-page">
      {/* ── Navigation Bar ────────────────────────────── */}
      <nav className={`landing-nav ${isScrolled ? "landing-nav--scrolled" : ""}`}>
        <div className="landing-nav__container">
          <div className="landing-nav__brand">
            <img src={appLogo} alt="ADESE Logo" className="landing-nav__logo" />
          </div>

          {/* Desktop Navigation Links */}
          <ul className="landing-nav__links">
            <li>
              <a href="#caracteristicas" className="landing-nav__link">
                Características
              </a>
            </li>
            <li>
              <a href="#automatizacion" className="landing-nav__link">
                Automatización
              </a>
            </li>
            <li>
              <a href="#beneficios" className="landing-nav__link">
                Beneficios
              </a>
            </li>
          </ul>

          <div className="landing-nav__actions">
            {/* Mobile PWA Install Button (Displayed on mobile ONLY if app is NOT installed) */}
            {!isInstalled && (
              <button
                id="pwa-install-nav-btn"
                className="landing-btn-install"
                onClick={handleInstall}
                title="Instalar ADESE como acceso directo"
              >
                <Download size={14} />
                <span>Instalar App</span>
              </button>
            )}

            {/* Desktop Login Link (Hidden on mobile via CSS) */}
            <Link to="/login" className="landing-btn-login landing-btn-login--desktop">
              Iniciar Sesión <ArrowRight size={16} />
            </Link>

            {/* Mobile Hamburger Toggle Button */}
            <button
              className="landing-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown (Glassmorphic Floating Card) */}
        {isMobileMenuOpen && (
          <div className="landing-mobile-menu">
            <div className="landing-mobile-menu__nav">
              <a
                href="#caracteristicas"
                className="landing-mobile-menu__link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Sparkles size={16} className="mobile-menu-icon" />
                <span>Características</span>
              </a>
              <a
                href="#automatizacion"
                className="landing-mobile-menu__link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Clock size={16} className="mobile-menu-icon" />
                <span>Automatización</span>
              </a>
              <a
                href="#beneficios"
                className="landing-mobile-menu__link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <TrendingUp size={16} className="mobile-menu-icon" />
                <span>Beneficios</span>
              </a>
            </div>
            <Link
              to="/login"
              className="landing-mobile-menu__login-btn"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LogIn size={16} /> <span>Iniciar Sesión</span>
            </Link>
          </div>
        )}
      </nav>

      {/* ── PWA Installation Guide Modal ────────────────── */}
      {showInstallGuide && !isInstalled && (
        <div className="pwa-guide-overlay" onClick={() => setShowInstallGuide(false)}>
          <div className="pwa-guide-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pwa-guide-close" onClick={() => setShowInstallGuide(false)}>
              <X size={18} />
            </button>
            <div className="pwa-guide-icon">
              <Download size={28} />
            </div>
            <h3>Instalar en tu dispositivo</h3>
            <p>Sigue estos sencillos pasos según el navegador de tu dispositivo:</p>
            <div className="pwa-guide-steps">
              <div className="pwa-guide-step">
                <strong>iPhone / iOS (Safari):</strong>
                <span>
                  Toca el botón <Share size={14} className="inline-icon" /> <b>Compartir</b> y luego selecciona <b>"Añadir a pantalla de inicio"</b> <PlusSquare size={14} className="inline-icon" />.
                </span>
              </div>
              <div className="pwa-guide-step">
                <strong>Android (Chrome):</strong>
                <span>
                  Toca los tres puntos (<b>⋮</b>) del navegador y elige <b>"Instalar aplicación"</b> o <b>"Añadir a pantalla de inicio"</b>.
                </span>
              </div>
            </div>
            <button
              className="landing-btn-primary pwa-guide-btn"
              onClick={() => {
                localStorage.setItem(PWA_INSTALLED_KEY, "true");
                setIsInstalled(true);
                setShowInstallGuide(false);
              }}
            >
              Entendido / Ya la instalé
            </button>
          </div>
        </div>
      )}

      {/* ── Hero Section ──────────────────────────────── */}
      <header className="landing-hero">
        <div className="landing-hero__content">
          <div className="landing-hero__badge">
            <Sparkles size={15} /> Asistencia Digital Estratégica
          </div>
          <h1 className="landing-hero__title">
            Automatiza la <span>Toma de Asistencia</span> en Segundos
          </h1>
          <p className="landing-hero__subtitle">
            Plataforma web multi-rol y multi-curso diseñada para instituciones educativas.
            Elimina el pase de lista manual con escaneo QR dinámico encriptado, control de tolerancias en tiempo real y reportes en Excel.
          </p>
          <div className="landing-hero__actions">
            <Link to="/login" className="landing-btn-hero-login">
              Iniciar Sesión <ArrowRight size={16} />
            </Link>
          </div>

          <div className="landing-hero__features-list">
            <span className="landing-hero__feature-item">
              <CheckCircle2 size={16} className="feature-item-icon" /> Multi-rol y Multi-curso
            </span>
            <span className="landing-hero__feature-item">
              <CheckCircle2 size={16} className="feature-item-icon" /> QR Dinámico Encriptado
            </span>
            <span className="landing-hero__feature-item">
              <CheckCircle2 size={16} className="feature-item-icon" /> Exportación a Excel
            </span>
          </div>
        </div>

        {/* Dual Hardware Mockup Showcase con tarjetas e interactividad estilo Apple */}
        <div className="landing-hero__visual">
          <div className="landing-hero__ambient-glow" />
          
          {/* Tarjeta flotante superior Glassmorphism */}
          <div className="hero-glass-badge hero-glass-badge--top">
            <span className="live-pulse-dot" />
            <span>Monitoreo Activo en Tiempo Real</span>
          </div>

          <div className="landing-mockup-laptop">
            <img src={macMockup} alt="Plataforma Web ADESE en Laptop" className="mockup-frame-laptop" />
          </div>

          <div className="landing-mockup-phone">
            <img 
              src={activeHeroTab === "student" ? sansungQrMockup : sanMockup} 
              alt="App Móvil ADESE" 
              className="mockup-frame-phone" 
            />
            {activeHeroTab === "student" && <div className="qr-scan-line-animated" />}
          </div>

          {/* Tarjeta flotante inferior Glassmorphism */}
          <div className="hero-glass-badge hero-glass-badge--bottom">
            <Sparkles size={14} className="sparkle-icon" />
            <span>QR Dinámico Encriptado</span>
          </div>

          {/* Selector de Vistas Interactivo Estilo Apple */}
          <div className="hero-view-tabs">
            <button 
              className={`hero-view-tab ${activeHeroTab === "teacher" ? "hero-view-tab--active" : ""}`}
              onClick={() => setActiveHeroTab("teacher")}
            >
              <Users size={13} /> Vista Docente
            </button>
            <button 
              className={`hero-view-tab ${activeHeroTab === "student" ? "hero-view-tab--active" : ""}`}
              onClick={() => setActiveHeroTab("student")}
            >
              <Smartphone size={13} /> Vista Alumno
            </button>
          </div>
        </div>
      </header>

      {/* ── Metrics / Stats Bar ────────────────────────── */}
      <section className="landing-stats">
        <div className="landing-stats__container">
          <div className="landing-stat-card">
            <div className="landing-stat-number">15 min</div>
            <div className="landing-stat-label">Ahorrados por Clase</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-number">100%</div>
            <div className="landing-stat-label">Tokens QR Dinámicos Encriptados</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-number">0s</div>
            <div className="landing-stat-label">Demora en Registro de Asistencias</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-number">1 Clic</div>
            <div className="landing-stat-label">Exportación Directa a Excel</div>
          </div>
        </div>
      </section>

      {/* ── Features Grid Section ─────────────────────── */}
      <section id="caracteristicas" className="landing-features">
        <div className="landing-section-title">
          <h2>Diseñado para Simplificar la Vida Universitaria y Escolar</h2>
          <p>
            Una solución completa que une a Administradores, Docentes y Alumnos en una sola plataforma centralizada.
          </p>
        </div>

        <div className="landing-features__grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <QrCode size={26} />
            </div>
            <h3 className="landing-feature-title">QR Dinámico e Interactivo</h3>
            <p className="landing-feature-desc">
              Códigos renovables cada pocos segundos alimentados por JWT que impiden que los alumnos registren asistencia usando capturas antiguas.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <Clock size={26} />
            </div>
            <h3 className="landing-feature-title">Control de Horarios y Tolerancia</h3>
            <p className="landing-feature-desc">
              Límites de tiempo 100% configurables por el profesor. El sistema bloquea automáticamente o clasifica entre Puntual, Tarde o Falto.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <Smartphone size={26} />
            </div>
            <h3 className="landing-feature-title">Experiencia Mobile-First</h3>
            <p className="landing-feature-desc">
              Diseño tipo app que permite a los estudiantes marcar su asistencia escaneando en un instante con la cámara de su teléfono.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <Users size={26} />
            </div>
            <h3 className="landing-feature-title">Arquitectura Multi-Rol</h3>
            <p className="landing-feature-desc">
              Vistas especializadas para Administradores, Profesores (soporta co-docencia) y Alumnos con permisos de acceso independientes.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <FileSpreadsheet size={26} />
            </div>
            <h3 className="landing-feature-title">Exportación de Reportes</h3>
            <p className="landing-feature-desc">
              Descarga la matriz completa de asistencias, puntualidades y faltas en formato Excel o PDF con un solo clic.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <TrendingUp size={26} />
            </div>
            <h3 className="landing-feature-title">Módulos de Análisis Estadístico</h3>
            <p className="landing-feature-desc">
              Incluye herramientas avanzadas para cálculo de modelos econométricos y análisis de exámenes integradas en la propia web.
            </p>
          </div>
        </div>
      </section>

      {/* ── Automation Showcase Section ────────────────── */}
      <section id="automatizacion" className="landing-automation-showcase">
        <div className="landing-automation__container">
          <div className="landing-automation__content">
            <h2>Dile Adiós al Registro Manual en Papel</h2>
            <p>
              ADESE reemplaza las listas físicas y los llamados de asistencia que consumen valiosos minutos de la clase por un flujo 100% automatizado e instantáneo.
            </p>
            <ul className="landing-automation__list">
              <li className="landing-automation__item">
                <CheckCircle2 size={20} className="landing-automation__icon" /> El profesor proyecta el QR dinámico de la sesión.
              </li>
              <li className="landing-automation__item">
                <CheckCircle2 size={20} className="landing-automation__icon" /> El alumno escanea desde su celular y confirma su presencia.
              </li>
              <li className="landing-automation__item">
                <CheckCircle2 size={20} className="landing-automation__icon" /> El monitor se actualiza en vivo al instante sin intervención.
              </li>
            </ul>
            <Link to="/login" className="landing-btn-primary">
              Comenzar Ahora <ArrowRight size={18} />
            </Link>
          </div>

          <div className="landing-automation__image">
            <div className="landing-automation-visual">
              <div className="landing-mockup-laptop landing-mockup-laptop--automation">
                <img src={dellMockup} alt="Laptop en Sesión de Asistencia" className="mockup-frame-laptop" />
              </div>
              <div className="landing-automation-phone">
                <img src={sansungQrMockup} alt="Celular Escaneando QR en Vivo" className="automation-phone-frame" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────── */}
      <section id="beneficios" className="landing-cta">
        <div className="landing-cta__box">
          <h2>¿Listo para Modernizar el Control de Asistencia?</h2>
          <p>
            Ingresa a la plataforma y aprovecha la tecnología para llevar un control estratégico, transparente y seguro.
          </p>
          <div className="landing-cta__actions" style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            {/* <Link to="/register" className="landing-btn-primary">
              Registrarte como Docente <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="landing-btn-secondary">
              Iniciar Sesión
            </Link> */}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer__container">
          <div className="landing-footer__copyright">
            Copyright &copy; {new Date().getFullYear()} <strong>ADESE</strong>. Todos los derechos reservados.
          </div>
          <div className="landing-footer__copyright">
            Desarrollado por{" "}
            <a
              href="https://alan.arahocorp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer__link"
            >
              Alan C.A.
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
