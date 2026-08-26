import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { toast } from "../components/Toast";
import { mapRolToUiRole } from "../constants/roles";
import appLogo from "../assets/adese.svg";
import Footer from "../components/Footer";
import "../styles/components/profile-view.css";

export default function RegisterPage({ onLogin }) {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanUser = usuario.trim();
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();
    const cleanConfirm = confirmPass.trim();

    if (!cleanUser) {
      toast.error("Por favor ingresa tu nombre de usuario");
      return;
    }
    if (!cleanEmail) {
      toast.error("Por favor ingresa tu correo electrónico.");
      return;
    }
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      toast.error("Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (!cleanPass) {
      toast.error("Por favor ingresa tu contraseña.");
      return;
    }
    if (cleanPass.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (cleanPass !== cleanConfirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerDocente({
        usuario: cleanUser,
        nombre_completo: cleanUser,
        email: cleanEmail,
        pass: cleanPass,
      });

      if (res?.usuario) {
        const role = mapRolToUiRole(res.usuario.rol) || "profesor";
        toast.success("¡Registro exitoso! Cuenta de Docente creada.");
        if (onLogin) {
          onLogin({ ...res.usuario, role });
          navigate("/home");
        } else {
          navigate("/login");
        }
      }
    } catch (err) {
      toast.error(err.message || "Error al registrar cuenta de docente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: "440px", padding: "2.25rem 2rem" }}>
        {/* Back Link */}
        <div style={{ marginBottom: "1rem", textAlign: "left" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--gray-600, #475569)",
              fontSize: "0.85rem",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> Volver
          </Link>
        </div>

        {/* Logo */}
        <div className="login-logo" style={{ marginBottom: "1.25rem" }}>
          <img src={appLogo} alt="Adese Logo" style={{ width: "180px", height: "auto" }} />
        </div>

        <div style={{ textCenter: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.35rem" }}>
            Registro de Docente
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Usuario / Nombre */}
          <div className="form-group">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <User size={15} className="text-muted" /> Usuario
            </label>
            <input
              className="form-input"
              type="text"
              autoFocus
              spellCheck={false}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej: user"
            />
          </div>

          {/* Correo Electrónico */}
          <div className="form-group mt-3">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Mail size={15} className="text-muted" /> Correo
            </label>
            <input
              className="form-input"
              type="email"
              spellCheck={false}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@institución.edu.pe"
            />
          </div>

          {/* Contraseña */}
          <div className="form-group mt-3">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Lock size={15} className="text-muted" /> Contraseña
            </label>
            <div className="password-input-wrap">
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
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

          {/* Confirmar Contraseña */}
          <div className="form-group mt-3">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Lock size={15} className="text-muted" /> Confirmar Contraseña
            </label>
            <div className="password-input-wrap">
              <input
                className="form-input"
                type={showConfirmPass ? "text" : "password"}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: "2.8rem" }}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowConfirmPass((v) => !v)}
                aria-label={showConfirmPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-5">
            <button
              className="btn btn-primary w-full"
              type="submit"
              disabled={loading || !usuario.trim() || !email.trim() || !pass.trim()}
              style={{
                width: "100%",
                padding: "0.8rem 1.5rem",
                borderRadius: "0.75rem",
                fontSize: "0.95rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <UserPlus size={18} /> Registrarte
                </>
              )}
            </button>
          </div>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "#64748b" }}>
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" style={{ color: "#0284c7", fontWeight: "700", textDecoration: "none" }}>
            Iniciar Sesión
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
}
