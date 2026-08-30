import { useState } from "react";
import { User, KeyRound, Eye, EyeOff, Mail, Hash, Shield } from "lucide-react";
import { api } from "../api/client";
import { toast } from "./Toast";
import "../styles/components/profile-view.css";

export default function ProfileView({ user, roleLabel, onUpdateUser, onCancel }) {
  const [nombre, setNombre] = useState(user.nombre_completo || "");
  const [email, setEmail] = useState(user.email || "");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passRepetir, setPassRepetir] = useState("");

  const [showPassActual, setShowPassActual] = useState(false);
  const [showPassNueva, setShowPassNueva] = useState(false);
  const [showPassRepetir, setShowPassRepetir] = useState(false);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    // Validate email format if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("El formato del correo electrónico no es válido");
        return;
      }
    }
    if (passNueva || passRepetir) {
      if (!passActual) {
        toast.error("Debes ingresar tu contraseña actual");
        return;
      }
      if (passNueva !== passRepetir) {
        toast.error("Las contraseñas nuevas no coinciden");
        return;
      }
      if (passNueva.length < 4) {
        toast.error("La nueva contraseña debe tener mínimo 4 caracteres");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        nombre_completo: nombre.trim(),
        email: email.trim() || null,
      };
      if (passNueva) {
        payload.pass = passNueva;
        payload.passActual = passActual;
      }

      const res = await api.updatePerfil(user.id, payload);
      toast.success("Perfil actualizado correctamente");
      onUpdateUser(res.usuario);
      onCancel();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const roleColor = {
    "Admin": { bg: "#fef3c7", color: "#92400e" },
    "Profesor": { bg: "#dbeafe", color: "#1d4ed8" },
    "Estudiante": { bg: "#dcfce7", color: "#15803d" },
  }[roleLabel] || { bg: "var(--primary-bg)", color: "var(--primary)" };

  return (
    <div className="profile-view">
      <div className="pv-card">

        {/* ── Profile Header ──────────────────────────── */}
        <div className="pv-header">
          <div className="pv-avatar">
            <User size={26} />
          </div>
          <div className="pv-header__info">
            <div className="pv-header__name">{user.nombre_completo}</div>
            <div className="pv-header__meta">
              <span className="pv-chip pv-chip--code">
                <Hash size={11} />
                {user.codigo}
              </span>
              <span
                className="pv-chip pv-chip--role"
                style={{ background: roleColor.bg, color: roleColor.color }}
              >
                <Shield size={11} />
                {roleLabel || "Usuario"}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* ── Sección Datos Personales ──────────────── */}
          <div className="pv-section">
            <div className="pv-section__label">
              <User size={14} />
              Datos Personales
            </div>

            <div className="pv-field">
              <label className="pv-field__label">Nombre Completo <span className="pv-required">*</span></label>
              <input
                className="pv-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Escribe tu nombre completo"
                required
              />
            </div>

            <div className="pv-field">
              <label className="pv-field__label">
                Correo Electrónico
              </label>
              <div className="pv-input-icon-wrap">
                <Mail size={15} className="pv-input-icon" />
                <input
                  className="pv-input pv-input--icon"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>
          </div>

          {/* ── Sección Cambiar Contraseña ────────────── */}
          <div className="pv-section">
            <div className="pv-section__label">
              <KeyRound size={14} />
              Cambiar Contraseña
            </div>

            <div className="pv-field">
              <label className="pv-field__label">Contraseña actual</label>
              <div className="pv-password-wrap">
                <input
                  className="pv-input"
                  type={showPassActual ? "text" : "password"}
                  value={passActual}
                  onChange={(e) => setPassActual(e.target.value)}
                  placeholder="Escribe tu contraseña actual"
                />
                <button type="button" className="pv-eye-btn" onClick={() => setShowPassActual(!showPassActual)}>
                  {showPassActual ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pv-field-row">
              <div className="pv-field">
                <label className="pv-field__label">Nueva contraseña</label>
                <div className="pv-password-wrap">
                  <input
                    className="pv-input"
                    type={showPassNueva ? "text" : "password"}
                    value={passNueva}
                    onChange={(e) => setPassNueva(e.target.value)}
                    placeholder="Mín. 4 caracteres"
                  />
                  <button type="button" className="pv-eye-btn" onClick={() => setShowPassNueva(!showPassNueva)}>
                    {showPassNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pv-field">
                <label className="pv-field__label">Repetir nueva contraseña</label>
                <div className="pv-password-wrap">
                  <input
                    className="pv-input"
                    type={showPassRepetir ? "text" : "password"}
                    value={passRepetir}
                    onChange={(e) => setPassRepetir(e.target.value)}
                    placeholder="Repetir contraseña"
                  />
                  <button type="button" className="pv-eye-btn" onClick={() => setShowPassRepetir(!showPassRepetir)}>
                    {showPassRepetir ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Strength indicator */}
            {passNueva && (
              <div className="pv-pass-strength">
                <div className={`pv-pass-bar ${passNueva.length >= 8 ? 'pv-pass-bar--strong' : passNueva.length >= 4 ? 'pv-pass-bar--medium' : 'pv-pass-bar--weak'}`} />
                <span className="pv-pass-strength__label">
                  {passNueva.length >= 8 ? 'Contraseña fuerte' : passNueva.length >= 4 ? 'Contraseña aceptable' : 'Muy corta (mín. 4)'}
                </span>
              </div>
            )}
          </div>

          {/* ── Actions ───────────────────────────────── */}
          <div className="pv-actions">
            <button
              type="button"
              className="pv-btn pv-btn--cancel"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="pv-btn pv-btn--save"
              disabled={saving}
            >
              {saving ? <div className="spinner" /> : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
