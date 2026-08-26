import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import { toast } from "../components/Toast";
import { mapRolToUiRole } from "../constants/roles";
import appLogo from "../assets/adese.svg";
import Footer from "../components/Footer";
import "../styles/components/profile-view.css"; // shared .eye-btn and .password-input-wrap

export default function LoginPage({ onLogin }) {
  const [codigo, setCodigo] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setLoading(true);
    try {
      const { usuario } = await api.login(codigo.trim(), pass.trim());
      const role = mapRolToUiRole(usuario.rol);
      if (!role) {
        toast.error("Rol de usuario no reconocido");
        return;
      }
      onLogin({ ...usuario, role });
      toast.success("¡Bienvenido!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Title */}
        <div className="login-title">
          <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.35rem" }}>
            Login
          </h2>
        </div>
    
        {/* Logo */}
        <div className="login-logo">
          <img src={appLogo} alt="Adese Logo" style={{ width: "200px", height: "auto" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">CUI / Usuario</label>
            <input
              className="form-input"
              type="text"
              autoFocus
              spellCheck={false}
              autoComplete="username"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="20201234"
            />
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Contraseña</label>
            <div className="password-input-wrap">
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: "2.8rem" }}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || !codigo.trim()}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <ChevronRight size={16} /> Ingresar
                </>
              )}
            </button>
          </div>
        </form>

        <div style={{ marginTop: "1.75rem", marginBottom: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "#64748b" }}>
          ¿Eres docente y no tienes cuenta?{" "}
          <Link to="/register" style={{ color: "#0284c7", fontWeight: "700", textDecoration: "none" }}>
            Registrarte aquí
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
}
